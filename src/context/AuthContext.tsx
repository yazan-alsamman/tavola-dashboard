import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  login as loginRequest,
  logout as logoutRequest,
  logoutAll as logoutAllRequest,
} from '@/api/auth'
import { isApiError } from '@/api/errors'
import { refreshSession } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'
import { getCurrentUser } from '@/api/users'
import { useRequireLogoutBeforeLeave } from '@/hooks/useRequireLogoutBeforeLeave'
import { parseAccessTokenClaims } from '@/lib/accessTokenClaims'
import {
  buildIdentityFromLogin,
  buildIdentityFromSession,
} from '@/lib/authIdentity'
import type { AuthIdentity } from '@/types/auth'

interface AuthContextValue {
  user: AuthIdentity | null
  isAuthenticated: boolean
  /** True while resolving a persisted refresh-token session on startup. */
  isLoading: boolean
  /** True when a stored refresh token can power logout-all recovery. */
  canClearSessions: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Revoke every device session, then clear local auth state. */
  logoutAll: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DASHBOARD_DEVICE_NAME = 'Tavola Dashboard'
const DASHBOARD_DEVICE_TYPE = 'web' as const

async function fetchProfileBestEffort(): Promise<Awaited<ReturnType<typeof getCurrentUser>> | null> {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

function claimsFromAccessToken(): ReturnType<typeof parseAccessTokenClaims> {
  const accessToken = tokenStore.getAccessToken()
  if (!accessToken) return null
  return parseAccessTokenClaims(accessToken)
}

/**
 * When login hits the 10-session cap, reuse a stored refresh token (if any)
 * to call logout-all, then retry login once.
 */
async function loginClearingStaleSessions(
  email: string,
  password: string,
): Promise<Awaited<ReturnType<typeof loginRequest>>> {
  try {
    return await loginRequest({
      email,
      password,
      deviceName: DASHBOARD_DEVICE_NAME,
      deviceType: DASHBOARD_DEVICE_TYPE,
    })
  } catch (err) {
    if (!isApiError(err) || err.code !== 'AUTH_TOO_MANY_SESSIONS') {
      throw err
    }

    const hasRefresh = Boolean(tokenStore.getRefreshToken())
    if (!hasRefresh) {
      throw err
    }

    const refreshed = await refreshSession()
    if (!refreshed) {
      throw err
    }

    try {
      await logoutAllRequest()
    } catch {
      // Still attempt a fresh login; local tokens are cleared below on failure.
    }

    tokenStore.clear()

    return loginRequest({
      email,
      password,
      deviceName: DASHBOARD_DEVICE_NAME,
      deviceType: DASHBOARD_DEVICE_TYPE,
    })
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canClearSessions, setCanClearSessions] = useState(
    () => Boolean(tokenStore.getRefreshToken()),
  )
  const allowUnloadRef = useRef(false)

  const clearLocalSession = useCallback((): void => {
    tokenStore.clear()
    setUser(null)
    setCanClearSessions(false)
  }, [])

  const syncCanClearSessions = useCallback((): void => {
    setCanClearSessions(Boolean(tokenStore.getRefreshToken()))
  }, [])

  useRequireLogoutBeforeLeave(user !== null, allowUnloadRef)

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) {
        if (!cancelled) {
          setUser(null)
          setCanClearSessions(false)
          setIsLoading(false)
        }
        return
      }

      if (!cancelled) {
        setCanClearSessions(true)
      }

      const refreshed = await refreshSession()
      if (cancelled) return

      if (!refreshed) {
        tokenStore.clear()
        setUser(null)
        setCanClearSessions(false)
        setIsLoading(false)
        return
      }

      try {
        const profile = await fetchProfileBestEffort()
        if (cancelled) return

        const claims = claimsFromAccessToken()
        const identity = buildIdentityFromSession(profile, claims)

        if (!identity.userId) {
          tokenStore.clear()
          setUser(null)
          setCanClearSessions(false)
        } else {
          setUser(identity)
          setCanClearSessions(true)
        }
      } catch {
        if (!cancelled) {
          tokenStore.clear()
          setUser(null)
          setCanClearSessions(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return tokenStore.onSessionInvalidated(() => {
      setUser(null)
      setCanClearSessions(Boolean(tokenStore.getRefreshToken()))
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    allowUnloadRef.current = false
    syncCanClearSessions()
    try {
      const data = await loginClearingStaleSessions(email, password)

      tokenStore.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      setCanClearSessions(true)

      try {
        const profile = await fetchProfileBestEffort()
        const claims = parseAccessTokenClaims(data.accessToken)
        setUser(buildIdentityFromLogin(data, profile, claims))
      } catch {
        tokenStore.clear()
        setUser(null)
        setCanClearSessions(false)
        throw new Error('Failed to establish authenticated identity after login.')
      }
    } catch (err) {
      syncCanClearSessions()
      throw err
    }
  }, [syncCanClearSessions])

  const logout = useCallback(async (): Promise<void> => {
    allowUnloadRef.current = true
    try {
      await logoutRequest()
    } catch {
      // Always clear local auth state even if the network call fails.
    } finally {
      clearLocalSession()
    }
  }, [clearLocalSession])

  const logoutAll = useCallback(async (): Promise<void> => {
    allowUnloadRef.current = true
    try {
      await logoutAllRequest()
    } catch {
      // Always clear local auth state even if the network call fails.
    } finally {
      clearLocalSession()
    }
  }, [clearLocalSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      canClearSessions,
      login,
      logout,
      logoutAll,
    }),
    [user, isLoading, canClearSessions, login, logout, logoutAll],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

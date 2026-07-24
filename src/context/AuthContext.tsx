import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { login as loginRequest, logout as logoutRequest } from '@/api/auth'
import { refreshSession } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'
import { getCurrentUser } from '@/api/users'
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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearLocalSession = useCallback((): void => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap(): Promise<void> {
      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) {
        if (!cancelled) {
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      const refreshed = await refreshSession()
      if (cancelled) return

      if (!refreshed) {
        tokenStore.clear()
        setUser(null)
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
        } else {
          setUser(identity)
        }
      } catch {
        if (!cancelled) {
          tokenStore.clear()
          setUser(null)
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
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const data = await loginRequest({ email, password })

    tokenStore.setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    })

    try {
      const profile = await fetchProfileBestEffort()
      const claims = parseAccessTokenClaims(data.accessToken)
      setUser(buildIdentityFromLogin(data, profile, claims))
    } catch {
      tokenStore.clear()
      setUser(null)
      throw new Error('Failed to establish authenticated identity after login.')
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Access token must still be present for the backend logout call.
      await logoutRequest()
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
      login,
      logout,
    }),
    [user, isLoading, login, logout],
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

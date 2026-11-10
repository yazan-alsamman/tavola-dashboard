/**
 * Auth token bridge between AuthProvider and the API client.
 *
 * Access token: in-memory only (never persisted).
 * Refresh token: sessionStorage (docs/AUTH_AND_RBAC.md). It is scoped to the
 * tab and gone when the tab closes, so it is not left on a shared reception
 * machine. Tab close already logs the session out on the server, so closed
 * tabs do not pile up sessions toward AUTH_TOO_MANY_SESSIONS.
 */

const REFRESH_TOKEN_STORAGE_KEY = 'tavla-refresh-token'

let accessToken: string | null = null

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

function readRefreshTokenFromStorage(): string | null {
  try {
    const fromSession = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (fromSession) return fromSession

    // One-time move from the earlier localStorage location, so a tab that
    // was signed in before this change stays signed in.
    const fromLocal = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (fromLocal) {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, fromLocal)
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      return fromLocal
    }

    return null
  } catch {
    return null
  }
}

function writeRefreshTokenToStorage(token: string | null): void {
  try {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    if (token === null) {
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
    }
  } catch {
    // Storage may be unavailable (private mode / SSR); ignore.
  }
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken
  },

  setAccessToken(token: string | null): void {
    accessToken = token
  },

  getRefreshToken(): string | null {
    return readRefreshTokenFromStorage()
  },

  setRefreshToken(token: string | null): void {
    writeRefreshTokenToStorage(token)
  },

  setTokens(tokens: { accessToken: string; refreshToken: string }): void {
    accessToken = tokens.accessToken
    writeRefreshTokenToStorage(tokens.refreshToken)
  },

  clear(): void {
    accessToken = null
    writeRefreshTokenToStorage(null)
  },

  /**
   * Subscribe to forced session invalidation (failed refresh / unrecoverable 401).
   * AuthProvider clears UI auth state on this signal.
   */
  onSessionInvalidated(listener: SessionInvalidatedListener): () => void {
    sessionInvalidatedListeners.add(listener)
    return () => {
      sessionInvalidatedListeners.delete(listener)
    }
  },

  notifySessionInvalidated(): void {
    for (const listener of sessionInvalidatedListeners) {
      listener()
    }
  },
}

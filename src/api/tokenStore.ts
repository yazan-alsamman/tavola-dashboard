/**
 * Auth token bridge between AuthProvider and the API client.
 *
 * Access token: in-memory only (never persisted).
 * Refresh token: localStorage so the session survives tab close and can
 * call logout-all when hitting AUTH_TOO_MANY_SESSIONS.
 */

const REFRESH_TOKEN_STORAGE_KEY = 'tavla-refresh-token'

let accessToken: string | null = null

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

function readRefreshTokenFromStorage(): string | null {
  try {
    const fromLocal = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (fromLocal) return fromLocal

    // One-time migration from the previous sessionStorage location.
    const fromSession = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
    if (fromSession) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, fromSession)
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      return fromSession
    }

    return null
  } catch {
    return null
  }
}

function writeRefreshTokenToStorage(token: string | null): void {
  try {
    if (token === null) {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    } else {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
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

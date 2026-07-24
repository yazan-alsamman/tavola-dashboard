/**
 * Auth token bridge between the future AuthProvider and the API client.
 *
 * Access token: in-memory only (never localStorage).
 * Refresh token: sessionStorage so a same-tab reload can restore the session.
 *
 * AuthContext remains fake for Phase 1; Phase 2 wires AuthProvider to this store.
 */

const REFRESH_TOKEN_STORAGE_KEY = 'tavla-refresh-token'

let accessToken: string | null = null

type SessionInvalidatedListener = () => void
const sessionInvalidatedListeners = new Set<SessionInvalidatedListener>()

function readRefreshTokenFromStorage(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeRefreshTokenToStorage(token: string | null): void {
  try {
    if (token === null) {
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    } else {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
    }
  } catch {
    // sessionStorage may be unavailable (private mode / SSR); ignore.
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
   * AuthProvider will use this in Phase 2 to clear UI auth state and redirect.
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

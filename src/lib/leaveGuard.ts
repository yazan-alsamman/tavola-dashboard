type LeaveAttemptListener = () => void

const listeners = new Set<LeaveAttemptListener>()

/** Set during beforeunload; consumed when the page stays open (user cancelled leave). */
let leaveAttemptPending = false

export const AWAITING_CLOSE_AFTER_LOGOUT_KEY = 'tavola.awaitCloseAfterLogout'

/**
 * Written synchronously in `beforeunload`. Cleared if the user stays (Cancel).
 * If they confirm Leave and unload is interrupted before keepalive logout runs,
 * the next visit reads this and refuses to restore the session.
 */
export const FORCED_LOGOUT_PENDING_KEY = 'tavola.forcedLogoutPending'

export function markLeaveAttemptPending(): void {
  leaveAttemptPending = true
}

export function consumeLeaveAttemptPending(): boolean {
  if (!leaveAttemptPending) return false
  leaveAttemptPending = false
  return true
}

export function notifyLeaveAttempt(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function onLeaveAttempt(listener: LeaveAttemptListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function markForcedLogoutPending(): void {
  try {
    localStorage.setItem(FORCED_LOGOUT_PENDING_KEY, '1')
  } catch {
    // Ignore storage failures.
  }
}

export function clearForcedLogoutPending(): void {
  try {
    localStorage.removeItem(FORCED_LOGOUT_PENDING_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function isForcedLogoutPending(): boolean {
  try {
    return localStorage.getItem(FORCED_LOGOUT_PENDING_KEY) === '1'
  } catch {
    return false
  }
}

export function markAwaitingCloseAfterLogout(): void {
  try {
    sessionStorage.setItem(AWAITING_CLOSE_AFTER_LOGOUT_KEY, '1')
  } catch {
    // Ignore storage failures.
  }
}

export function clearAwaitingCloseAfterLogout(): void {
  try {
    sessionStorage.removeItem(AWAITING_CLOSE_AFTER_LOGOUT_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function isAwaitingCloseAfterLogout(): boolean {
  try {
    return sessionStorage.getItem(AWAITING_CLOSE_AFTER_LOGOUT_KEY) === '1'
  } catch {
    return false
  }
}

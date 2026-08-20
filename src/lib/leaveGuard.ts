type LeaveAttemptListener = () => void

const listeners = new Set<LeaveAttemptListener>()

/** Set during beforeunload; consumed when the page stays open (user cancelled leave). */
let leaveAttemptPending = false

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

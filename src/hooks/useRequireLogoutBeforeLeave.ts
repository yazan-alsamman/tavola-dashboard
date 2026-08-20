import { useEffect, useRef, type MutableRefObject } from 'react'
import { logoutKeepalive } from '@/api/auth'
import {
  clearForcedLogoutPending,
  consumeLeaveAttemptPending,
  markForcedLogoutPending,
  markLeaveAttemptPending,
  notifyLeaveAttempt,
} from '@/lib/leaveGuard'

/**
 * Intercepts tab/window close while authenticated:
 * 1) Browser shows its leave dialog (required to pause closing — custom UI cannot run there)
 * 2) If the user stays (Cancel), we open our styled logout modal and clear the pending flag
 * 3) If they confirm Leave, keepalive logout ends the server session and clears local tokens
 */
export function useRequireLogoutBeforeLeave(
  isAuthenticated: boolean,
  allowUnloadRef: MutableRefObject<boolean>,
): void {
  const authenticatedRef = useRef(isAuthenticated)
  authenticatedRef.current = isAuthenticated

  useEffect(() => {
    if (!isAuthenticated) return

    let reopenTimer: ReturnType<typeof setTimeout> | undefined
    let sessionEnded = false

    const endSessionOnLeave = (): void => {
      if (sessionEnded) return
      if (allowUnloadRef.current) return
      if (!authenticatedRef.current) return
      sessionEnded = true
      logoutKeepalive()
      authenticatedRef.current = false
    }

    const openLogoutModalIfStayed = (): void => {
      if (allowUnloadRef.current || !authenticatedRef.current) return
      if (!consumeLeaveAttemptPending()) return
      clearForcedLogoutPending()
      notifyLeaveAttempt()
    }

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (allowUnloadRef.current || !authenticatedRef.current) return
      markLeaveAttemptPending()
      // Sync flag so a confirmed Leave that skips pagehide still cannot restore on reopen.
      markForcedLogoutPending()
      event.preventDefault()
      event.returnValue = ''

      window.clearTimeout(reopenTimer)
      reopenTimer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          openLogoutModalIfStayed()
        }
      }, 0)
    }

    const onPageHide = (event: PageTransitionEvent): void => {
      window.clearTimeout(reopenTimer)
      if (event.persisted) return
      endSessionOnLeave()
    }

    const onUnload = (): void => {
      endSessionOnLeave()
    }

    const onFocus = (): void => {
      openLogoutModalIfStayed()
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        openLogoutModalIfStayed()
      }
    }

    const onPageShow = (): void => {
      openLogoutModalIfStayed()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('unload', onUnload)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearTimeout(reopenTimer)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('unload', onUnload)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, allowUnloadRef])
}

import { useEffect, useRef, type MutableRefObject } from 'react'
import { logoutKeepalive } from '@/api/auth'
import {
  consumeLeaveAttemptPending,
  markLeaveAttemptPending,
  notifyLeaveAttempt,
} from '@/lib/leaveGuard'

/**
 * While authenticated:
 * - Blocks tab/window close with the browser leave dialog
 * - If the user cancels and stays, opens the in-app force-logout modal
 * - If they leave anyway, keepalive logout ends the server session
 *
 * Intentional app logout sets `allowUnloadRef` so the prompt does not fire.
 */
export function useRequireLogoutBeforeLeave(
  isAuthenticated: boolean,
  allowUnloadRef: MutableRefObject<boolean>,
): void {
  const authenticatedRef = useRef(isAuthenticated)
  authenticatedRef.current = isAuthenticated

  useEffect(() => {
    if (!isAuthenticated) return

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (allowUnloadRef.current || !authenticatedRef.current) return
      markLeaveAttemptPending()
      event.preventDefault()
      event.returnValue = ''
    }

    const onPageHide = (event: PageTransitionEvent): void => {
      if (allowUnloadRef.current) return
      if (event.persisted) return
      if (!authenticatedRef.current) return
      // User confirmed leave — end the session so they cannot leave still signed in.
      logoutKeepalive()
      authenticatedRef.current = false
    }

    const surfaceForceModal = (): void => {
      if (allowUnloadRef.current || !authenticatedRef.current) return
      if (!consumeLeaveAttemptPending()) return
      notifyLeaveAttempt()
    }

    const onFocus = (): void => {
      surfaceForceModal()
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        surfaceForceModal()
      }
    }

    const onPageShow = (): void => {
      surfaceForceModal()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, allowUnloadRef])
}

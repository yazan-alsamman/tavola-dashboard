import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { onLeaveAttempt } from '@/lib/leaveGuard'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'

/**
 * Sticky warning + blocking modal after a close/leave attempt while signed in.
 * Closing the tab without signing out is not allowed: leave ends the session;
 * cancelling leave opens this modal and requires Sign out (or continue working).
 */
export function ForceLogoutOnLeave() {
  const { t } = useLocale()
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setForceOpen(false)
      return
    }
    return onLeaveAttempt(() => {
      setForceOpen(true)
    })
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    document.documentElement.style.setProperty('--logout-leave-banner-h', '4.25rem')
    return () => {
      document.documentElement.style.removeProperty('--logout-leave-banner-h')
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return null

  const handleLogout = async (): Promise<void> => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await logout()
      setForceOpen(false)
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-[60] border-b border-warning/40 bg-warning-light px-4 py-2.5 shadow-elevated"
      >
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <MaterialIcon name="warning" size={20} className="mt-0.5 shrink-0 text-warning" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface">
                {t.auth.logoutBeforeLeaveTitle}
              </p>
              <p className="text-xs text-on-surface-variant">
                {t.auth.logoutBeforeLeaveBody}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="shrink-0"
            disabled={signingOut}
            onClick={() => void handleLogout()}
          >
            {signingOut ? t.common.loading : t.auth.logoutBeforeLeaveAction}
          </Button>
        </div>
      </div>

      {forceOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-inverse-surface/70 backdrop-blur-sm" aria-hidden="true" />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="force-logout-title"
            aria-describedby="force-logout-desc"
            className="relative w-full max-w-md rounded-xl border border-danger/30 bg-surface-container-lowest p-6 shadow-modal"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger">
              <MaterialIcon name="logout" size={24} />
            </div>
            <h2 id="force-logout-title" className="text-headline-md text-on-surface font-bold">
              {t.auth.forceLogoutTitle}
            </h2>
            <p id="force-logout-desc" className="mt-2 text-body-sm text-on-surface-variant">
              {t.auth.forceLogoutBody}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={signingOut}
                onClick={() => setForceOpen(false)}
              >
                {t.auth.forceLogoutStay}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={signingOut}
                onClick={() => void handleLogout()}
              >
                {signingOut ? t.common.loading : t.auth.forceLogoutConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

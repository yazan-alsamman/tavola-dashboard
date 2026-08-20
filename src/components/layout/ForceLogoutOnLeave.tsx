import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import {
  clearAwaitingCloseAfterLogout,
  isAwaitingCloseAfterLogout,
  markAwaitingCloseAfterLogout,
  onLeaveAttempt,
} from '@/lib/leaveGuard'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'

/**
 * Opens the styled logout dialog only after a close/leave attempt
 * (user cancels the browser leave dialog). Never auto-opens on page load.
 */
export function ForceLogoutOnLeave() {
  const { t } = useLocale()
  const { logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [signedOutAwaitingClose, setSignedOutAwaitingClose] = useState(() =>
    isAwaitingCloseAfterLogout(),
  )

  const onDashboard = location.pathname.startsWith('/app')

  useEffect(() => {
    if (!isAuthenticated) {
      setConfirmOpen(false)
      return
    }
    return onLeaveAttempt(() => {
      setConfirmOpen(true)
    })
  }, [isAuthenticated])

  useEffect(() => {
    if (!(isAuthenticated && onDashboard)) {
      document.documentElement.style.removeProperty('--logout-leave-banner-h')
      return
    }
    document.documentElement.style.setProperty('--logout-leave-banner-h', '2.75rem')
    return () => {
      document.documentElement.style.removeProperty('--logout-leave-banner-h')
    }
  }, [isAuthenticated, onDashboard])

  const handleLogoutAndClose = async (): Promise<void> => {
    if (signingOut) return
    setSigningOut(true)
    try {
      markAwaitingCloseAfterLogout()
      await logout()
      setConfirmOpen(false)
      setSignedOutAwaitingClose(true)
      window.close()
    } finally {
      setSigningOut(false)
    }
  }

  if (signedOutAwaitingClose) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/50 p-6 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-modal animate-scale-in">
          <div className="bg-primary px-6 py-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-on-primary">
              <MaterialIcon name="check_circle" size={32} />
            </div>
            <h2 className="text-xl font-bold text-on-primary">{t.auth.signedOutCloseTitle}</h2>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-body-sm text-on-surface-variant">{t.auth.signedOutCloseBody}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                className="w-full rounded-full"
                onClick={() => {
                  window.close()
                }}
              >
                {t.auth.signedOutCloseAction}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={() => {
                  clearAwaitingCloseAfterLogout()
                  setSignedOutAwaitingClose(false)
                  navigate('/login', { replace: true })
                }}
              >
                {t.auth.signedOutGoToLogin}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !onDashboard) return null

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[60] border-b border-primary/15 bg-primary-light/90 px-3 py-1.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-on-surface-variant">
            {t.auth.logoutCloseFlowHint}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="shrink-0 rounded-full"
            disabled={signingOut}
            onClick={() => setConfirmOpen(true)}
          >
            {t.auth.logoutBeforeLeaveAction}
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-inverse-surface/55 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={() => setConfirmOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-alert-title"
            aria-describedby="logout-alert-desc"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-surface-container-lowest shadow-modal animate-scale-in"
          >
            <div className="bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-on-primary ring-4 ring-white/10">
                <MaterialIcon name="logout" size={30} />
              </div>
              <h2 id="logout-alert-title" className="text-xl font-bold text-on-primary">
                {t.auth.forceLogoutTitle}
              </h2>
            </div>

            <div className="px-6 py-5">
              <p
                id="logout-alert-desc"
                className="text-center text-body-sm leading-relaxed text-on-surface-variant"
              >
                {t.auth.forceLogoutBody}
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full rounded-full py-2.5 text-base font-semibold"
                  disabled={signingOut}
                  onClick={() => void handleLogoutAndClose()}
                >
                  {signingOut ? t.common.loading : t.auth.forceLogoutConfirm}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full"
                  disabled={signingOut}
                  onClick={() => setConfirmOpen(false)}
                >
                  {t.auth.forceLogoutStay}
                </Button>
              </div>

              <p className="mt-4 text-center text-[11px] leading-snug text-on-surface-variant/80">
                {t.auth.logoutAutoOnCloseHint}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

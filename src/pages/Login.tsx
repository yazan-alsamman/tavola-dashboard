import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPassword, resetPassword } from '@/api/auth'
import { isApiError } from '@/api/errors'
import { tokenStore } from '@/api/tokenStore'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { MaterialIcon } from '@/components/ui/Icon'

const BG_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAUn-J3WBBKHCMehPNsnUiKp-7bXHcHO2WwVCGj-eNzATQCOqDzNI-5TPiQqJspv3RiJBDO5bmgMLsUypw4B7U4v0gQxGnxYMMCjaMBtlHvi78ocO6cM-5tBVEt3xzRA7vz9ttMRNzqRHZz4kFqSgdFvHkjq2ju2tojt4PRFXfo9cehIFkam9SqYe5Xbr_uuffZfxoIGkuoeYtN66uGhEX4upwqxgotsKh6Pv-RknvsvkolVRMMtZRgcQ'

type AuthView = 'login' | 'forgot' | 'reset'

function mapLoginError(
  error: unknown,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (!isApiError(error)) {
    return t.login.errors.unknown
  }

  switch (error.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return t.login.errors.invalidCredentials
    case 'AUTH_ACCOUNT_LOCKED':
      return t.login.errors.accountLocked
    case 'AUTH_ACCOUNT_SUSPENDED':
      return t.login.errors.accountSuspended
    case 'AUTH_EMAIL_NOT_VERIFIED':
      return t.login.errors.emailNotVerified
    case 'AUTH_TOO_MANY_SESSIONS':
      return t.login.errors.tooManySessions
    case 'RATE_LIMIT_EXCEEDED':
      return t.login.errors.rateLimited
    case 'VALIDATION_ERROR':
      return t.login.errors.validation
    default:
      return t.login.errors.unknown
  }
}

export function LoginPage() {
  const { login } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const resetToken = searchParams.get('token')?.trim() ?? ''
  const initialView: AuthView = resetToken
    ? 'reset'
    : searchParams.get('view') === 'forgot'
      ? 'forgot'
      : 'login'

  const [view, setView] = useState<AuthView>(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showClearSessionsCta, setShowClearSessionsCta] = useState(false)

  const title = useMemo(() => {
    if (view === 'forgot') return t.login.forgot.title
    if (view === 'reset') return t.login.reset.title
    return t.login.subtitle
  }, [view, t])

  const goToLogin = () => {
    setView('login')
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
    setSearchParams({})
  }

  const goToForgot = () => {
    setView('forgot')
    setError('')
    setSuccess('')
    setSearchParams({ view: 'forgot' })
  }

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSuccess('')
    setShowClearSessionsCta(false)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(mapLoginError(err, t))
      if (isApiError(err) && err.code === 'AUTH_TOO_MANY_SESSIONS') {
        setShowClearSessionsCta(Boolean(tokenStore.getRefreshToken()))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleClearSessionsAndRetry = async (): Promise<void> => {
    if (submitting || !email.trim() || !password) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(mapLoginError(err, t))
      setShowClearSessionsCta(
        isApiError(err) &&
          err.code === 'AUTH_TOO_MANY_SESSIONS' &&
          Boolean(tokenStore.getRefreshToken()),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setSuccess(t.login.forgot.success)
    } catch (err) {
      setError(isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (submitting) return
    if (password !== confirmPassword) {
      setError(t.login.reset.mismatch)
      return
    }
    if (!resetToken) {
      setError(t.login.reset.missingToken)
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await resetPassword(resetToken, password)
      setSuccess(t.login.reset.success)
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => goToLogin(), 1200)
    } catch (err) {
      setError(isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-background">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-mauve-gradient opacity-80 z-10" />
        <div
          className="w-full h-full bg-cover bg-center scale-105"
          style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        />
      </div>

      <main className="relative z-20 w-full max-w-[460px] animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <span className="text-display text-primary tracking-tight font-bold">Tavola</span>
          <div className="h-1 w-12 bg-primary rounded-full my-4" />
          <h1 className="text-headline-md text-on-surface text-center px-6">{title}</h1>
        </div>

        <div className="glass-panel p-8 rounded-xl shadow-lg">
          <div className="mb-6 flex items-center gap-3 bg-secondary-container/30 p-3 rounded-lg border border-outline-variant/30">
            <MaterialIcon name="restaurant" className="text-primary" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-label-sm text-on-surface-variant">{t.login.platformLabel}</span>
              <span className="text-label-md text-on-surface font-semibold truncate">
                {t.login.platformName}
              </span>
            </div>
          </div>

          {view === 'login' && (
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-6">
              <EmailField
                value={email}
                onChange={setEmail}
                disabled={submitting}
                label={t.login.email}
              />
              <PasswordField
                id="password"
                label={t.login.password}
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                disabled={submitting}
                showLabel={t.login.showPassword}
                hideLabel={t.login.hidePassword}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-label-sm text-primary font-semibold hover:underline"
                  onClick={goToForgot}
                >
                  {t.login.forgot.link}
                </button>
              </div>
              {error && (
                <p className="text-body-sm text-error" role="alert">
                  {error}
                </p>
              )}
              {showClearSessionsCta && (
                <button
                  type="button"
                  className="w-full text-label-sm font-semibold text-primary hover:underline disabled:opacity-60"
                  disabled={submitting}
                  onClick={() => void handleClearSessionsAndRetry()}
                >
                  {t.login.clearSessionsAndRetry}
                </button>
              )}
              <SubmitButton
                submitting={submitting}
                idleLabel={t.login.submit}
                busyLabel={t.login.submitting}
              />
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={(e) => void handleForgot(e)} className="space-y-6">
              <p className="text-body-sm text-on-surface-variant">
                {t.login.forgot.subtitle}
              </p>
              <EmailField
                value={email}
                onChange={setEmail}
                disabled={submitting}
                label={t.login.email}
              />
              {error && (
                <p className="text-body-sm text-error" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-body-sm text-success" role="status">
                  {success}
                </p>
              )}
              <SubmitButton
                submitting={submitting}
                idleLabel={t.login.forgot.submit}
                busyLabel={t.common.loading}
              />
              <button
                type="button"
                className="w-full text-label-sm text-on-surface-variant hover:text-primary"
                onClick={goToLogin}
              >
                {t.login.forgot.back}
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={(e) => void handleReset(e)} className="space-y-6">
              <p className="text-body-sm text-on-surface-variant">
                {t.login.reset.subtitle}
              </p>
              <PasswordField
                id="new-password"
                label={t.login.reset.newPassword}
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                disabled={submitting}
                showLabel={t.login.showPassword}
                hideLabel={t.login.hidePassword}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-password"
                label={t.login.reset.confirmPassword}
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                disabled={submitting}
                showLabel={t.login.showPassword}
                hideLabel={t.login.hidePassword}
                autoComplete="new-password"
              />
              {error && (
                <p className="text-body-sm text-error" role="alert">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-body-sm text-success" role="status">
                  {success}
                </p>
              )}
              <SubmitButton
                submitting={submitting}
                idleLabel={t.login.reset.submit}
                busyLabel={t.common.loading}
              />
              <button
                type="button"
                className="w-full text-label-sm text-on-surface-variant hover:text-primary"
                onClick={goToLogin}
              >
                {t.login.forgot.back}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

function EmailField({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  label: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-label-md text-on-surface-variant ms-1" htmlFor="email">
        {label}
      </label>
      <div className="relative">
        <MaterialIcon
          name="mail"
          size={18}
          className="absolute start-4 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          id="email"
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="username"
          disabled={disabled}
          className="w-full ps-12 pe-4 py-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-body-md disabled:opacity-60"
          required
        />
      </div>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  disabled,
  showLabel,
  hideLabel,
  autoComplete = 'current-password',
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  disabled: boolean
  showLabel: string
  hideLabel: string
  autoComplete?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-label-md text-on-surface-variant ms-1" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <MaterialIcon
          name="lock"
          size={18}
          className="absolute start-4 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full ps-12 pe-12 py-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-body-md disabled:opacity-60"
          required
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          className="absolute end-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors disabled:opacity-60"
          aria-label={show ? hideLabel : showLabel}
        >
          <MaterialIcon name={show ? 'visibility_off' : 'visibility'} size={20} />
        </button>
      </div>
    </div>
  )
}

function SubmitButton({
  submitting,
  idleLabel,
  busyLabel,
}: {
  submitting: boolean
  idleLabel: string
  busyLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="group relative w-full py-3 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 disabled:pointer-events-none"
    >
      <span className="relative z-10">{submitting ? busyLabel : idleLabel}</span>
      {!submitting && (
        <MaterialIcon
          name="arrow_forward"
          size={18}
          className="relative z-10 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        />
      )}
    </button>
  )
}

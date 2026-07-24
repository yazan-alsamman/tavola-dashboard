import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isApiError } from '@/api/errors'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { MaterialIcon } from '@/components/ui/Icon'

const BG_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAUn-J3WBBKHCMehPNsnUiKp-7bXHcHO2WwVCGj-eNzATQCOqDzNI-5TPiQqJspv3RiJBDO5bmgMLsUypw4B7U4v0gQxGnxYMMCjaMBtlHvi78ocO6cM-5tBVEt3xzRA7vz9ttMRNzqRHZz4kFqSgdFvHkjq2ju2tojt4PRFXfo9cehIFkam9SqYe5Xbr_uuffZfxoIGkuoeYtN66uGhEX4upwqxgotsKh6Pv-RknvsvkolVRMMtZRgcQ'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (submitting) return

    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(mapLoginError(err, t))
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
          <h1 className="text-headline-md text-on-surface text-center px-6">{t.login.subtitle}</h1>
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

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant ms-1" htmlFor="email">
                {t.login.email}
              </label>
              <div className="relative">
                <MaterialIcon name="mail" size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  disabled={submitting}
                  className="w-full ps-12 pe-4 py-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-body-md disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-md text-on-surface-variant ms-1" htmlFor="password">
                {t.login.password}
              </label>
              <div className="relative">
                <MaterialIcon name="lock" size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={submitting}
                  className="w-full ps-12 pe-12 py-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-body-md disabled:opacity-60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={submitting}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors disabled:opacity-60"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                >
                  <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>

            {error && (
              <p className="text-body-sm text-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full py-3 bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 disabled:pointer-events-none"
            >
              <span className="relative z-10">
                {submitting ? t.login.submitting : t.login.submit}
              </span>
              {!submitting && (
                <MaterialIcon
                  name="arrow_forward"
                  size={18}
                  className="relative z-10 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

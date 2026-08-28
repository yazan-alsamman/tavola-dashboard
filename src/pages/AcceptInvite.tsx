import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { acceptOrganizationInvitation } from '@/api/organizations'
import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'

/**
 * Public invitation accept page — Postman `POST /invitations/:token/accept`.
 */
export function AcceptInvitePage() {
  const { token = '' } = useParams<{ token: string }>()
  const { t } = useLocale()
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const copy = t.inviteAccept

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!token) {
      toast('error', copy.missingToken)
      return
    }
    setSubmitting(true)
    try {
      await acceptOrganizationInvitation(token, {
        ...(isAuthenticated
          ? {}
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              password,
            }),
      })
      toast('success', copy.success)
      navigate(isAuthenticated ? '/app' : '/login', { replace: true })
    } catch (err) {
      toast('error', isApiError(err) ? err.message : copy.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardTitle className="mb-2">{copy.title}</CardTitle>
        <p className="text-body-sm text-on-surface-variant mb-6">{copy.subtitle}</p>

        {isAuthenticated && (
          <p className="mb-4 rounded-lg bg-primary-light px-3 py-2 text-sm text-on-surface">
            {copy.signedInAs.replace('{email}', user?.email ?? '')}
          </p>
        )}

        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          {!isAuthenticated && (
            <>
              <div>
                <label className="text-label-sm text-on-surface-variant mb-1.5 block">
                  {copy.firstName}
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant mb-1.5 block">
                  {copy.lastName}
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant mb-1.5 block">
                  {copy.password}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={submitting || !token}>
            {submitting ? t.common.loading : copy.submit}
          </Button>
        </form>

        <p className="mt-4 text-center text-label-sm text-on-surface-variant">
          <Link to="/login" className="text-primary font-semibold">
            {copy.goToLogin}
          </Link>
        </p>
      </Card>
    </div>
  )
}

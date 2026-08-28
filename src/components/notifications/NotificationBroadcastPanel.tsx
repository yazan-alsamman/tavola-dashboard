import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useBroadcastRestaurantNotification } from '@/hooks/useNotificationQueries'

export function NotificationBroadcastPanel() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { user } = useAuth()
  const { selectedRestaurantId } = useRestaurantScope()
  const broadcast = useBroadcastRestaurantNotification()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const canBroadcast =
    user?.organization?.role === 'Owner' || user?.organization?.role === 'Admin'

  if (!canBroadcast) return null

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault()
    if (!selectedRestaurantId) {
      toast('error', t.notifications.broadcast.needRestaurant)
      return
    }
    if (!title.trim() || !body.trim()) {
      toast('error', t.notifications.broadcast.validation)
      return
    }
    broadcast.mutate(
      {
        restaurantId: selectedRestaurantId,
        title: title.trim(),
        body: body.trim(),
      },
      {
        onSuccess: (result) => {
          toast(
            'success',
            t.notifications.broadcast.success.replace(
              '{count}',
              String(result.totalRecipients ?? 0),
            ),
          )
          setTitle('')
          setBody('')
        },
        onError: (err) => {
          toast(
            'error',
            isApiError(err) ? err.message : t.notifications.broadcast.error,
          )
        },
      },
    )
  }

  return (
    <Card className="mb-6 max-w-3xl">
      <CardTitle className="mb-2">{t.notifications.broadcast.title}</CardTitle>
      <p className="text-body-sm text-on-surface-variant mb-4">
        {t.notifications.broadcast.subtitle}
      </p>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="text-label-sm text-on-surface-variant mb-1.5 block">
            {t.notifications.broadcast.titleField}
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
        <label className="block">
          <span className="text-label-sm text-on-surface-variant mb-1.5 block">
            {t.notifications.broadcast.bodyField}
          </span>
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
          />
        </label>
        <Button type="submit" disabled={broadcast.isPending}>
          {broadcast.isPending
            ? t.common.loading
            : t.notifications.broadcast.submit}
        </Button>
      </form>
    </Card>
  )
}

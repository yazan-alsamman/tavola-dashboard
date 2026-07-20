import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { cn } from '@/lib/utils'

const typeIcons = {
  new_reservation: 'event_available',
  updated: 'sync',
  cancelled: 'cancel',
  arrived: 'how_to_reg',
  occasion: 'cake',
} as const

const typeColors = {
  new_reservation: 'bg-info-light text-info',
  updated: 'bg-mauve-100 text-mauve-700',
  cancelled: 'bg-danger-light text-danger',
  arrived: 'bg-success-light text-success',
  occasion: 'bg-primary-light text-primary',
}

export function NotificationsPage() {
  const { t } = useLocale()
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useRestaurant()

  return (
    <div>
      <PageHeader
        title={t.notifications.title}
        subtitle={t.notifications.subtitle}
        actions={
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>{t.notifications.markAllRead}</Button>
        }
      />

      <p className="text-sm text-on-surface-variant mb-4">
        {unreadNotificationCount} {t.notifications.unread}
      </p>

      <div className="space-y-3 max-w-3xl">
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={cn('transition-colors cursor-pointer', !n.read && 'border-primary/30 bg-primary-light/30')}
            onClick={() => markNotificationRead(n.id)}
          >
            <div className="flex items-start gap-4">
              <div className={cn('p-2.5 rounded-lg shrink-0', typeColors[n.type])}>
                <MaterialIcon name={typeIcons[n.type]} size={16} filled={n.type === 'occasion'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-on-surface text-sm">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{n.message}</p>
                <p className="text-xs text-on-surface-variant mt-2">{n.time}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

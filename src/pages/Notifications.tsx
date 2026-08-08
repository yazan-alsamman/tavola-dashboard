import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { formatInstantInTimeZone } from '@/lib/branchDateTime'
import { cn } from '@/lib/utils'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotificationCount,
} from '@/hooks/useNotificationQueries'
import { Num } from '@/components/ui/Num'

const defaultTypeIcon = 'notifications'
const typeIcons: Record<string, string> = {
  new_reservation: 'event_available',
  updated: 'sync',
  cancelled: 'cancel',
  arrived: 'how_to_reg',
  occasion: 'cake',
}

const typeColors: Record<string, string> = {
  new_reservation: 'bg-info-light text-info',
  updated: 'bg-mauve-100 text-mauve-700',
  cancelled: 'bg-danger-light text-danger',
  arrived: 'bg-success-light text-success',
  occasion: 'bg-primary-light text-primary',
}

function notificationIcon(type: string | null | undefined): string {
  if (!type) return defaultTypeIcon
  return typeIcons[type] ?? defaultTypeIcon
}

function notificationColor(type: string | null | undefined): string {
  if (!type) return 'bg-surface-container-lowest text-on-surface-variant'
  return typeColors[type] ?? 'bg-surface-container-lowest text-on-surface-variant'
}

export function NotificationsPage() {
  const { t, locale } = useLocale()
  const listQuery = useNotificationsList(1, 50)
  const unreadCountQuery = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = listQuery.data?.items ?? []
  const unreadCount = unreadCountQuery.data ?? 0

  const handleMarkRead = (id: string): void => {
    markRead.mutate(id)
  }

  const handleMarkAllRead = (): void => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        // Toast optional — page has visual feedback
      },
    })
  }

  return (
    <div>
      <PageHeader
        title={t.notifications.title}
        subtitle={t.notifications.subtitle}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            {t.notifications.markAllRead}
          </Button>
        }
      />

      <p className="text-sm text-on-surface-variant mb-4">
        <Num>{unreadCount}</Num> {t.notifications.unread}
      </p>

      {listQuery.isLoading && (
        <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
      )}

      {listQuery.isError && (
        <EmptyState icon="error" title={t.notifications.loadError} />
      )}

      {!listQuery.isLoading && !listQuery.isError && notifications.length === 0 && (
        <EmptyState icon="notifications_none" title={t.notifications.empty} />
      )}

      <div className="space-y-3 max-w-3xl">
        {notifications.map((n) => {
          const isUnread = !n.readAt
          return (
            <Card
              key={n.id}
              className={cn(
                'transition-colors cursor-pointer',
                isUnread && 'border-primary/30 bg-primary-light/30',
              )}
              onClick={() => handleMarkRead(n.id)}
            >
              <div className="flex items-start gap-4">
                <div className={cn('p-2.5 rounded-lg shrink-0', notificationColor(n.type))}>
                  <MaterialIcon
                    name={notificationIcon(n.type)}
                    size={16}
                    filled={n.type === 'occasion'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-on-surface text-sm">
                      {n.title ?? t.notifications.untitled}
                    </p>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.body && (
                    <p className="text-sm text-on-surface-variant mt-1">{n.body}</p>
                  )}
                  {n.createdAt && (
                    <p className="text-xs text-on-surface-variant mt-2">
                      {formatInstantInTimeZone(
                        n.createdAt,
                        'UTC',
                        locale === 'ar' ? 'ar' : 'en',
                      )}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLocale } from '@/context/LocaleContext'
import { formatInstantInTimeZone } from '@/lib/branchDateTime'
import { cn } from '@/lib/utils'
import { notificationTarget, notificationText } from '@/lib/notificationDisplay'
import type { NotificationDto } from '@/api/notifications'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotificationCount,
} from '@/hooks/useNotificationQueries'

export function NotificationPopover() {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  const listQuery = useNotificationsList(1, 6, undefined, open)
  const unreadCountQuery = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = listQuery.data?.items ?? []
  const unreadCount = unreadCountQuery.data ?? 0

  /** Marks it read and opens what it is about (a conversation, a booking…). */
  const handleOpen = (notification: NotificationDto): void => {
    if (!notification.readAt) markRead.mutate(notification.id)
    const target = notificationTarget(notification)
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
        aria-label={t.header.notifications}
      >
        <MaterialIcon name="notifications" size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">
            <Num>{unreadCount}</Num>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full end-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal z-50 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
            <h3 className="font-semibold text-on-surface text-body-md">{t.notifications.title}</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-label-md text-primary hover:underline disabled:opacity-50"
              >
                {t.notifications.markAllRead}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {listQuery.isLoading && (
              <p className="p-4 text-body-sm text-on-surface-variant">{t.common.loading}</p>
            )}
            {!listQuery.isLoading && notifications.length === 0 && (
              <p className="p-4 text-body-sm text-on-surface-variant">{t.notifications.empty}</p>
            )}
            {notifications.map((n) => {
              const isUnread = !n.readAt
              const text = notificationText(n, t)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpen(n)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 hover:bg-surface-container-high transition-colors text-start border-b border-outline-variant/20 last:border-0',
                    isUnread && 'bg-primary-container/5',
                  )}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mt-2 shrink-0',
                      isUnread ? 'bg-primary' : 'bg-transparent',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium">
                      {text.title}
                    </p>
                    {text.body && (
                      <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                        {text.body}
                      </p>
                    )}
                    {n.createdAt && (
                      <p className="text-label-sm text-outline mt-1">
                        {formatInstantInTimeZone(
                          n.createdAt,
                          'UTC',
                          locale === 'ar' ? 'ar' : 'en',
                        )}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          <Link
            to="/app/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-body-md text-primary font-medium py-3 border-t border-outline-variant/30 hover:bg-surface-container-high transition-colors"
          >
            {t.common.viewAll}
          </Link>
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

export function NotificationPopover() {
  const { t } = useLocale()
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useRestaurant()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1 end-1 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full end-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal z-50 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
            <h3 className="font-semibold text-on-surface text-body-md">{t.notifications.title}</h3>
            {unreadNotificationCount > 0 && (
              <button onClick={markAllNotificationsRead} className="text-label-md text-primary hover:underline">
                {t.notifications.markAllRead}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 6).map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 hover:bg-surface-container-high transition-colors text-start border-b border-outline-variant/20 last:border-0',
                  !n.read && 'bg-primary-container/5',
                )}
              >
                <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', !n.read ? 'bg-primary' : 'bg-transparent')} />
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium">{n.title}</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-label-sm text-outline mt-1">{n.time}</p>
                </div>
              </button>
            ))}
          </div>
          <Link
            to="/notifications"
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

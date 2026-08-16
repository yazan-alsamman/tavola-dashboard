import { Link, useLocation } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries'
import { cn } from '@/lib/utils'
import { Num } from '@/components/ui/Num'

const actions = [
  { key: 'walkIn' as const, path: '/app/walk-in', icon: 'person_add', color: 'bg-primary text-white' },
  { key: 'waitlist' as const, path: '/app/waitlist', icon: 'schedule', color: 'bg-warning text-white' },
  { key: 'floorPlan' as const, path: '/app/floor-plan', icon: 'map', color: 'bg-success text-white' },
  { key: 'reservations' as const, path: '/app/reservations', icon: 'calendar_month', color: 'bg-info text-white' },
  { key: 'notifications' as const, path: '/app/notifications', icon: 'notifications', color: 'bg-danger text-white' },
]

export function QuickActionsBar() {
  const { t } = useLocale()
  const unreadQuery = useUnreadNotificationCount()
  const location = useLocation()
  const unreadCount = unreadQuery.data ?? 0

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {actions.map(({ key, path, icon, color }) => {
        const isActive = location.pathname === path
        const badge = key === 'notifications' ? unreadCount : 0

        return (
          <Link
            key={key}
            to={path}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap',
              'border transition-all duration-200 shrink-0',
              isActive
                ? 'bg-primary-light border-primary/30 text-primary shadow-card'
                : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:border-primary/30 hover:text-primary hover:shadow-card',
            )}
          >
            <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
              <MaterialIcon name={icon} size={14} />
            </span>
            {key === 'notifications'
              ? t.header.notifications
              : t.quickActions[key as keyof typeof t.quickActions]}
            {badge > 0 && (
              <span className="text-xs font-bold bg-danger text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                <Num>{badge}</Num>
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries'
import { useMyReservationsQuery } from '@/hooks/useReservationQueries'

const shortcutConfig = [
  {
    key: 'pendingRequests' as const,
    path: '/app/notifications',
    icon: 'notifications',
    accent: 'warning' as const,
  },
  {
    key: 'confirmPending' as const,
    path: '/app/reservations',
    icon: 'check_circle',
    accent: 'info' as const,
    hash: 'pending',
  },
  {
    key: 'nextReservations' as const,
    path: '/app/reservations',
    icon: 'schedule',
    accent: 'success' as const,
  },
  {
    key: 'seatWalkIn' as const,
    path: '/app/walk-in',
    icon: 'person_add',
    accent: 'success' as const,
  },
  {
    key: 'floorPlan' as const,
    path: '/app/floor-plan',
    icon: 'map',
    accent: 'primary' as const,
  },
  {
    key: 'waitlist' as const,
    path: '/app/waitlist',
    icon: 'format_list_numbered',
    accent: 'danger' as const,
  },
]

const accentIcon: Record<string, string> = {
  warning: 'bg-warning-light text-warning',
  info: 'bg-info-light text-info',
  success: 'bg-success-light text-success',
  danger: 'bg-danger-light text-danger',
  primary: 'bg-primary-light text-primary',
}

const accentWash: Record<string, string> = {
  warning: 'bg-warning-light/50',
  info: 'bg-info-light/50',
  success: 'bg-success-light/50',
  danger: 'bg-danger-light/40',
  primary: 'bg-primary-light/60',
}

export function HomeShortcuts() {
  const { t } = useLocale()
  const unreadQuery = useUnreadNotificationCount()
  const reservationsQuery = useMyReservationsQuery(1, 20)

  const unreadCount = unreadQuery.data ?? 0
  const reservations = reservationsQuery.data?.items ?? []
  const pendingCount = reservations.filter((r) => r.status === 'Pending').length
  const upcomingCount = reservations.filter((r) => {
    const start = new Date(r.reservationStartTime)
    return start.getTime() >= Date.now()
  }).length

  const badges: Record<string, number> = {
    pendingRequests: unreadCount,
    confirmPending: pendingCount,
    nextReservations: upcomingCount,
  }

  return (
    <section className="mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-on-surface">{t.dashboard.shortcutsTitle}</h2>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {t.dashboard.shortcutsSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {shortcutConfig.map(({ key, path, icon, accent, hash }) => {
          const badge = badges[key] ?? 0
          const title = t.shortcuts[key]
          const descKey = `${key}Desc` as keyof typeof t.shortcuts
          const desc = t.shortcuts[descKey]
          const to = hash ? `${path}#${hash}` : path

          return (
            <Link
              key={key}
              to={to}
              className={cn(
                'group relative flex flex-col gap-3 p-4 rounded-2xl border border-outline-variant/30 bg-surface',
                'shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-200',
                'overflow-hidden',
              )}
            >
              <div className={cn('absolute inset-0 opacity-80', accentWash[accent])} />
              <div className="relative flex items-start justify-between">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shadow-card',
                    accentIcon[accent],
                  )}
                >
                  <MaterialIcon name={icon} size={20} />
                </div>
                {badge > 0 && (
                  <span className="relative bg-danger text-white text-[10px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center px-1.5">
                    <Num>{badge}</Num>
                  </span>
                )}
              </div>
              <div className="relative">
                <p className="text-sm font-bold text-on-surface leading-snug">{title}</p>
                <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                  {desc}
                </p>
              </div>
              <MaterialIcon
                name="arrow_back"
                size={16}
                className="relative text-primary opacity-0 group-hover:opacity-100 transition-opacity self-end rotate-180"
              />
            </Link>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 p-4 rounded-xl bg-surface border border-outline-variant/30">
        <Link to="/app/floor-plan" className="text-xs text-primary font-medium">
          {t.shortcuts.floorPlan}
        </Link>
        <span className="text-outline-variant">|</span>
        <Link to="/app/reports" className="text-xs text-primary font-medium">
          {t.reports.title}
        </Link>
        {unreadCount > 0 && (
          <>
            <span className="text-outline-variant">|</span>
            <Link to="/app/notifications" className="text-xs text-warning font-medium">
              <Num>{unreadCount}</Num> {t.dashboard.unreadNotifications}
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

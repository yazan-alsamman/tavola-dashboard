import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries'
import { formatDate, formatTime } from '@/lib/format'
import { getServicePeriod } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'

export function LiveServiceBar() {
  const { t, locale } = useLocale()
  const { selectedBranch, formatBranchLabel, status } = useRestaurantScope()
  const unreadQuery = useUnreadNotificationCount()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const period = getServicePeriod()
  const timeLabel = formatTime(now, locale)
  const dateLabel = formatDate(now, locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const unreadCount = unreadQuery.data ?? 0
  const branchLabel =
    status === 'ready' && selectedBranch ? formatBranchLabel(selectedBranch) : null

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3">
      <div className="min-w-0">
        <p className="text-overline text-on-surface-variant">{t.ops.liveNow}</p>
        <p className="text-headline-md text-on-surface nums">
          <Num>{timeLabel}</Num>
        </p>
        <p className="text-body-sm text-on-surface-variant">{dateLabel}</p>
      </div>

      <div className="hidden h-10 w-px bg-outline-variant/60 sm:block" />

      <div className="min-w-0">
        <p className="text-overline text-on-surface-variant">{t.ops.service}</p>
        <p className="text-label-lg text-primary">{t.servicePeriods[period]}</p>
        {branchLabel && (
          <p className="text-body-sm text-on-surface-variant truncate">{branchLabel}</p>
        )}
      </div>

      {unreadCount > 0 && (
        <Link
          to="/app/notifications"
          className="ms-auto inline-flex items-center gap-2 rounded-full bg-warning-subtle px-3 py-1.5 text-label-md text-on-warning-subtle transition-colors duration-[var(--duration-fast)] hover:bg-warning-subtle/80"
        >
          <span className="h-2 w-2 rounded-full bg-warning" />
          <MaterialIcon name="notifications" size={16} />
          <span>
            <Num>{unreadCount}</Num> {t.dashboard.unreadNotifications}
          </span>
        </Link>
      )}
    </div>
  )
}

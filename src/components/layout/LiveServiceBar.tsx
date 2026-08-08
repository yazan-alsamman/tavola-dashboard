import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useLocale } from '@/context/LocaleContext'
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries'
import { getServicePeriod } from '@/lib/utils'
import { Num } from '@/components/ui/Num'

export function LiveServiceBar() {
  const { t } = useLocale()
  const unreadQuery = useUnreadNotificationCount()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const period = getServicePeriod()
  const timeStr = format(now, 'h:mm')
  const suffix = now.getHours() >= 12 ? 'م' : 'ص'
  const unreadCount = unreadQuery.data ?? 0

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 bg-surface border border-border rounded-2xl shadow-card mb-6">
      <div>
        <p className="text-xs text-text-muted font-semibold">{t.ops.liveNow}</p>
        <p className="text-xl font-bold text-text-primary">
          <Num>{timeStr}</Num> {suffix}
        </p>
      </div>
      <div className="h-10 w-px bg-border hidden sm:block" />
      <div>
        <p className="text-xs text-text-muted">{t.ops.service}</p>
        <p className="text-sm font-bold text-primary">{t.servicePeriods[period]}</p>
      </div>
      {unreadCount > 0 && (
        <>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <Link
            to="/notifications"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-light hover:bg-warning/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <p className="text-sm font-bold text-warning">
              <Num>{unreadCount}</Num> {t.dashboard.unreadNotifications}
            </p>
          </Link>
        </>
      )}
    </div>
  )
}

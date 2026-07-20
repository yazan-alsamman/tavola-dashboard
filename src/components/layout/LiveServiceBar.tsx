import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { getServicePeriod } from '@/lib/utils'
import { Num } from '@/components/ui/Num'

export function LiveServiceBar() {
  const { t } = useLocale()
  const { stats, pendingCount } = useRestaurant()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const period = getServicePeriod()
  const timeStr = format(now, 'h:mm')
  const suffix = now.getHours() >= 12 ? 'م' : 'ص'

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
      <div className="h-10 w-px bg-border hidden sm:block" />
      <div>
        <p className="text-xs text-text-muted">{t.ops.covers}</p>
        <p className="text-sm font-bold text-text-primary">
          <Num>{stats.expectedGuests}</Num> {t.common.guests}
        </p>
      </div>
      <div>
        <p className="text-xs text-text-muted">{t.ops.occupancy}</p>
        <p className="text-sm font-bold text-text-primary">
          <Num>{stats.occupancyRate}</Num>%
        </p>
      </div>
      {pendingCount > 0 && (
        <>
          <div className="h-10 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-light">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <p className="text-sm font-bold text-warning">
              <Num>{pendingCount}</Num> {t.ops.pendingApproval}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

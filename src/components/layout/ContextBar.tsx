import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { getServicePeriod } from '@/lib/utils'
import { Num } from '@/components/ui/Num'

export function ContextBar() {
  const { t } = useLocale()
  const { stats, pendingCount, waitlist } = useRestaurant()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const period = getServicePeriod()
  const timeStr = format(now, 'h:mm')
  const suffix = now.getHours() >= 12 ? 'م' : 'ص'

  const items = [
    { icon: 'schedule', label: t.ops.liveNow, value: <><Num>{timeStr}</Num> {suffix}</> },
    { icon: 'pie_chart', label: t.ops.service, value: t.servicePeriods[period] },
    { icon: 'group', label: t.ops.occupancy, value: <><Num>{stats.occupancyRate}</Num>%</> },
    { icon: 'group', label: t.ops.covers, value: <><Num>{stats.expectedGuests}</Num></> },
    { icon: 'queue', label: t.waitlist.title, value: <Num>{waitlist.length}</Num> },
  ]

  return (
    <div className="flex items-center gap-0 px-3 py-2 bg-surface border border-outline-variant/30 rounded-lg text-meta overflow-x-auto">
      {pendingCount > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-warning-light text-warning font-semibold shrink-0 me-3">
          <MaterialIcon name="warning" size={16} filled className="shrink-0" />
          <Num>{pendingCount}</Num>
          <span className="hidden sm:inline">{t.ops.pendingApproval}</span>
        </div>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-4 shrink-0">
          {i > 0 && <span className="w-px h-4 bg-outline-variant/30" />}
          <div className="flex items-center gap-2 text-on-surface-variant">
            <MaterialIcon name={item.icon} size={16} className="text-primary shrink-0" />
            <span className="text-on-surface-variant hidden sm:inline">{item.label}:</span>
            <span className="font-semibold text-on-surface tabular-nums">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

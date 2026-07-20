import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocale } from '@/context/LocaleContext'
import { reservations } from '@/data/mockData'
import { cn } from '@/lib/utils'

const hours = Array.from({ length: 14 }, (_, i) => i + 10)

export function CalendarPage() {
  const { t } = useLocale()
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const todayReservations = reservations.filter((r) => r.date === '2026-07-13')

  return (
    <div>
      <PageHeader
        title={t.calendar.title}
        subtitle={t.calendar.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-outline-variant/30 overflow-hidden">
              {(['daily', 'weekly', 'monthly'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    view === v
                      ? 'bg-primary text-white'
                      : 'bg-surface text-on-surface-variant hover:bg-surface-container-lowest',
                  )}
                >
                  {t.calendar[v]}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon"><MaterialIcon name="chevron_left" size={16} /></Button>
            <span className="text-sm font-medium text-on-surface px-2">July 13, 2026</span>
            <Button variant="outline" size="icon"><MaterialIcon name="chevron_right" size={16} /></Button>
          </div>
        }
      />

      <Card padding="none">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[80px_1fr] border-b border-outline-variant/30">
              <div className="p-3 bg-surface-container-lowest text-xs font-semibold text-on-surface-variant">Time</div>
              <div className="p-3 bg-surface-container-lowest text-xs font-semibold text-on-surface-variant">Reservations</div>
            </div>
            {hours.map((hour) => {
              const hourReservations = todayReservations.filter(
                (r) => parseInt(r.time.split(':')[0], 10) === hour,
              )
              return (
                <div key={hour} className="grid grid-cols-[80px_1fr] border-b border-outline-variant/30 min-h-[64px]">
                  <div className="p-3 text-xs text-on-surface-variant border-e border-outline-variant/30">
                    {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  <div className="p-2 flex flex-wrap gap-2">
                    {hourReservations.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-light border border-mauve-200 text-sm"
                      >
                        <span className="font-medium text-on-surface">{r.customerName}</span>
                        <span className="text-on-surface-variant">·</span>
                        <span className="text-on-surface-variant">{r.tableName}</span>
                        <span className="text-on-surface-variant">·</span>
                        <span className="text-on-surface-variant">{r.guestCount} guests</span>
                        <StatusBadge status={r.status} label={t.status[r.status]} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

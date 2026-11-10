import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useCalendarRangeReservationsQuery } from '@/hooks/useReservationQueries'
import { shiftDateKey } from '@/lib/calendarDates'
import { formatTime } from '@/lib/format'
import { isAutoClosed } from '@/lib/reservationInsights'

/**
 * Daily report of confirmed bookings the system closed because reception
 * did not (today and yesterday), so the manager can follow up. Hidden when
 * there is nothing to report.
 */
export function AutoClosedReport({ today }: { today: string }) {
  const { t, locale } = useLocale()
  const yesterday = shiftDateKey(today, -1)
  const query = useCalendarRangeReservationsQuery(yesterday, today)

  const days = useMemo(() => {
    const closed = (query.data?.source === 'branch' ? query.data.items : []).filter(isAutoClosed)
    return [
      { key: today, label: t.reservations.autoClosedReport.today },
      { key: yesterday, label: t.reservations.autoClosedReport.yesterday },
    ].map((day) => ({
      ...day,
      items: closed
        .filter((reservation) => reservation.reservationDate.slice(0, 10) === day.key)
        .sort((a, b) => a.reservationStartTime.localeCompare(b.reservationStartTime)),
    }))
  }, [query.data, t, today, yesterday])

  if (!query.isSuccess || query.data.source !== 'branch') return null
  const total = days.reduce((sum, day) => sum + day.items.length, 0)
  // Nothing to follow up on: keep the bookings page clean.
  if (total === 0) return null

  return (
    <section className="mb-6 rounded-2xl border border-warning/30 bg-warning-light/40 p-4">
      <h2 className="flex items-center gap-2 text-label-lg font-semibold text-on-surface">
        <MaterialIcon name="warning" size={18} className="text-warning" />
        {t.reservations.autoClosedReport.title}
      </h2>
      <p className="mt-1 text-label-sm text-on-surface-variant">
        {t.reservations.autoClosedReport.subtitle}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
          {days.map((day) => (
            <div key={day.key}>
              <p className="text-label-md font-semibold text-on-surface">
                {day.label} ·{' '}
                {t.reservations.autoClosedReport.count.replace('{n}', String(day.items.length))}
              </p>
              <ul className="mt-1.5 space-y-1">
                {day.items.map((reservation) => (
                  <li key={reservation.reservationId}>
                    <Link
                      to={`/app/reservations/${reservation.reservationId}`}
                      className="flex min-h-11 flex-wrap items-center gap-x-2 rounded-lg px-2 text-body-sm text-on-surface hover:bg-surface-container-low"
                    >
                      <span className="font-semibold">
                        {t.reservations.table} {reservation.tableNumber ?? '—'}
                      </span>
                      <span className="tabular-nums">
                        {formatTime(reservation.reservationStartTime, locale)}
                      </span>
                      <span className="min-w-0 truncate text-on-surface-variant">
                        {reservation.customerName ?? t.reservations.board.guest} ·{' '}
                        <Num>{reservation.guests}</Num> {t.calendar.guests}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </section>
  )
}

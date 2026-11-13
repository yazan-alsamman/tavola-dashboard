import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import {
  useBranchDayScheduleQuery,
  useCalendarRangeReservationsQuery,
} from '@/hooks/useReservationQueries'
import { fallbackHours, hoursForSchedule } from '@/lib/branchHours'
import { useReservationTrendsQuery } from '@/hooks/useAnalyticsQueries'
import { extractTrendSeries } from '@/lib/analyticsPayload'
import type { ReservationView } from '@/lib/reservationView'
import {
  eachDateKey,
  endOfMonth,
  endOfWeek,
  formatDateLabel,
  monthGridKeys,
  shiftDateKey,
  shiftMonth,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from '@/lib/calendarDates'
import { formatHour, formatTime } from '@/lib/format'
import { reservationStatusLabel } from '@/lib/statusLabel'
import { cn, getTodayISO } from '@/lib/utils'

type CalendarView = 'daily' | 'weekly' | 'monthly'

function hourOfReservation(reservation: ReservationView): number {
  const start = new Date(reservation.reservationStartTime)
  if (!Number.isNaN(start.getTime())) return start.getHours()
  const timePart = reservation.reservationStartTime.slice(11, 13)
  const parsed = Number.parseInt(timePart, 10)
  return Number.isFinite(parsed) ? parsed : -1
}

function dayKeyOf(reservation: ReservationView): string {
  return reservation.reservationDate.slice(0, 10)
}

function sortByStartTime(a: ReservationView, b: ReservationView): number {
  return a.reservationStartTime.localeCompare(b.reservationStartTime)
}

/** Heat intensity 0–4 from count relative to max in the set. */
function densityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  const ratio = count / max
  if (ratio >= 0.8) return 4
  if (ratio >= 0.55) return 3
  if (ratio >= 0.3) return 2
  return 1
}

const densityCellClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-surface-container-lowest border-outline-variant/20',
  1: 'bg-primary-fixed/40 border-primary/15',
  2: 'bg-primary-fixed/70 border-primary/25',
  3: 'bg-primary/15 border-primary/35',
  4: 'bg-primary/25 border-primary/50',
}

const densityBarClass: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-outline-variant/40',
  1: 'bg-primary/30',
  2: 'bg-primary/50',
  3: 'bg-primary/70',
  4: 'bg-primary',
}

function BookingChip({
  reservation,
  locale,
  t,
  onOpen,
}: {
  reservation: ReservationView
  locale: string
  t: ReturnType<typeof useLocale>['t']
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-start shadow-sm transition-colors hover:border-primary/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MaterialIcon name="event_seat" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-on-surface truncate">
          {reservation.customerName ?? formatTime(reservation.reservationStartTime, locale)}
        </span>
        <span className="block text-xs text-on-surface-variant truncate">
          {reservation.customerName
            ? `${formatTime(reservation.reservationStartTime, locale)} · `
            : ''}
          {reservation.guests} {t.calendar.guests}
          {reservation.tableNumber
            ? ` · ${t.calendar.table} ${reservation.tableNumber}`
            : reservation.tableId
              ? ` · ${t.calendar.table} ${reservation.tableId.slice(0, 8)}`
              : ''}
        </span>
      </span>
      <StatusBadge
        type="custom"
        status={reservation.status}
        label={reservationStatusLabel(reservation.status, t.status)}
      />
    </button>
  )
}

export function CalendarPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const today = getTodayISO()
  const [view, setView] = useState<CalendarView>('daily')
  const [anchorDate, setAnchorDate] = useState(() => toDateKey(new Date()))
  const [now, setNow] = useState(() => new Date())
  const requestedDate = searchParams.get('date')

  useEffect(() => {
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      setAnchorDate(requestedDate)
    }
  }, [requestedDate])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const range = useMemo(() => {
    if (view === 'daily') {
      return { from: anchorDate, to: anchorDate }
    }
    if (view === 'weekly') {
      return {
        from: startOfWeek(anchorDate),
        to: endOfWeek(anchorDate),
      }
    }
    return {
      from: startOfMonth(anchorDate),
      to: endOfMonth(anchorDate),
    }
  }, [anchorDate, view])

  const rangeQuery = useCalendarRangeReservationsQuery(range.from, range.to, true)
  const scheduleQuery = useBranchDayScheduleQuery(anchorDate, today)
  const branchClosed = scheduleQuery.isSuccess && scheduleQuery.data.openingTime === null
  /** The branch's own opening hours for the day; a fixed fallback when unknown. */
  const dayHours = useMemo(() => {
    if (!scheduleQuery.isSuccess) return fallbackHours()
    return (
      hoursForSchedule(scheduleQuery.data.openingTime, scheduleQuery.data.closingTime) ?? []
    )
  }, [scheduleQuery.data, scheduleQuery.isSuccess])
  const calendarSource = rangeQuery.data?.source
  const usingFallback = calendarSource === 'ownership-fallback'
  const trendsQuery = useReservationTrendsQuery(range.from, range.to, usingFallback)

  const trendByDay = useMemo(() => {
    const map = new Map<string, number>()
    if (!usingFallback) return map
    for (const point of extractTrendSeries(trendsQuery.data ?? {}).serviceDay) {
      const day = point.label.slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) map.set(day, point.value)
    }
    return map
  }, [trendsQuery.data, usingFallback])

  const byDay = useMemo(() => {
    const map = new Map<string, ReservationView[]>()
    for (const reservation of rangeQuery.data?.items ?? []) {
      const key = dayKeyOf(reservation)
      const list = map.get(key) ?? []
      list.push(reservation)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort(sortByStartTime)
    }
    return map
  }, [rangeQuery.data?.items])

  const periodDays = useMemo(
    () => eachDateKey(range.from, range.to),
    [range.from, range.to],
  )

  const countOn = (day: string): number => {
    const rows = byDay.get(day)?.length ?? 0
    const trend = trendByDay.get(day) ?? 0
    return Math.max(rows, trend)
  }

  const maxDayCount = useMemo(() => {
    let max = 0
    for (const day of periodDays) {
      const rows = byDay.get(day)?.length ?? 0
      const trend = trendByDay.get(day) ?? 0
      max = Math.max(max, rows, trend)
    }
    return max
  }, [byDay, periodDays, trendByDay])

  const dayReservations = byDay.get(anchorDate) ?? []

  const byHour = useMemo(() => {
    const map = new Map<number, ReservationView[]>()
    for (const hour of dayHours) map.set(hour, [])
    for (const reservation of byDay.get(anchorDate) ?? []) {
      const hour = hourOfReservation(reservation)
      if (!map.has(hour)) map.set(hour, [])
      map.get(hour)!.push(reservation)
    }
    for (const list of map.values()) {
      list.sort(sortByStartTime)
    }
    return map
  }, [anchorDate, byDay, dayHours])

  const hoursRanked = useMemo(() => {
    const hours = [...byHour.entries()]
      .map(([hour, reservations]) => ({ hour, reservations, count: reservations.length }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.hour - b.hour)
    return hours
  }, [byHour])

  const hoursChronological = useMemo(() => {
    const extra = [...byHour.keys()].filter((h) => h >= 0 && !dayHours.includes(h))
    return [...dayHours, ...extra].sort((a, b) => a - b)
  }, [byHour, dayHours])

  const weekDays = useMemo(
    () => eachDateKey(startOfWeek(anchorDate), endOfWeek(anchorDate)),
    [anchorDate],
  )

  const weekdayHeaders = useMemo(() => {
    const start = startOfWeek(today)
    return eachDateKey(start, endOfWeek(start))
  }, [today])

  const monthCells = useMemo(() => monthGridKeys(anchorDate), [anchorDate])
  const monthPrefix = startOfMonth(anchorDate).slice(0, 7)

  const rangeLabel = useMemo(() => {
    if (view === 'daily') {
      return formatDateLabel(anchorDate, locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    if (view === 'weekly') {
      return `${formatDateLabel(range.from, locale, { month: 'short', day: 'numeric' })} – ${formatDateLabel(range.to, locale, { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return formatDateLabel(anchorDate, locale, { month: 'long', year: 'numeric' })
  }, [anchorDate, locale, range.from, range.to, view])

  const goPrev = () => {
    if (view === 'daily') setAnchorDate((d) => shiftDateKey(d, -1))
    else if (view === 'weekly') setAnchorDate((d) => shiftDateKey(d, -7))
    else setAnchorDate((d) => shiftMonth(d, -1))
  }

  const goNext = () => {
    if (view === 'daily') setAnchorDate((d) => shiftDateKey(d, 1))
    else if (view === 'weekly') setAnchorDate((d) => shiftDateKey(d, 7))
    else setAnchorDate((d) => shiftMonth(d, 1))
  }

  const openReservation = (id: string) => {
    navigate(`/app/reservations/${id}`)
  }

  /** An empty hour opens "new booking" pre-filled with that day and hour. */
  const openNewBookingAt = (hour: number) => {
    const start = `${anchorDate}T${String(hour).padStart(2, '0')}:00`
    navigate(`/app/reservations?new=${encodeURIComponent(start)}`)
  }

  const openDay = (day: string) => {
    setAnchorDate(day)
    setView('daily')
  }

  return (
    <div>
      <PageHeader
        title={t.calendar.title}
        subtitle={t.calendar.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-outline-variant/30 overflow-hidden bg-surface-container-lowest shadow-sm">
              {(['daily', 'weekly', 'monthly'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setView(option)}
                  className={cn(
                    'px-4 py-2 text-sm font-semibold transition-colors',
                    view === option
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container',
                  )}
                >
                  {t.calendar[option]}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon" aria-label={t.common.previous} onClick={goPrev}>
              <MaterialIcon name="chevron_left" size={16} />
            </Button>
            {view === 'daily' ? (
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                className="h-10 rounded-lg border border-outline-variant/40 bg-surface px-3 text-sm text-on-surface"
              />
            ) : (
              <span className="min-w-[10rem] text-center text-sm font-semibold text-on-surface px-2">
                {rangeLabel}
              </span>
            )}
            <Button variant="outline" size="icon" aria-label={t.common.next} onClick={goNext}>
              <MaterialIcon name="chevron_right" size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchorDate(today)}>
              {t.common.today}
            </Button>
          </div>
        }
      />

      {usingFallback && (
        <p className="mb-4 text-body-sm text-on-surface-variant">
          {t.calendar.ownershipFallbackNote}
        </p>
      )}

      {rangeQuery.isLoading ? (
        <p className="text-body-md text-on-surface-variant">{t.common.loading}</p>
      ) : rangeQuery.isError ? (
        <EmptyState
          icon="error"
          title={t.calendar.errorTitle}
          description={t.calendar.errorBody}
          action={
            <Button variant="outline" onClick={() => void rangeQuery.refetch()}>
              {t.scope.retry}
            </Button>
          }
        />
      ) : (
        <div>
          <div className="min-w-0 space-y-4">
            {view === 'daily' && (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-on-surface">{rangeLabel}</h2>
                    <p className="text-body-sm text-on-surface-variant">
                      <Num>{countOn(anchorDate)}</Num> {t.calendar.bookingsCount}
                      {scheduleQuery.isSuccess && scheduleQuery.data.openingTime && (
                        <>
                          {' · '}
                          {t.calendar.hoursLabel
                            .replace('{from}', scheduleQuery.data.openingTime)
                            .replace('{to}', scheduleQuery.data.closingTime ?? '')}
                        </>
                      )}
                    </p>
                    {branchClosed && (
                      <p className="mt-1 text-body-sm font-semibold text-warning">
                        {t.calendar.closedDay}
                      </p>
                    )}
                  </div>
                </div>

                {usingFallback && dayReservations.length === 0 && countOn(anchorDate) === 0 ? (
                  <EmptyState
                    icon="event_busy"
                    title={t.calendar.emptyTitle}
                    description={t.calendar.emptyBody}
                  />
                ) : usingFallback && dayReservations.length === 0 ? (
                  <Card>
                    <p className="text-2xl font-bold text-on-surface tabular-nums">
                      <Num>{countOn(anchorDate)}</Num>
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {t.calendar.bookingsCount}
                    </p>
                    <p className="mt-3 text-body-sm text-on-surface">
                      {t.calendar.detailUnavailable}
                    </p>
                  </Card>
                ) : (
                  <Card padding="none" className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <div className="min-w-[680px]">
                        <div className="grid grid-cols-[88px_1fr] border-b border-outline-variant/30 bg-surface-container-lowest">
                          <div className="p-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                            {t.calendar.time}
                          </div>
                          <div className="p-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                            {t.calendar.reservations}
                          </div>
                        </div>
                        {hoursChronological.map((hour) => {
                          const hourReservations = byHour.get(hour) ?? []
                          const level = densityLevel(
                            hourReservations.length,
                            Math.max(...hoursRanked.map((h) => h.count), 1),
                          )
                          return (
                            <div
                              key={hour}
                              className={cn(
                                'relative grid grid-cols-[88px_1fr] border-b border-outline-variant/20 min-h-[72px]',
                                hourReservations.length > 0 && densityCellClass[level],
                              )}
                            >
                              {anchorDate === today && hour === now.getHours() && (
                                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-2">
                                  <span className="ms-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-on-primary">
                                    {t.calendar.now}
                                  </span>
                                  <span className="h-0.5 flex-1 bg-primary" />
                                </div>
                              )}
                              <div className="flex flex-col justify-center gap-1 border-e border-outline-variant/20 p-3">
                                <span className="text-xs font-semibold text-on-surface-variant">
                                  {formatHour(hour, locale)}
                                </span>
                                {hourReservations.length > 0 && (
                                  <span className="text-[11px] font-medium text-primary tabular-nums">
                                    <Num>{hourReservations.length}</Num>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 p-2">
                                {hourReservations.length === 0 && !usingFallback && (
                                  <button
                                    type="button"
                                    onClick={() => openNewBookingAt(hour)}
                                    aria-label={t.calendar.newBookingAt.replace(
                                      '{time}',
                                      formatHour(hour, locale),
                                    )}
                                    className="group flex min-h-14 w-full items-center justify-center gap-1 rounded-xl border border-dashed border-transparent text-label-md text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:border-primary/40"
                                  >
                                    <MaterialIcon
                                      name="add"
                                      size={18}
                                      className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                                    />
                                    <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                      {t.reservations.board.newBooking}
                                    </span>
                                  </button>
                                )}
                                {hourReservations.slice(0, 4).map((reservation) => (
                                  <div key={reservation.reservationId} className="w-full max-w-sm">
                                    <BookingChip
                                      reservation={reservation}
                                      locale={locale}
                                      t={t}
                                      onOpen={() =>
                                        openReservation(reservation.reservationId)
                                      }
                                    />
                                  </div>
                                ))}
                                {hourReservations.length > 4 && (
                                  <p className="text-label-sm font-medium text-primary">
                                    +<Num>{hourReservations.length - 4}</Num> {t.calendar.more}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {view === 'weekly' && (
              <>
                <h2 className="text-lg font-semibold text-on-surface">{rangeLabel}</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                  {weekDays.map((day) => {
                    const reservations = byDay.get(day) ?? []
                    const count = countOn(day)
                    const level = densityLevel(count, maxDayCount)
                    const isToday = day === today
                    const isSelected = day === anchorDate
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => openDay(day)}
                        className={cn(
                          'flex min-h-[180px] flex-col rounded-2xl border p-3 text-start transition-colors hover:border-primary/40',
                          densityCellClass[level],
                          isSelected && 'ring-2 ring-primary/50',
                          isToday && 'outline outline-1 outline-offset-1 outline-tertiary/50',
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                              {formatDateLabel(day, locale, { weekday: 'short' })}
                            </p>
                            <p className="text-lg font-bold text-on-surface">
                              {formatDateLabel(day, locale, { day: 'numeric' })}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                              count > 0
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-variant text-on-surface-variant',
                            )}
                          >
                            <Num>{count}</Num>
                          </span>
                        </div>
                        <div className="mt-auto space-y-1.5">
                          {reservations.slice(0, 3).map((reservation) => (
                            <div
                              key={reservation.reservationId}
                              className="rounded-lg bg-surface-container-lowest/80 px-2 py-1 text-[11px] text-on-surface"
                            >
                              <span className="font-semibold">
                                {formatTime(reservation.reservationStartTime, locale)}
                              </span>
                              <span className="text-on-surface-variant">
                                {' '}
                                · {reservation.guests} {t.calendar.guests}
                              </span>
                            </div>
                          ))}
                          {count > 3 && (
                            <p className="text-[11px] font-medium text-primary">
                              +{count - 3} {t.calendar.more}
                            </p>
                          )}
                          {count === 0 && (
                            <p className="text-[11px] text-on-surface-variant">
                              {t.calendar.noBookings}
                            </p>
                          )}
                          {reservations.length === 0 && count > 0 && (
                            <p className="text-[11px] font-medium text-primary">
                              <Num>{count}</Num> {t.calendar.bookingsCount}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {view === 'monthly' && (
              <>
                <h2 className="text-lg font-semibold text-on-surface">{rangeLabel}</h2>
                <Card padding="none" className="overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-outline-variant/30 bg-surface-container-lowest">
                    {weekdayHeaders.map((day) => (
                      <div
                        key={`hdr-${day}`}
                        className="p-2 text-center text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant"
                      >
                        {formatDateLabel(day, locale, { weekday: 'short' })}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthCells.map((day) => {
                      const inMonth = day.startsWith(monthPrefix)
                      const count = countOn(day)
                      const level = inMonth ? densityLevel(count, maxDayCount) : 0
                      const isToday = day === today
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={!inMonth}
                          onClick={() => openDay(day)}
                          className={cn(
                            'relative min-h-[88px] border border-outline-variant/15 p-2 text-start transition-colors',
                            inMonth
                              ? cn(densityCellClass[level], 'hover:brightness-[0.98]')
                              : 'bg-surface-container/40 text-outline cursor-default',
                            isToday && inMonth && 'ring-1 ring-inset ring-tertiary/60',
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                inMonth ? 'text-on-surface' : 'text-outline',
                              )}
                            >
                              {formatDateLabel(day, locale, { day: 'numeric' })}
                            </span>
                            {inMonth && count > 0 && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary tabular-nums">
                                <Num>{count}</Num>
                              </span>
                            )}
                          </div>
                          {inMonth && count > 0 && (
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest/60">
                              <div
                                className={cn('h-full rounded-full', densityBarClass[level])}
                                style={{
                                  width: `${Math.max(18, (count / Math.max(maxDayCount, 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

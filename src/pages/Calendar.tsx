import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReservationDto, ReservationStatusDto } from '@/api/reservations'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useCalendarRangeReservationsQuery } from '@/hooks/useReservationQueries'
import {
  eachDateKey,
  endOfMonth,
  endOfWeekSunday,
  formatDateLabel,
  monthGridKeys,
  shiftDateKey,
  shiftMonth,
  startOfMonth,
  startOfWeekMonday,
  toDateKey,
} from '@/lib/calendarDates'
import { cn, getTodayISO } from '@/lib/utils'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 10)

type CalendarView = 'daily' | 'weekly' | 'monthly'

function hourOfReservation(reservation: ReservationDto): number {
  const start = new Date(reservation.reservationStartTime)
  if (!Number.isNaN(start.getTime())) return start.getHours()
  const timePart = reservation.reservationStartTime.slice(11, 13)
  const parsed = Number.parseInt(timePart, 10)
  return Number.isFinite(parsed) ? parsed : -1
}

function formatTime(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour > 12) return `${hour - 12} PM`
  return `${hour} AM`
}

function reservationStatusLabel(
  status: ReservationStatusDto,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (status in t.status) {
    return t.status[status as keyof typeof t.status]
  }
  return status
}

function dayKeyOf(reservation: ReservationDto): string {
  return reservation.reservationDate.slice(0, 10)
}

function sortByStartTime(a: ReservationDto, b: ReservationDto): number {
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
  reservation: ReservationDto
  locale: string
  t: ReturnType<typeof useLocale>['t']
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-start shadow-sm transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MaterialIcon name="event_seat" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-on-surface truncate">
          {formatTime(reservation.reservationStartTime, locale)}
          <span className="font-normal text-on-surface-variant">
            {' '}
            · {reservation.guests} {t.calendar.guests}
          </span>
        </span>
        <span className="block text-xs text-on-surface-variant truncate">
          {t.calendar.table} {reservation.tableId.slice(0, 8)}
        </span>
      </span>
      <StatusBadge
        type="custom"
        status={reservation.status}
        label={reservationStatusLabel(reservation.status, t)}
      />
    </button>
  )
}

export function CalendarPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const today = getTodayISO()
  const [view, setView] = useState<CalendarView>('daily')
  const [anchorDate, setAnchorDate] = useState(() => toDateKey(new Date()))

  const range = useMemo(() => {
    if (view === 'daily') {
      return { from: anchorDate, to: anchorDate }
    }
    if (view === 'weekly') {
      return {
        from: startOfWeekMonday(anchorDate),
        to: endOfWeekSunday(anchorDate),
      }
    }
    return {
      from: startOfMonth(anchorDate),
      to: endOfMonth(anchorDate),
    }
  }, [anchorDate, view])

  const rangeQuery = useCalendarRangeReservationsQuery(range.from, range.to, true)

  const byDay = useMemo(() => {
    const map = new Map<string, ReservationDto[]>()
    for (const reservation of rangeQuery.data ?? []) {
      const key = dayKeyOf(reservation)
      const list = map.get(key) ?? []
      list.push(reservation)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort(sortByStartTime)
    }
    return map
  }, [rangeQuery.data])

  const periodDays = useMemo(
    () => eachDateKey(range.from, range.to),
    [range.from, range.to],
  )

  const maxDayCount = useMemo(() => {
    let max = 0
    for (const day of periodDays) {
      max = Math.max(max, byDay.get(day)?.length ?? 0)
    }
    return max
  }, [byDay, periodDays])

  const daysByBookingCount = useMemo(() => {
    return [...periodDays]
      .map((day) => ({
        day,
        count: byDay.get(day)?.length ?? 0,
        reservations: byDay.get(day) ?? [],
      }))
      .sort((a, b) => b.count - a.count || a.day.localeCompare(b.day))
  }, [byDay, periodDays])

  const totalBookings = rangeQuery.data?.length ?? 0

  const dayReservations = byDay.get(anchorDate) ?? []

  const byHour = useMemo(() => {
    const map = new Map<number, ReservationDto[]>()
    for (const hour of HOURS) map.set(hour, [])
    for (const reservation of dayReservations) {
      const hour = hourOfReservation(reservation)
      if (!map.has(hour)) map.set(hour, [])
      map.get(hour)!.push(reservation)
    }
    for (const list of map.values()) {
      list.sort(sortByStartTime)
    }
    return map
  }, [dayReservations])

  const hoursRanked = useMemo(() => {
    const hours = [...byHour.entries()]
      .map(([hour, reservations]) => ({ hour, reservations, count: reservations.length }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.hour - b.hour)
    return hours
  }, [byHour])

  const hoursChronological = useMemo(() => {
    const extra = [...byHour.keys()].filter((h) => h >= 0 && !HOURS.includes(h))
    return [...HOURS, ...extra].sort((a, b) => a - b)
  }, [byHour])

  const weekDays = useMemo(
    () => eachDateKey(startOfWeekMonday(anchorDate), endOfWeekSunday(anchorDate)),
    [anchorDate],
  )

  const weekdayHeaders = useMemo(() => {
    const start = startOfWeekMonday(today)
    return eachDateKey(start, endOfWeekSunday(start))
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
            <Button variant="outline" size="icon" aria-label="Previous" onClick={goPrev}>
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
            <Button variant="outline" size="icon" aria-label="Next" onClick={goNext}>
              <MaterialIcon name="chevron_right" size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchorDate(today)}>
              {t.common.today}
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant/25 bg-gradient-to-br from-primary/10 via-surface-container-low to-surface-container-lowest p-4">
          <p className="text-label-sm text-on-surface-variant">{t.calendar.periodBookings}</p>
          <p className="mt-1 text-2xl font-bold text-on-surface tabular-nums">
            <Num>{totalBookings}</Num>
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
          <p className="text-label-sm text-on-surface-variant">{t.calendar.busiestDay}</p>
          <p className="mt-1 text-body-lg font-semibold text-on-surface">
            {daysByBookingCount[0] && daysByBookingCount[0].count > 0
              ? formatDateLabel(daysByBookingCount[0].day, locale, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : t.calendar.noneYet}
          </p>
        </div>
        <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
          <p className="text-label-sm text-on-surface-variant">{t.calendar.ownershipNoteShort}</p>
          <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2">
            {t.calendar.ownershipNote}
          </p>
        </div>
      </div>

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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-4">
            {view === 'daily' && (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-on-surface">{rangeLabel}</h2>
                    <p className="text-body-sm text-on-surface-variant">
                      <Num>{dayReservations.length}</Num> {t.calendar.bookingsCount}
                    </p>
                  </div>
                </div>

                {dayReservations.length === 0 ? (
                  <EmptyState
                    icon="event_busy"
                    title={t.calendar.emptyTitle}
                    description={t.calendar.emptyBody}
                  />
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
                                'grid grid-cols-[88px_1fr] border-b border-outline-variant/20 min-h-[72px]',
                                hourReservations.length > 0 && densityCellClass[level],
                              )}
                            >
                              <div className="flex flex-col justify-center gap-1 border-e border-outline-variant/20 p-3">
                                <span className="text-xs font-semibold text-on-surface-variant">
                                  {formatHourLabel(hour)}
                                </span>
                                {hourReservations.length > 0 && (
                                  <span className="text-[11px] font-medium text-primary tabular-nums">
                                    <Num>{hourReservations.length}</Num>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 p-2">
                                {hourReservations.map((reservation) => (
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
                    const count = reservations.length
                    const level = densityLevel(count, maxDayCount)
                    const isToday = day === today
                    const isSelected = day === anchorDate
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => openDay(day)}
                        className={cn(
                          'flex min-h-[180px] flex-col rounded-2xl border p-3 text-start transition-all hover:-translate-y-0.5 hover:shadow-md',
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
                      const count = byDay.get(day)?.length ?? 0
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

          <aside className="space-y-4">
            <Card className="sticky top-4">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MaterialIcon name="analytics" size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    {t.calendar.rankedByBookings}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {t.calendar.rankedHint}
                  </p>
                </div>
              </div>

              {daysByBookingCount.every((d) => d.count === 0) ? (
                <p className="text-sm text-on-surface-variant">{t.calendar.noneYet}</p>
              ) : (
                <ul className="space-y-2">
                  {daysByBookingCount
                    .filter((d) => d.count > 0)
                    .slice(0, view === 'monthly' ? 10 : 7)
                    .map((row, index) => {
                      const level = densityLevel(row.count, maxDayCount)
                      return (
                        <li key={row.day}>
                          <button
                            type="button"
                            onClick={() => openDay(row.day)}
                            className="flex w-full items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-start transition-colors hover:border-primary/30"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-on-surface">
                                {formatDateLabel(row.day, locale, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-container">
                                <span
                                  className={cn('block h-full rounded-full', densityBarClass[level])}
                                  style={{
                                    width: `${(row.count / Math.max(maxDayCount, 1)) * 100}%`,
                                  }}
                                />
                              </span>
                            </span>
                            <span className="text-sm font-bold tabular-nums text-primary">
                              <Num>{row.count}</Num>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                </ul>
              )}

              {view === 'daily' && hoursRanked.length > 0 && (
                <div className="mt-5 border-t border-outline-variant/20 pt-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {t.calendar.busiestHours}
                  </h4>
                  <ul className="space-y-1.5">
                    {hoursRanked.slice(0, 5).map((row) => (
                      <li
                        key={row.hour}
                        className="flex items-center justify-between rounded-lg bg-surface-container px-2.5 py-1.5 text-sm"
                      >
                        <span className="font-medium text-on-surface">
                          {formatHourLabel(row.hour)}
                        </span>
                        <span className="font-bold tabular-nums text-primary">
                          <Num>{row.count}</Num>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}
    </div>
  )
}

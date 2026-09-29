import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ReservationSourceDto, ReservationStatusDto } from '@/api/reservations'
import { ReservationActions } from '@/components/reservations/ReservationActions'
import { ReservationCreatePanel } from '@/components/reservations/ReservationCreatePanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { MaterialIcon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { Input, Select } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useCalendarRangeReservationsQuery } from '@/hooks/useReservationQueries'
import {
  useReservationSummaryQuery,
  useReservationTrendsQuery,
} from '@/hooks/useAnalyticsQueries'
import { formatDateLabel, shiftDateKey } from '@/lib/calendarDates'
import { extractStatusBreakdown, extractTrendSeries } from '@/lib/analyticsPayload'
import type { ReservationView } from '@/lib/reservationView'
import { formatTime } from '@/lib/format'
import { reservationStatusLabel } from '@/lib/statusLabel'
import { cn, getTodayISO } from '@/lib/utils'

const STATUS_OPTIONS: ReservationStatusDto[] = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
  'Expired',
  'NoShow',
]

function sourceLabel(
  source: ReservationSourceDto,
  t: ReturnType<typeof useLocale>['t'],
): string {
  return t.reservations.sources[source] ?? source
}

function matchesSearch(reservation: ReservationView, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    reservation.customerName ?? '',
    reservation.customerPhone ?? '',
    reservation.tableNumber ?? '',
    reservation.tableId,
    reservation.notes ?? '',
    reservation.reservationId,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

type WindowFilter = 'today' | 'upcoming' | 'all'
type Density = 'comfortable' | 'compact'

function ReservationCard({
  reservation,
  locale,
  t,
  compact,
  onOpen,
}: {
  reservation: ReservationView
  locale: string
  t: ReturnType<typeof useLocale>['t']
  compact: boolean
  onOpen: () => void
}) {
  const tableLabel = reservation.tableNumber
    ? `${t.reservations.table} ${reservation.tableNumber}`
    : reservation.tableId
      ? `${t.reservations.table} ${reservation.tableId.slice(0, 8)}`
      : null

  return (
    <article
      className={cn(
        'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-4 text-start"
      >
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 px-2 py-3 text-primary">
          <span className="text-sm font-bold tabular-nums">
            {formatTime(reservation.reservationStartTime, locale)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-body-lg font-semibold text-on-surface truncate">
              {reservation.customerName ?? t.reservations.board.guest}
            </p>
            <StatusBadge
              type="custom"
              status={reservation.status}
              label={reservationStatusLabel(reservation.status, t.status)}
            />
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {tableLabel}
            {tableLabel ? ' · ' : ''}
            <Num>{reservation.guests}</Num> {t.calendar.guests}
            {' · '}
            {sourceLabel(reservation.source, t)}
          </p>
          {!compact && reservation.customerPhone && (
            <p className="mt-1 text-label-sm text-on-surface" dir="ltr">
              {reservation.customerPhone}
            </p>
          )}
          {!compact && reservation.notes && (
            <p className="mt-2 text-body-sm text-on-surface line-clamp-2">{reservation.notes}</p>
          )}
        </div>
      </button>
      <div className="mt-4 border-t border-outline-variant/20 pt-3">
        <ReservationActions
          reservationId={reservation.reservationId}
          status={reservation.status}
          compact
        />
      </div>
    </article>
  )
}

/**
 * Staff reservations hub — branch date-window list, with owner-visible
 * day counts when the employee inbox returns 403.
 */
export function ReservationsPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const {
    selectedBranch,
    status: scopeStatus,
    formatBranchLabel,
  } = useRestaurantScope()

  const [statusFilter, setStatusFilter] = useState<ReservationStatusDto | ''>('')
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('today')
  const [density, setDensity] = useState<Density>('comfortable')
  const [searchText, setSearchText] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const today = getTodayISO()
  const dateFrom = shiftDateKey(today, -30)
  const dateTo = shiftDateKey(today, 60)

  const listQuery = useCalendarRangeReservationsQuery(
    dateFrom,
    dateTo,
    scopeStatus === 'ready',
  )
  const usingFallback = listQuery.data?.source === 'ownership-fallback'
  const summaryQuery = useReservationSummaryQuery(dateFrom, dateTo, usingFallback)
  const trendsQuery = useReservationTrendsQuery(dateFrom, dateTo, usingFallback)

  const rows = listQuery.data?.items
  const rowCount = rows?.length ?? 0

  const filteredItems = useMemo(() => {
    return (rows ?? [])
      .filter((reservation) => {
        const day = reservation.reservationDate.slice(0, 10)
        if (windowFilter === 'today' && day !== today) return false
        if (
          windowFilter === 'upcoming' &&
          (day < today || (reservation.status !== 'Pending' && reservation.status !== 'Approved'))
        ) {
          return false
        }
        if (statusFilter && reservation.status !== statusFilter) return false
        return matchesSearch(reservation, searchText)
      })
      .sort((a, b) => a.reservationStartTime.localeCompare(b.reservationStartTime))
  }, [rows, searchText, statusFilter, today, windowFilter])

  const groups = useMemo(() => {
    const map = new Map<string, ReservationView[]>()
    for (const reservation of filteredItems) {
      const day = reservation.reservationDate.slice(0, 10)
      const list = map.get(day) ?? []
      list.push(reservation)
      map.set(day, list)
    }
    return [...map.entries()]
  }, [filteredItems])

  const serviceDays = useMemo(() => {
    return extractTrendSeries(trendsQuery.data ?? {})
      .serviceDay.filter((point) => point.value > 0)
      .map((point) => ({ day: point.label.slice(0, 10), count: point.value }))
      .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.day))
      .sort((a, b) => a.day.localeCompare(b.day))
  }, [trendsQuery.data])

  const statusCounts = useMemo(() => {
    return extractStatusBreakdown(summaryQuery.data ?? {}).filter((point) => point.value > 0)
  }, [summaryQuery.data])

  const branchTotal = serviceDays.reduce((sum, day) => sum + day.count, 0)
  const showServiceDays =
    usingFallback &&
    serviceDays.length > 0 &&
    rowCount === 0 &&
    windowFilter === 'all' &&
    !statusFilter &&
    !searchText.trim()

  return (
    <div>
      <PageHeader
        title={t.reservations.title}
        subtitle={t.reservations.subtitle}
        actions={
          <Button
            type="button"
            variant={createOpen ? 'outline' : 'primary'}
            onClick={() => setCreateOpen((open) => !open)}
          >
            <MaterialIcon name={createOpen ? 'close' : 'add'} size={18} />
            {createOpen ? t.reservations.board.hideBooking : t.reservations.board.newBooking}
          </Button>
        }
      />

      {selectedBranch && (
        <p className="mb-4 text-label-sm text-on-surface-variant">
          {formatBranchLabel(selectedBranch)}
        </p>
      )}

      {usingFallback && (
        <div className="mb-6 rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4">
          <p className="text-body-sm text-on-surface">{t.reservations.board.fallbackNote}</p>
          {statusCounts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {statusCounts.map((point) => (
                <span
                  key={point.label}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-1 text-label-sm text-on-surface"
                >
                  {reservationStatusLabel(point.label, t.status)}
                  <Num>{point.value}</Num>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {createOpen && (scopeStatus === 'ready' || scopeStatus === 'empty_branches') && (
        <div className="mb-8">
          <ReservationCreatePanel />
        </div>
      )}

      {listQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          {t.common.loading}
        </p>
      )}

      {listQuery.isError && (
        <EmptyState
          icon="error"
          title={t.reservations.list.errorTitle}
          description={t.reservations.list.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void listQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {listQuery.isSuccess && (
        <>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t.reservations.list.filterStatus}>
            {(
              [
                ['today', t.reservations.list.windowToday],
                ['upcoming', t.reservations.list.windowUpcoming],
                ['all', t.reservations.list.windowAll],
              ] as const
            ).map(([key, label]) => (
              <FilterChip
                key={key}
                label={label}
                active={windowFilter === key}
                onClick={() => setWindowFilter(key)}
              />
            ))}
          </div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              className="sm:max-w-xs"
              placeholder={t.reservations.list.searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              icon={<MaterialIcon name="search" size={18} />}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReservationStatusDto | '')}
              aria-label={t.reservations.list.filterStatus}
              className="sm:max-w-xs"
            >
              <option value="">{t.common.all}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {reservationStatusLabel(status, t.status)}
                </option>
              ))}
            </Select>
            <div className="flex gap-2" role="group" aria-label={t.reservations.list.density}>
              <FilterChip
                label={t.reservations.list.densityComfortable}
                active={density === 'comfortable'}
                onClick={() => setDensity('comfortable')}
              />
              <FilterChip
                label={t.reservations.list.densityCompact}
                active={density === 'compact'}
                onClick={() => setDensity('compact')}
              />
            </div>
            <p className="text-label-sm text-on-surface-variant sm:ms-auto">
              <Num>{usingFallback && windowFilter === 'all' ? Math.max(rowCount, branchTotal) : filteredItems.length}</Num>{' '}
              {t.reservations.board.bookings}
            </p>
          </div>

          {groups.length > 0 && (
            <div className="space-y-8">
              {usingFallback && (
                <h2 className="text-label-lg font-semibold text-on-surface">
                  {t.reservations.board.accountList}
                </h2>
              )}
              {groups.map(([day, reservations]) => (
                <section key={day}>
                  <div className="mb-3 flex items-baseline gap-3">
                    <h2 className="text-label-lg font-semibold text-on-surface">
                      {formatDateLabel(day, locale, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h2>
                    <span className="text-label-sm text-on-surface-variant tabular-nums">
                      <Num>{reservations.length}</Num>
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {reservations.map((reservation) => (
                      <ReservationCard
                        key={reservation.reservationId}
                        reservation={reservation}
                        locale={locale}
                        t={t}
                        compact={density === 'compact'}
                        onOpen={() => navigate(`/app/reservations/${reservation.reservationId}`)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {showServiceDays && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {serviceDays.map((day) => (
                <Link
                  key={day.day}
                  to={`/app/calendar?date=${day.day}`}
                  className={cn(
                    'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4',
                    'transition-all hover:border-primary/40 hover:shadow-md',
                  )}
                >
                  <p className="text-label-sm text-on-surface-variant">
                    {formatDateLabel(day.day, locale, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-on-surface tabular-nums">
                    <Num>{day.count}</Num>
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {t.reservations.board.dayBookings}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {groups.length === 0 && !showServiceDays && (
            <EmptyState
              title={
                rowCount === 0
                  ? t.reservations.board.emptyTitle
                  : t.reservations.list.emptyFiltered
              }
              description={
                rowCount === 0
                  ? t.reservations.board.emptyBody
                  : t.reservations.list.emptyFiltered
              }
              icon="event_busy"
            />
          )}
        </>
      )}
    </div>
  )
}

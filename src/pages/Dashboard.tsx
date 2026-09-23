import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Num } from '@/components/ui/Num'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaterialIcon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SkeletonStats, SkeletonText } from '@/components/ui/Skeleton'
import { HomeShortcuts } from '@/components/dashboard/HomeShortcuts'
import { LiveServiceBar } from '@/components/layout/LiveServiceBar'
import { useLocale } from '@/context/LocaleContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import type { ReservationDto, ReservationStatusDto } from '@/api/reservations'
import {
  useReservationSummaryQuery,
  useOrgReservationSummaryQuery,
} from '@/hooks/useAnalyticsQueries'
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries'
import { useMyReservationsQuery } from '@/hooks/useReservationQueries'
import { extractReservationSummaryStats, formatCount, formatRate } from '@/lib/analyticsPayload'
import { defaultAnalyticsRange } from '@/lib/dateRange'
import { getTodayISO } from '@/lib/utils'

function reservationStatusLabel(
  status: ReservationStatusDto,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (status in t.status) {
    return t.status[status as keyof typeof t.status]
  }
  return status
}

function formatReservationTime(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date)
}

/** "in 25 min" reads faster than a clock time when staff are triaging arrivals. */
function formatCountdown(iso: string, locale: string): string | null {
  const start = new Date(iso).getTime()
  if (Number.isNaN(start)) return null
  const minutes = Math.round((start - Date.now()) / 60000)
  if (minutes < 0 || minutes > 240) return null
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  return minutes >= 60
    ? rtf.format(Math.round(minutes / 60), 'hour')
    : rtf.format(minutes, 'minute')
}

/** Backend ids are UUIDs; a short suffix is enough to match against a ticket. */
function shortRef(id: string): string {
  return id.slice(0, 6).toUpperCase()
}

function isUpcomingReservation(reservation: ReservationDto, windowMinutes = 90): boolean {
  const start = new Date(reservation.reservationStartTime)
  const diffMin = (start.getTime() - Date.now()) / 60000
  return (
    diffMin >= 0 &&
    diffMin <= windowMinutes &&
    (reservation.status === 'Approved' || reservation.status === 'Pending')
  )
}

/**
 * Time leads because it is what staff scan for; identity and status follow.
 * The whole row is a link so the target area is generous on touch.
 */
function ArrivalRow({
  reservation,
  locale,
  t,
}: {
  reservation: ReservationDto
  locale: string
  t: ReturnType<typeof useLocale>['t']
}) {
  const countdown = formatCountdown(reservation.reservationStartTime, locale)

  return (
    <Link
      to={`/app/reservations/${reservation.reservationId}`}
      className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-[var(--duration-fast)] hover:bg-surface-container-low/70"
    >
      <div className="w-16 shrink-0">
        <p className="text-label-lg text-on-surface nums">
          <Num>{formatReservationTime(reservation.reservationStartTime, locale)}</Num>
        </p>
        {countdown && <p className="text-body-sm text-on-surface-variant">{countdown}</p>}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body-md text-on-surface truncate">
          <Num>{reservation.guests}</Num> {t.common.guests}
        </p>
        <p className="text-body-sm text-on-surface-variant truncate">
          {t.common.reference} {shortRef(reservation.reservationId)}
        </p>
      </div>

      <StatusBadge
        status={reservation.status}
        label={reservationStatusLabel(reservation.status, t)}
      />
      <MaterialIcon
        name="chevron_right"
        size={18}
        className="shrink-0 text-outline rtl:rotate-180"
      />
    </Link>
  )
}

export function DashboardPage() {
  const { t, locale } = useLocale()
  const { user } = useAuth()
  const { status: scopeStatus } = useRestaurantScope()

  const today = getTodayISO()
  const monthRange = defaultAnalyticsRange()

  const todaySummaryQuery = useReservationSummaryQuery(today, today)
  const monthSummaryQuery = useReservationSummaryQuery(monthRange.from, monthRange.to)
  const orgSummaryQuery = useOrgReservationSummaryQuery(
    monthRange.from,
    monthRange.to,
    scopeStatus !== 'ready',
  )

  const summaryQuery = scopeStatus === 'ready' ? todaySummaryQuery : orgSummaryQuery
  const todayStats = extractReservationSummaryStats(summaryQuery.data ?? {})
  const monthStats = extractReservationSummaryStats(
    (scopeStatus === 'ready' ? monthSummaryQuery.data : orgSummaryQuery.data) ?? {},
  )
  const summaryStats = {
    total: todayStats.total,
    noShowRate: todayStats.noShowRate ?? monthStats.noShowRate,
    averagePartySize: todayStats.averagePartySize ?? monthStats.averagePartySize,
  }

  const unreadQuery = useUnreadNotificationCount()
  const reservationsQuery = useMyReservationsQuery(1, 20)
  const reservationItems = reservationsQuery.data?.items

  const arrivingSoon = useMemo(
    () =>
      (reservationItems ?? [])
        .filter((r) => isUpcomingReservation(r))
        .sort(
          (a, b) =>
            new Date(a.reservationStartTime).getTime() -
            new Date(b.reservationStartTime).getTime(),
        ),
    [reservationItems],
  )

  const pending = useMemo(
    () => (reservationItems ?? []).filter((r) => r.status === 'Pending'),
    [reservationItems],
  )

  const upcomingCount = useMemo(
    () =>
      (reservationItems ?? []).filter(
        (r) => new Date(r.reservationStartTime).getTime() >= Date.now(),
      ).length,
    [reservationItems],
  )

  const unreadCount = unreadQuery.data ?? 0
  const noShowHigh =
    typeof summaryStats.noShowRate === 'number' && summaryStats.noShowRate >= 0.1

  const statsLoading =
    summaryQuery.isLoading || (scopeStatus === 'ready' && monthSummaryQuery.isLoading)
  const summaryError =
    summaryQuery.isError || (scopeStatus === 'ready' && monthSummaryQuery.isError)

  const firstName = user?.displayName?.split(' ')[0] ?? ''

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t.ops.operationsTitle}
        subtitle={
          firstName
            ? `${t.login.title}, ${firstName}. ${t.dashboard.subtitle}`
            : t.dashboard.subtitle
        }
        actions={
          <>
            <Link to="/app/reservations">
              <Button variant="outline">
                <MaterialIcon name="event" size={16} />
                {t.nav.reservations}
              </Button>
            </Link>
            <Link to="/app/walk-in">
              <Button variant="primary">
                <MaterialIcon name="add" size={16} />
                {t.walkIn.title}
              </Button>
            </Link>
          </>
        }
      />

      <LiveServiceBar />
      <HomeShortcuts />

      {statsLoading ? (
        <SkeletonStats count={4} label={t.common.loading} />
      ) : summaryError ? (
        <Card padding="none">
          <ErrorState
            title={t.dashboard.summaryErrorTitle}
            description={t.dashboard.summaryErrorBody}
            retryLabel={t.common.retry}
            onRetry={() => {
              void summaryQuery.refetch()
              void monthSummaryQuery.refetch()
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            emphasis
            title={t.dashboard.todayReservations}
            value={formatCount(summaryStats.total)}
            icon="calendar_today"
            variant="primary"
            subtitle={t.dashboard.liveSummary}
          />
          <StatCard
            title={t.dashboard.upcomingReservations}
            value={upcomingCount}
            icon="login"
            variant="success"
            subtitle={t.ops.arrivingSoon}
          />
          <StatCard
            title={t.dashboard.noShowRate}
            value={formatRate(summaryStats.noShowRate)}
            icon="trending_up"
            variant={noShowHigh ? 'danger' : 'default'}
            subtitle={t.reports.noShowRate}
          />
          <StatCard
            title={t.dashboard.unreadNotifications}
            value={unreadCount}
            icon="notifications"
            variant={unreadCount > 0 ? 'warning' : 'default'}
            subtitle={unreadCount > 0 ? t.dashboard.unreadHint : t.header.notifications}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card padding="md">
            <CardHeader>
              <CardTitle>
                <MaterialIcon name="directions_walk" size={17} className="text-primary" />
                {t.ops.arrivingSoon}
                {arrivingSoon.length > 0 && (
                  <Badge tone="neutral" size="sm">
                    <Num>{arrivingSoon.length}</Num>
                  </Badge>
                )}
              </CardTitle>
              <Link
                to="/app/reservations"
                className="text-label-md text-primary hover:underline underline-offset-2"
              >
                {t.common.viewAll}
              </Link>
            </CardHeader>

            <div className="-mx-5 -mb-5">
              {reservationsQuery.isLoading ? (
                <SkeletonText lines={4} label={t.common.loading} className="px-5 pb-5" />
              ) : arrivingSoon.length === 0 ? (
                <EmptyState
                  icon="event_available"
                  title={t.ops.noArrivals}
                  description={t.dashboard.noArrivalsHint}
                />
              ) : (
                <div className="divide-y divide-outline-variant/40">
                  {arrivingSoon.slice(0, 5).map((r) => (
                    <ArrivalRow key={r.reservationId} reservation={r} locale={locale} t={t} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card padding="md">
            <CardHeader>
              <CardTitle>
                <MaterialIcon name="pending_actions" size={17} className="text-primary" />
                {t.ops.needsAction}
              </CardTitle>
              <Link
                to="/app/notifications"
                className="text-label-md text-primary hover:underline underline-offset-2"
              >
                {t.common.viewAll}
              </Link>
            </CardHeader>

            {pending.length === 0 && unreadCount === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-success-border bg-success-subtle px-4 py-3">
                <MaterialIcon name="check_circle" size={18} className="text-on-success-subtle" />
                <p className="text-body-md text-on-success-subtle">{t.ops.allClear}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unreadCount > 0 && (
                  <Link
                    to="/app/notifications"
                    className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/60 px-4 py-3 transition-colors duration-[var(--duration-fast)] hover:border-primary-border hover:bg-surface-container-low/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-subtle text-on-warning-subtle">
                        <MaterialIcon name="notifications" size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-label-lg text-on-surface truncate">
                          {t.dashboard.unreadNotifications}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          <Num>{unreadCount}</Num> {t.dashboard.unreadHint}
                        </p>
                      </div>
                    </div>
                    <MaterialIcon
                      name="chevron_right"
                      size={18}
                      className="shrink-0 text-outline rtl:rotate-180"
                    />
                  </Link>
                )}

                {pending.slice(0, 3).map((r) => (
                  <Link
                    key={r.reservationId}
                    to={`/app/reservations/${r.reservationId}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant/60 px-4 py-3 transition-colors duration-[var(--duration-fast)] hover:border-primary-border hover:bg-surface-container-low/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-container-high">
                        <span className="text-label-md text-on-surface nums leading-none">
                          <Num>{r.guests}</Num>
                        </span>
                        <span className="text-[10px] text-on-surface-variant leading-none mt-0.5">
                          {t.common.guests}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-label-lg text-on-surface nums">
                          <Num>{formatReservationTime(r.reservationStartTime, locale)}</Num>
                        </p>
                        <p className="text-body-sm text-on-surface-variant truncate">
                          {t.common.reference} {shortRef(r.reservationId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={r.status} label={reservationStatusLabel(r.status, t)} />
                      <MaterialIcon
                        name="chevron_right"
                        size={18}
                        className="text-outline rtl:rotate-180"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card padding="md">
            <CardHeader>
              <CardTitle>
                <MaterialIcon name="bar_chart" size={17} className="text-primary" />
                {t.reports.title}
              </CardTitle>
              <Link
                to="/app/reports"
                className="text-label-md text-primary hover:underline underline-offset-2"
              >
                {t.common.view}
              </Link>
            </CardHeader>

            <dl className="divide-y divide-outline-variant/40">
              <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                <dt className="text-body-md text-on-surface-variant">
                  {t.reports.totalReservations}
                </dt>
                <dd className="text-label-lg text-on-surface nums">
                  <Num>{formatCount(monthStats.total ?? summaryStats.total)}</Num>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-body-md text-on-surface-variant">{t.reports.noShowRate}</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-label-lg text-on-surface nums">
                    <Num>{formatRate(summaryStats.noShowRate)}</Num>
                  </span>
                  {noShowHigh && (
                    <Badge tone="danger" size="sm">
                      {t.dashboard.noShowHigh}
                    </Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-body-md text-on-surface-variant">
                  {t.dashboard.upcomingReservations}
                </dt>
                <dd className="text-label-lg text-on-surface nums">
                  <Num>{upcomingCount}</Num>
                </dd>
              </div>
              {summaryStats.averagePartySize !== null && (
                <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                  <dt className="text-body-md text-on-surface-variant">
                    {t.reports.averagePartySize}
                  </dt>
                  <dd className="text-label-lg text-on-surface nums">
                    <Num>{summaryStats.averagePartySize.toFixed(1)}</Num>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card padding="md">
            <CardHeader>
              <CardTitle>
                <MaterialIcon name="grid_view" size={17} className="text-primary" />
                {t.floorPlan.title}
              </CardTitle>
            </CardHeader>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              {t.dashboard.floorPlanHint}
            </p>
            <Link to="/app/floor-plan" className="mt-4 inline-block">
              <Button variant="outline">
                <MaterialIcon name="map" size={16} />
                {t.dashboard.floorPlanLink}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}

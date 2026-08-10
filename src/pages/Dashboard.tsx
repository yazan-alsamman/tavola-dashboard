import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Num } from '@/components/ui/Num'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaterialIcon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
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
import {
  extractReservationSummaryStats,
  formatCount,
  formatRate,
} from '@/lib/analyticsPayload'
import { defaultAnalyticsRange } from '@/lib/dateRange'
import { cn, getTodayISO } from '@/lib/utils'

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
  return new Intl.DateTimeFormat(locale, {
    timeStyle: 'short',
  }).format(date)
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

type Accent = 'info' | 'warning' | 'success' | 'danger'

const accentStyles: Record<
  Accent,
  { iconWell: string; value: string; border: string; chip: string }
> = {
  info: {
    iconWell: 'bg-info-light text-info',
    value: 'text-info',
    border: 'hover:border-info/35',
    chip: 'bg-info-light text-info',
  },
  warning: {
    iconWell: 'bg-warning-light text-warning',
    value: 'text-warning',
    border: 'hover:border-warning/40',
    chip: 'bg-warning-light text-warning',
  },
  success: {
    iconWell: 'bg-success-light text-success',
    value: 'text-success',
    border: 'hover:border-success/35',
    chip: 'bg-success-light text-success',
  },
  danger: {
    iconWell: 'bg-danger-light text-danger',
    value: 'text-danger',
    border: 'hover:border-danger/35',
    chip: 'bg-danger text-on-error',
  },
}

export function DashboardPage() {
  const { t, locale } = useLocale()
  const { user } = useAuth()
  const { status: scopeStatus } = useRestaurantScope()

  const today = getTodayISO()
  const monthRange = defaultAnalyticsRange()

  const todaySummaryQuery = useReservationSummaryQuery(today, today)
  const monthSummaryQuery = useReservationSummaryQuery(
    monthRange.from,
    monthRange.to,
  )
  const orgSummaryQuery = useOrgReservationSummaryQuery(
    monthRange.from,
    monthRange.to,
    scopeStatus !== 'ready',
  )

  const summaryQuery =
    scopeStatus === 'ready' ? todaySummaryQuery : orgSummaryQuery
  const todayStats = extractReservationSummaryStats(summaryQuery.data ?? {})
  const monthStats = extractReservationSummaryStats(
    (scopeStatus === 'ready' ? monthSummaryQuery.data : orgSummaryQuery.data) ??
      {},
  )
  const summaryStats = {
    total: todayStats.total,
    noShowRate: todayStats.noShowRate ?? monthStats.noShowRate,
    averagePartySize:
      todayStats.averagePartySize ?? monthStats.averagePartySize,
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
      (reservationItems ?? []).filter((r) => {
        const start = new Date(r.reservationStartTime)
        return start.getTime() >= Date.now()
      }).length,
    [reservationItems],
  )

  const unreadCount = unreadQuery.data ?? 0
  const noShowHigh =
    typeof summaryStats.noShowRate === 'number' && summaryStats.noShowRate >= 0.1

  const statCards: {
    title: string
    value: string | number
    icon: string
    hint: string
    accent: Accent
    alert?: boolean
  }[] = [
    {
      title: t.dashboard.todayReservations,
      value: formatCount(summaryStats.total),
      icon: 'calendar_today',
      hint: t.dashboard.liveSummary,
      accent: 'info',
    },
    {
      title: t.dashboard.noShowRate,
      value: formatRate(summaryStats.noShowRate),
      icon: 'trending_up',
      hint: t.reports.noShowRate,
      accent: noShowHigh ? 'danger' : 'warning',
    },
    {
      title: t.dashboard.upcomingReservations,
      value: upcomingCount,
      icon: 'login',
      hint: t.ops.arrivingSoon,
      accent: 'success',
    },
    {
      title: t.dashboard.unreadNotifications,
      value: unreadCount,
      icon: 'notifications',
      hint: t.header.notifications,
      accent: 'danger',
      alert: unreadCount > 0,
    },
  ]

  const isLoading =
    summaryQuery.isLoading ||
    (scopeStatus === 'ready' && monthSummaryQuery.isLoading) ||
    reservationsQuery.isLoading ||
    unreadQuery.isLoading

  const summaryError =
    summaryQuery.isError ||
    (scopeStatus === 'ready' && monthSummaryQuery.isError)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">{t.ops.operationsTitle}</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {t.login.title}, {user?.displayName?.split(' ')[0] ?? ''}. {t.dashboard.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/walk-in">
            <Button variant="secondary" size="md">
              <MaterialIcon name="add" size={18} /> {t.walkIn.title}
            </Button>
          </Link>
        </div>
      </div>

      <LiveServiceBar />
      <HomeShortcuts />

      {isLoading ? (
        <div className="flex min-h-[120px] items-center justify-center text-on-surface-variant">
          {t.common.loading}
        </div>
      ) : summaryError ? (
        <EmptyState
          icon="error"
          title={t.dashboard.summaryErrorTitle}
          description={t.dashboard.summaryErrorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => {
                void summaryQuery.refetch()
                void monthSummaryQuery.refetch()
              }}
            >
              {t.scope.retry}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const accent = accentStyles[card.accent]
            return (
              <div
                key={card.title}
                className={cn(
                  'bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between transition-colors',
                  accent.border,
                )}
              >
                <div className="flex justify-between items-start">
                  <div className={cn('p-2 rounded-lg', accent.iconWell)}>
                    <MaterialIcon name={card.icon} size={20} />
                  </div>
                  {card.alert ? (
                    <span className={cn('text-[10px] px-1.5 rounded-full font-semibold', accent.chip)}>
                      {card.hint}
                    </span>
                  ) : (
                    <span className="text-label-sm text-on-surface-variant">{card.hint}</span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-label-md text-on-surface-variant uppercase tracking-wider">
                    {card.title}
                  </p>
                  <h3 className={cn('text-display mt-1', accent.value)}>
                    <Num>{card.value}</Num>
                  </h3>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-info-light/40">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="directions_walk" className="text-info" />
                {t.ops.arrivingSoon}
              </h3>
              <Link
                to="/reservations"
                className="text-info text-label-md font-semibold hover:underline"
              >
                {t.common.viewAll}
              </Link>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {reservationsQuery.isLoading ? (
                <p className="text-body-sm text-on-surface-variant text-center py-8">
                  {t.common.loading}
                </p>
              ) : arrivingSoon.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-8">
                  {t.ops.noArrivals}
                </p>
              ) : (
                arrivingSoon.slice(0, 4).map((r) => (
                  <div
                    key={r.reservationId}
                    className="px-5 py-3 flex items-center justify-between hover:bg-info-light/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-info-light flex items-center justify-center text-info font-bold text-sm">
                        <MaterialIcon name="event" size={18} />
                      </div>
                      <div>
                        <p className="text-body-md font-bold text-on-surface">
                          {r.reservationId.slice(0, 8)}
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          {r.tableId.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-end">
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase">
                          {t.reservations.time}
                        </p>
                        <p className="text-body-md font-bold text-info">
                          <Num>
                            {formatReservationTime(r.reservationStartTime, locale)}
                          </Num>
                        </p>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase">
                          {t.reservations.guests}
                        </p>
                        <p className="text-body-md font-bold">
                          <Num>{r.guests}</Num>
                        </p>
                      </div>
                      <StatusBadge
                        status={r.status}
                        label={reservationStatusLabel(r.status, t)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-warning-light/50">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="notifications_active" className="text-warning" />
                {t.ops.needsAction}
              </h3>
              <Link
                to="/notifications"
                className="text-warning text-label-md font-semibold hover:underline"
              >
                {t.common.viewAll}
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {pending.length === 0 && unreadCount === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-light text-success">
                    <MaterialIcon name="check_circle" size={22} />
                  </span>
                  <p className="text-body-sm text-success font-medium">{t.ops.allClear}</p>
                </div>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <Link
                      to="/notifications"
                      className="p-4 rounded-lg border border-danger/20 bg-danger-light/40 shadow-sm flex items-center justify-between gap-4 hover:border-danger/40 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-danger-light flex items-center justify-center shrink-0 text-danger">
                          <MaterialIcon name="notifications" />
                        </div>
                        <div>
                          <span className="text-body-md font-bold">
                            {t.dashboard.unreadNotifications}
                          </span>
                          <p className="text-body-sm text-on-surface-variant">
                            <Num>{unreadCount}</Num> {t.dashboard.unreadHint}
                          </p>
                        </div>
                      </div>
                      <MaterialIcon name="chevron_right" className="text-danger" />
                    </Link>
                  )}
                  {pending.slice(0, 3).map((r) => (
                    <Link
                      key={r.reservationId}
                      to={`/reservations/${r.reservationId}`}
                      className="p-4 rounded-lg border border-warning/25 bg-warning-light/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-warning/45 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-warning-light flex flex-col items-center justify-center shrink-0">
                          <span className="font-bold text-warning text-sm">
                            <Num>{r.guests}</Num>
                          </span>
                          <span className="text-[9px] uppercase text-on-surface-variant">
                            {t.common.guests}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-md font-bold">
                              {r.reservationId.slice(0, 8)}
                            </span>
                            <StatusBadge
                              status={r.status}
                              label={reservationStatusLabel(r.status, t)}
                            />
                          </div>
                          <p className="text-body-sm text-on-surface-variant">
                            <Num>
                              {formatReservationTime(r.reservationStartTime, locale)}
                            </Num>
                            · <Num>{r.guests}</Num> {t.common.guests}
                          </p>
                        </div>
                      </div>
                      <MaterialIcon name="chevron_right" className="text-warning" />
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-success-light/40">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="grid_view" className="text-success" />
                {t.floorPlan.title}
              </h3>
              <Link to="/floor-plan" className="text-success text-label-md font-semibold hover:underline">
                {t.common.view}
              </Link>
            </div>
            <EmptyState
              icon="map"
              title={t.dashboard.floorPlanLink}
              description={t.dashboard.floorPlanHint}
              className="py-8"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="bar_chart" className="text-primary" />
                {t.reports.title}
              </h3>
              <Link to="/reports" className="text-primary text-label-md hover:underline">
                {t.common.view}
              </Link>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t.reports.totalReservations}</span>
                <span className="font-bold text-info">
                  <Num>{formatCount(monthStats.total ?? summaryStats.total)}</Num>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t.reports.noShowRate}</span>
                <span className={cn('font-bold', noShowHigh ? 'text-danger' : 'text-warning')}>
                  <Num>{formatRate(summaryStats.noShowRate)}</Num>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t.dashboard.upcomingReservations}</span>
                <span className="font-bold text-success">
                  <Num>{upcomingCount}</Num>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5">
            <div className="flex flex-wrap gap-3">
              <Link
                to="/waitlist"
                className="text-label-md text-warning font-semibold inline-flex items-center gap-1"
              >
                <MaterialIcon name="timer" size={16} />
                {t.waitlist.title}
              </Link>
              <Link
                to="/offers"
                className="text-label-md text-success font-semibold inline-flex items-center gap-1"
              >
                <MaterialIcon name="local_offer" size={16} />
                {t.nav.offers}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

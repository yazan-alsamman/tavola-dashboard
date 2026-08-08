import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { isApiError } from '@/api/errors'
import {
  useAnalyticsDateRange,
  useCustomerInsightsQuery,
  usePeakHoursQuery,
  useReservationSummaryQuery,
  useReservationTrendsQuery,
  useReviewsSummaryQuery,
  useWaitlistAnalyticsQuery,
} from '@/hooks/useAnalyticsQueries'
import {
  extractCustomerStats,
  extractPeakHoursSeries,
  extractReservationSummaryStats,
  extractReviewStats,
  extractStatusBreakdown,
  extractTrendSeries,
  extractWaitlistStats,
  formatCount,
  formatRate,
} from '@/lib/analyticsPayload'

const COLORS = ['#461599', '#5e35b1', '#6c45c0', '#ecdeee', '#7d5f9a', '#dc2626']

export function ReportsPage() {
  const { t } = useLocale()
  const { status: scopeStatus } = useRestaurantScope()
  const { from, to, setFrom, setTo } = useAnalyticsDateRange()

  const summaryQuery = useReservationSummaryQuery(from, to)
  const trendsQuery = useReservationTrendsQuery(from, to)
  const peakHoursQuery = usePeakHoursQuery(from, to)
  const customersQuery = useCustomerInsightsQuery(from, to)
  const waitlistQuery = useWaitlistAnalyticsQuery(from, to)
  const reviewsQuery = useReviewsSummaryQuery()

  const scopeLoading =
    scopeStatus === 'idle' || scopeStatus === 'loading'
  const scopeBlocked =
    scopeStatus === 'empty_restaurants' ||
    scopeStatus === 'forbidden' ||
    scopeStatus === 'error'

  const summaryStats = extractReservationSummaryStats(summaryQuery.data ?? {})
  const customerStats = extractCustomerStats(customersQuery.data ?? {})
  const reviewStats = extractReviewStats(reviewsQuery.data ?? {})
  const waitlistStats = extractWaitlistStats(waitlistQuery.data ?? {})

  const trendSeries = extractTrendSeries(trendsQuery.data ?? {})
  const trendChartData =
    trendSeries.serviceDay.length > 0
      ? trendSeries.serviceDay
      : trendSeries.bookingCreated

  const peakHoursData = extractPeakHoursSeries(peakHoursQuery.data ?? {})

  const statusBreakdown = extractStatusBreakdown(summaryQuery.data ?? {})

  const primaryError =
    summaryQuery.error && isApiError(summaryQuery.error)
      ? summaryQuery.error.message
      : null

  if (scopeLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-on-surface-variant">
        {t.common.loading}
      </div>
    )
  }

  if (scopeBlocked) {
    return (
      <EmptyState
        icon="bar_chart"
        title={t.reports.title}
        description={t.scope.noRestaurantsBody}
      />
    )
  }

  return (
    <div>
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              {t.reports.dateFrom}
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              {t.reports.dateTo}
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              summaryQuery.refetch()
              trendsQuery.refetch()
              peakHoursQuery.refetch()
              customersQuery.refetch()
              waitlistQuery.refetch()
              reviewsQuery.refetch()
            }}
          >
            {t.reports.applyRange}
          </Button>
        </div>
      </Card>

      {primaryError && (
        <div className="mb-6 rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-error">
          {primaryError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t.reports.totalReservations}
          value={formatCount(summaryStats.total)}
          icon="calendar_today"
          variant="primary"
        />
        <StatCard
          title={t.reports.noShowRate}
          value={formatRate(summaryStats.noShowRate)}
          icon="trending_up"
          variant="warning"
        />
        <StatCard
          title={t.reports.newCustomers}
          value={formatCount(customerStats.newCustomers)}
          icon="group"
          variant="success"
        />
        <StatCard
          title={t.reports.returning}
          value={formatCount(customerStats.returning)}
          icon="cake"
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardTitle className="mb-4">{t.reports.reservations}</CardTitle>
          {trendsQuery.isLoading ? (
            <div className="flex h-[280px] items-center justify-center text-on-surface-variant">
              {t.common.loading}
            </div>
          ) : trendChartData.length === 0 ? (
            <EmptyState
              icon="bar_chart"
              title={t.reports.noTrendData}
              className="py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#7d5f9a"
                  radius={[4, 4, 0, 0]}
                  name={t.reports.reservations}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">{t.reports.peakHours}</CardTitle>
          {peakHoursQuery.isLoading ? (
            <div className="flex h-[280px] items-center justify-center text-on-surface-variant">
              {t.common.loading}
            </div>
          ) : peakHoursData.length === 0 ? (
            <EmptyState
              icon="schedule"
              title={t.reports.noPeakHoursData}
              className="py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#7d5f9a"
                  strokeWidth={2}
                  dot={{ fill: '#7d5f9a' }}
                  name={t.reports.peakHours}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">{t.reports.statusBreakdown}</CardTitle>
          {summaryQuery.isLoading ? (
            <div className="flex h-[240px] items-center justify-center text-on-surface-variant">
              {t.common.loading}
            </div>
          ) : statusBreakdown.length === 0 ? (
            <EmptyState
              icon="pie_chart"
              title={t.reports.noStatusData}
              className="py-8"
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {statusBreakdown.map((item, i) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-xs text-text-secondary"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {item.label} ({item.value})
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">{t.reports.insights}</CardTitle>
          <div className="space-y-4">
            <InsightRow
              label={t.reports.averagePartySize}
              value={formatCount(summaryStats.averagePartySize)}
            />
            <InsightRow
              label={t.reports.waitlistEntries}
              value={formatCount(waitlistStats.entries)}
            />
            <InsightRow
              label={t.reports.waitlistConversion}
              value={formatRate(waitlistStats.conversionRate)}
            />
            <InsightRow
              label={t.reports.reviewCount}
              value={formatCount(reviewStats.count)}
            />
            <InsightRow
              label={t.reports.averageRating}
              value={
                reviewStats.averageRating !== null
                  ? reviewStats.averageRating.toFixed(1)
                  : '—'
              }
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  )
}

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
import { useLocale } from '@/context/LocaleContext'
import { occupancyData, reservationTrend } from '@/data/mockData'

const occasionData = [
  { name: 'Birthday', value: 45 },
  { name: 'Anniversary', value: 28 },
  { name: 'Engagement', value: 15 },
  { name: 'Graduation', value: 12 },
]

const COLORS = ['#461599', '#5e35b1', '#6c45c0', '#ecdeee']

export function ReportsPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title={t.reports.totalReservations} value="2,540" icon="calendar_today" variant="primary" trend={{ value: 18, label: 'vs last month' }} />
        <StatCard title={t.reports.noShowRate} value="4.2%" icon="trending_up" variant="warning" />
        <StatCard title={t.reports.newCustomers} value="186" icon="group" variant="success" />
        <StatCard title="Total Occasions" value="100" icon="cake" variant="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardTitle className="mb-4">{t.reports.reservations}</CardTitle>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={reservationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="total" fill="#7d5f9a" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="cancelled" fill="#dc2626" radius={[4, 4, 0, 0]} name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle className="mb-4">{t.reports.occupancy}</CardTitle>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} unit="%" />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="rate" stroke="#7d5f9a" strokeWidth={2} dot={{ fill: '#7d5f9a' }} name="Occupancy %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">{t.reports.occasions}</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={occasionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {occasionData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {occasionData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                {item.name} ({item.value})
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">{t.reports.topTables}</CardTitle>
          <div className="space-y-3">
            {[
              { name: 'VIP 2', count: 89, pct: 100 },
              { name: 'Terrace 1', count: 76, pct: 85 },
              { name: 'Table 3', count: 68, pct: 76 },
              { name: 'Family 1', count: 54, pct: 61 },
              { name: 'Table 7', count: 42, pct: 47 },
            ].map((table) => (
              <div key={table.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-text-primary">{table.name}</span>
                  <span className="text-text-muted">{table.count} reservations</span>
                </div>
                <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${table.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

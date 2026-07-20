import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'
import { restaurantInfo } from '@/data/mockData'
import { cn } from '@/lib/utils'

const tabs = ['profile', 'hours', 'rules', 'policies'] as const

export function SettingsPage() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('profile')

  return (
    <div>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-tertiary border border-border',
            )}
          >
            {t.settings[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">{t.settings.profile}</CardTitle>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-primary text-white flex items-center justify-center text-2xl font-bold">
                {restaurantInfo.logo}
              </div>
              <Button variant="outline" size="sm">Upload Logo</Button>
            </div>
            <FormField label="Restaurant Name" defaultValue={restaurantInfo.name} />
            <FormField label="Description" defaultValue="Authentic Syrian cuisine in the heart of Damascus Old City." multiline />
            <FormField label="Phone" defaultValue="+963 11 123 4567" />
            <FormField label="Email" defaultValue="info@naranj.com" type="email" />
            <FormField label="Website" defaultValue="https://naranj.com" />
            <FormField label="Address" defaultValue="Straight Street, Damascus Old City" />
            <Button type="submit">{t.common.save}</Button>
          </form>
        </Card>
      )}

      {activeTab === 'hours' && (
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">{t.settings.hours}</CardTitle>
          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-28 text-sm font-medium text-text-primary">{day}</span>
                <Input type="time" defaultValue="11:00" className="w-32" />
                <span className="text-text-muted">to</span>
                <Input type="time" defaultValue={day === 'Friday' || day === 'Saturday' ? '01:00' : '23:00'} className="w-32" />
              </div>
            ))}
            <Button className="mt-4">{t.common.save}</Button>
          </div>
        </Card>
      )}

      {activeTab === 'rules' && (
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">{t.settings.rules}</CardTitle>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Minimum Guests</label>
              <Input type="number" defaultValue="1" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Maximum Guests</label>
              <Input type="number" defaultValue="20" />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Reservation Duration (minutes)</label>
              <Select defaultValue="120">
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
                <option value="180">180 minutes</option>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Advance Booking (days)</label>
              <Input type="number" defaultValue="30" />
            </div>
            <Button type="submit">{t.common.save}</Button>
          </form>
        </Card>
      )}

      {activeTab === 'policies' && (
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">{t.settings.policies}</CardTitle>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <FormField
              label="Cancellation Policy"
              defaultValue="Free cancellation up to 2 hours before reservation. Late cancellations may incur a fee."
              multiline
            />
            <FormField
              label="No-Show Policy"
              defaultValue="Customers who do not show up without cancellation may be restricted from future bookings."
              multiline
            />
            <Button type="submit">{t.common.save}</Button>
          </form>
        </Card>
      )}
    </div>
  )
}

function FormField({
  label,
  defaultValue,
  type = 'text',
  multiline,
}: {
  label: string
  defaultValue?: string
  type?: string
  multiline?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-medium text-text-secondary mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          defaultValue={defaultValue}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface text-text-primary text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      ) : (
        <Input type={type} defaultValue={defaultValue} />
      )}
    </div>
  )
}

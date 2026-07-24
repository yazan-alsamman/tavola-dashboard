import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  getRestaurant,
  getRestaurantSettings,
  getRestaurantWorkingHours,
  updateRestaurant,
  updateRestaurantSettings,
  updateRestaurantWorkingHours,
  type RestaurantDto,
  type RestaurantSettingsDto,
  type WorkingHoursEntry,
} from '@/api/restaurants'
import { isApiError } from '@/api/errors'
import { cn } from '@/lib/utils'

const tabs = ['profile', 'hours', 'rules'] as const
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultSettings: RestaurantSettingsDto = {
  reservationIntervalMinutes: 30,
  maxGuestsPerReservation: 20,
  cancellationWindowMinutes: 60,
  pendingReservationTimeoutMinutes: 15,
  defaultReservationDurationMinutes: 90,
  autoApproval: false,
  timezone: 'UTC',
  defaultCurrency: 'USD',
}

function entriesToWeek(entries: WorkingHoursEntry[]): WorkingHoursEntry[] {
  return DAY_LABELS.map((_, dayOfWeek) => {
    const found = entries.find((e) => e.dayOfWeek === dayOfWeek)
    return (
      found ?? {
        dayOfWeek,
        openingTime: '09:00',
        closingTime: '22:00',
        breakStartTime: null,
        breakEndTime: null,
      }
    )
  })
}

export function SettingsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { status, selectedRestaurantId, selectedRestaurant, refreshScope } =
    useRestaurantScope()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('profile')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState({
    name: '',
    description: '',
    cuisineType: '',
    priceLevel: 2,
  })
  const [settings, setSettings] = useState<RestaurantSettingsDto>(defaultSettings)
  const [hours, setHours] = useState<WorkingHoursEntry[]>(entriesToWeek([]))

  const restaurantId = selectedRestaurantId

  useEffect(() => {
    if (!restaurantId || (status !== 'ready' && status !== 'empty_branches')) return

    const ac = new AbortController()
    setLoading(true)

    void (async () => {
      try {
        const [restaurant, restaurantSettings, workingHours] = await Promise.all([
          getRestaurant(restaurantId),
          getRestaurantSettings(restaurantId),
          getRestaurantWorkingHours(restaurantId),
        ])
        if (ac.signal.aborted) return
        applyRestaurant(restaurant)
        setSettings(restaurantSettings)
        setHours(entriesToWeek(workingHours.entries ?? []))
      } catch (err) {
        if (ac.signal.aborted) return
        // Fall back to scoped restaurant snapshot for profile fields.
        if (selectedRestaurant) applyRestaurant(selectedRestaurant)
        toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()

    return () => ac.abort()
  }, [restaurantId, status, selectedRestaurant, t.login.errors.unknown, toast])

  function applyRestaurant(restaurant: RestaurantDto): void {
    setProfile({
      name: restaurant.name,
      description: restaurant.description ?? '',
      cuisineType: restaurant.cuisineType ?? '',
      priceLevel: restaurant.priceLevel ?? 2,
    })
  }

  const saveProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || saving) return
    setSaving(true)
    try {
      const updated = await updateRestaurant(restaurantId, {
        name: profile.name.trim(),
        description: profile.description.trim() || null,
        cuisineType: profile.cuisineType.trim() || null,
        priceLevel: profile.priceLevel,
        status: selectedRestaurant?.status ?? 'Active',
      })
      applyRestaurant(updated)
      refreshScope()
      toast('success', t.common.save)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const saveHours = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || saving) return
    setSaving(true)
    try {
      const updated = await updateRestaurantWorkingHours(restaurantId, {
        entries: hours,
      })
      setHours(entriesToWeek(updated.entries ?? hours))
      toast('success', t.common.save)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || saving) return
    setSaving(true)
    try {
      const updated = await updateRestaurantSettings(restaurantId, settings)
      setSettings(updated)
      toast('success', t.common.save)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'idle' || status === 'loading' || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-on-surface-variant">
        {t.common.loading}
      </div>
    )
  }

  if (!restaurantId) {
    return (
      <EmptyState
        icon="settings"
        title={t.settings.title}
        description={t.scope.noRestaurantsBody}
      />
    )
  }

  return (
    <div>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
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
          <form className="space-y-4" onSubmit={(e) => void saveProfile(e)}>
            <FormField
              label="Restaurant Name"
              value={profile.name}
              onChange={(v) => setProfile({ ...profile, name: v })}
              required
            />
            <FormField
              label="Description"
              value={profile.description}
              onChange={(v) => setProfile({ ...profile, description: v })}
              multiline
            />
            <FormField
              label="Cuisine type"
              value={profile.cuisineType}
              onChange={(v) => setProfile({ ...profile, cuisineType: v })}
            />
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                Price level (1–4)
              </label>
              <Input
                type="number"
                min={1}
                max={4}
                value={profile.priceLevel}
                onChange={(e) =>
                  setProfile({ ...profile, priceLevel: Number(e.target.value) || 1 })
                }
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'hours' && (
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">{t.settings.hours}</CardTitle>
          <form className="space-y-3" onSubmit={(e) => void saveHours(e)}>
            {hours.map((entry) => (
              <div key={entry.dayOfWeek} className="flex flex-wrap items-center gap-3">
                <span className="w-28 text-sm font-medium text-text-primary">
                  {DAY_LABELS[entry.dayOfWeek]}
                </span>
                <Input
                  type="time"
                  value={entry.openingTime}
                  className="w-32"
                  onChange={(e) => {
                    const next = [...hours]
                    next[entry.dayOfWeek] = {
                      ...entry,
                      openingTime: e.target.value,
                    }
                    setHours(next)
                  }}
                />
                <span className="text-text-muted">to</span>
                <Input
                  type="time"
                  value={entry.closingTime}
                  className="w-32"
                  onChange={(e) => {
                    const next = [...hours]
                    next[entry.dayOfWeek] = {
                      ...entry,
                      closingTime: e.target.value,
                    }
                    setHours(next)
                  }}
                />
              </div>
            ))}
            <Button className="mt-4" type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'rules' && (
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">{t.settings.rules}</CardTitle>
          <form className="space-y-4" onSubmit={(e) => void saveSettings(e)}>
            <NumberField
              label="Max guests per reservation"
              value={settings.maxGuestsPerReservation}
              onChange={(v) => setSettings({ ...settings, maxGuestsPerReservation: v })}
            />
            <NumberField
              label="Default reservation duration (minutes)"
              value={settings.defaultReservationDurationMinutes}
              onChange={(v) =>
                setSettings({ ...settings, defaultReservationDurationMinutes: v })
              }
            />
            <NumberField
              label="Reservation interval (minutes)"
              value={settings.reservationIntervalMinutes}
              onChange={(v) =>
                setSettings({ ...settings, reservationIntervalMinutes: v })
              }
            />
            <NumberField
              label="Cancellation window (minutes)"
              value={settings.cancellationWindowMinutes}
              onChange={(v) =>
                setSettings({ ...settings, cancellationWindowMinutes: v })
              }
            />
            <NumberField
              label="Pending timeout (minutes)"
              value={settings.pendingReservationTimeoutMinutes}
              onChange={(v) =>
                setSettings({ ...settings, pendingReservationTimeoutMinutes: v })
              }
            />
            <FormField
              label="Timezone"
              value={settings.timezone}
              onChange={(v) => setSettings({ ...settings, timezone: v })}
            />
            <FormField
              label="Default currency"
              value={settings.defaultCurrency}
              onChange={(v) => setSettings({ ...settings, defaultCurrency: v })}
            />
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={settings.autoApproval}
                onChange={(e) =>
                  setSettings({ ...settings, autoApproval: e.target.checked })
                }
              />
              Auto-approve reservations
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  multiline,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  required?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-medium text-text-secondary mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          required={required}
          className="w-full rounded-lg border border-border bg-surface text-text-primary text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} />
      )}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-text-secondary mb-1.5 block">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}

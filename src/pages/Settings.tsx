import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  changePassword,
  listSessions,
  revokeSession,
  type AuthSessionDto,
} from '@/api/auth'
import {
  useOrganizationSubscriptionQuery,
  useOrganizationUsageQuery,
} from '@/hooks/useOrganizationQueries'
import { displayPayloadFields } from '@/lib/analyticsPayload'
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

const tabs = ['profile', 'hours', 'rules', 'subscription', 'security'] as const
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
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { status, selectedRestaurantId, selectedRestaurant, refreshScope } =
    useRestaurantScope()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('profile')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const subscriptionQuery = useOrganizationSubscriptionQuery(
    activeTab === 'subscription',
  )
  const usageQuery = useOrganizationUsageQuery(activeTab === 'subscription')

  const sessionsQuery = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => listSessions(),
    enabled: activeTab === 'security',
  })

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast('success', t.settings.securityForm.passwordChanged)
    },
    onError: (err) => {
      toast(
        'error',
        isApiError(err) ? err.message : t.settings.securityForm.passwordChangeFailed,
      )
    },
  })

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] })
      toast('success', t.settings.securityForm.sessionRevoked)
    },
    onError: (err) => {
      toast(
        'error',
        isApiError(err) ? err.message : t.settings.securityForm.sessionRevokeFailed,
      )
    },
  })

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

      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <SubscriptionCard
            title={t.settings.subscriptionPlan.planTitle}
            loading={subscriptionQuery.isLoading}
            error={
              subscriptionQuery.error && isApiError(subscriptionQuery.error)
                ? subscriptionQuery.error.message
                : null
            }
            fields={displayPayloadFields(subscriptionQuery.data ?? {})}
            emptyTitle={t.settings.subscriptionPlan.noData}
          />
          <SubscriptionCard
            title={t.settings.subscriptionPlan.usageTitle}
            loading={usageQuery.isLoading}
            error={
              usageQuery.error && isApiError(usageQuery.error)
                ? usageQuery.error.message
                : null
            }
            fields={displayPayloadFields(usageQuery.data ?? {})}
            emptyTitle={t.settings.subscriptionPlan.noData}
          />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <Card>
            <CardTitle className="mb-6">{t.settings.securityForm.changePassword}</CardTitle>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  toast('error', t.settings.securityForm.passwordMismatch)
                  return
                }
                changePasswordMutation.mutate()
              }}
            >
              <FormField
                label={t.settings.securityForm.currentPassword}
                value={passwordForm.currentPassword}
                onChange={(v) =>
                  setPasswordForm({ ...passwordForm, currentPassword: v })
                }
                type="password"
                required
              />
              <FormField
                label={t.settings.securityForm.newPassword}
                value={passwordForm.newPassword}
                onChange={(v) =>
                  setPasswordForm({ ...passwordForm, newPassword: v })
                }
                type="password"
                required
              />
              <FormField
                label={t.settings.securityForm.confirmPassword}
                value={passwordForm.confirmPassword}
                onChange={(v) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: v })
                }
                type="password"
                required
              />
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending
                  ? t.common.loading
                  : t.settings.securityForm.changePassword}
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle className="mb-6">{t.settings.securityForm.sessions}</CardTitle>
            {sessionsQuery.isLoading ? (
              <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
            ) : sessionsQuery.error ? (
              <p className="text-sm text-error">
                {isApiError(sessionsQuery.error)
                  ? sessionsQuery.error.message
                  : t.settings.securityForm.sessionsLoadFailed}
              </p>
            ) : (sessionsQuery.data?.sessions ?? []).length === 0 ? (
              <EmptyState
                icon="devices"
                title={t.settings.securityForm.noSessions}
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {(sessionsQuery.data?.sessions ?? []).map((session) => (
                  <SessionRow
                    key={session.sessionId}
                    session={session}
                    locale={locale}
                    currentLabel={t.settings.securityForm.currentSession}
                    revokeLabel={t.settings.securityForm.revoke}
                    revoking={revokeSessionMutation.isPending}
                    onRevoke={() => revokeSessionMutation.mutate(session.sessionId)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
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

function SubscriptionCard({
  title,
  loading,
  error,
  fields,
  emptyTitle,
}: {
  title: string
  loading: boolean
  error: string | null
  fields: Array<{ key: string; value: string }>
  emptyTitle: string
}) {
  const { t } = useLocale()

  return (
    <Card>
      <CardTitle className="mb-6">{title}</CardTitle>
      {loading ? (
        <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : fields.length === 0 ? (
        <EmptyState icon="credit_card" title={emptyTitle} className="py-6" />
      ) : (
        <dl className="space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="flex justify-between gap-4 text-sm">
              <dt className="text-text-secondary">{field.key}</dt>
              <dd className="font-medium text-text-primary text-end">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}

function SessionRow({
  session,
  locale,
  currentLabel,
  revokeLabel,
  revoking,
  onRevoke,
}: {
  session: AuthSessionDto
  locale: string
  currentLabel: string
  revokeLabel: string
  revoking: boolean
  onRevoke: () => void
}) {
  const device =
    session.deviceName ??
    session.deviceType ??
    session.sessionId.slice(0, 8)

  const lastSeen = session.lastSeenAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(session.lastSeenAt))
    : null

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-outline-variant/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-surface-variant/30 text-primary shrink-0">
          <MaterialIcon name="devices" size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">{device}</p>
          {lastSeen && (
            <p className="text-xs text-on-surface-variant">{lastSeen}</p>
          )}
          {session.isCurrentSession && (
            <span className="text-[10px] font-bold uppercase text-primary">
              {currentLabel}
            </span>
          )}
        </div>
      </div>
      {!session.isCurrentSession && (
        <Button
          variant="secondary"
          size="sm"
          disabled={revoking}
          onClick={onRevoke}
        >
          {revokeLabel}
        </Button>
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
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  required?: boolean
  type?: string
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
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
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

import { useEffect, useRef, useState } from 'react'
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
  addRestaurantGalleryImage,
  getRestaurant,
  getRestaurantCuisineCategories,
  getRestaurantOccasionCategories,
  getRestaurantSettings,
  getRestaurantWorkingHours,
  listRestaurantGallery,
  removeRestaurantGalleryImage,
  setRestaurantCuisineCategories,
  setRestaurantOccasionCategories,
  updateRestaurant,
  updateRestaurantSettings,
  updateRestaurantWorkingHours,
  type GalleryItemDto,
  type RestaurantDto,
  type RestaurantSettingsDto,
  type WorkingHoursEntry,
} from '@/api/restaurants'
import {
  listCuisineCategories,
  listOccasionCategories,
} from '@/api/taxonomy'
import {
  getCurrentUser,
  getMyPreferences,
  updateCurrentUser,
  updateMyPreferences,
  uploadMyAvatar,
  type UserPreferences,
} from '@/api/users'
import { isApiError } from '@/api/errors'
import { cn } from '@/lib/utils'

const tabs = [
  'profile',
  'gallery',
  'categories',
  'hours',
  'rules',
  'account',
  'subscription',
  'security',
] as const
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
  const [gallery, setGallery] = useState<GalleryItemDto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [selectedCuisineIds, setSelectedCuisineIds] = useState<string[]>([])
  const [selectedOccasionIds, setSelectedOccasionIds] = useState<string[]>([])
  const [accountForm, setAccountForm] = useState({
    firstName: '',
    lastName: '',
    countryCode: 'SY',
    phoneNumber: '',
    language: 'en',
    preferredCurrency: 'USD',
  })
  const [preferences, setPreferences] = useState<UserPreferences>({
    notificationOptIn: true,
    marketingOptIn: false,
  })
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const restaurantId = selectedRestaurantId

  const cuisineCatalogQuery = useQuery({
    queryKey: ['taxonomy', 'cuisine'],
    queryFn: ({ signal }) => listCuisineCategories(signal),
    enabled: activeTab === 'categories',
  })
  const occasionCatalogQuery = useQuery({
    queryKey: ['taxonomy', 'occasion'],
    queryFn: ({ signal }) => listOccasionCategories(signal),
    enabled: activeTab === 'categories',
  })

  const accountQuery = useQuery({
    queryKey: ['users', 'me', 'settings'],
    queryFn: async () => {
      const [profileData, prefs] = await Promise.all([
        getCurrentUser(),
        getMyPreferences(),
      ])
      return { profile: profileData, preferences: prefs }
    },
    enabled: activeTab === 'account',
  })

  useEffect(() => {
    if (!accountQuery.data) return
    const { profile: p, preferences: prefs } = accountQuery.data
    const phone = p.phone ?? ''
    const match = phone.match(/^(\+\d{1,4})?(.*)$/)
    setAccountForm({
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      countryCode: match?.[1]?.replace('+', '') || 'SY',
      phoneNumber: (match?.[2] ?? phone).trim(),
      language: p.language || 'en',
      preferredCurrency: p.preferredCurrency || 'USD',
    })
    setPreferences(prefs)
  }, [accountQuery.data])

  useEffect(() => {
    if (!restaurantId || activeTab !== 'gallery') return
    const ac = new AbortController()
    setGalleryLoading(true)
    void listRestaurantGallery(restaurantId)
      .then((items) => {
        if (!ac.signal.aborted) setGallery(items)
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setGalleryLoading(false)
      })
    return () => ac.abort()
  }, [restaurantId, activeTab, t.login.errors.unknown, toast])

  useEffect(() => {
    if (!restaurantId || activeTab !== 'categories') return
    const ac = new AbortController()
    void (async () => {
      try {
        const [cuisine, occasion] = await Promise.all([
          getRestaurantCuisineCategories(restaurantId),
          getRestaurantOccasionCategories(restaurantId),
        ])
        if (ac.signal.aborted) return
        setSelectedCuisineIds(cuisine.cuisineCategoryIds)
        setSelectedOccasionIds(occasion.occasionCategoryIds)
      } catch (err) {
        if (!ac.signal.aborted) {
          toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
        }
      }
    })()
    return () => ac.abort()
  }, [restaurantId, activeTab, t.login.errors.unknown, toast])

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

  const saveCategories = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || saving) return
    setSaving(true)
    try {
      const [cuisine, occasion] = await Promise.all([
        setRestaurantCuisineCategories(restaurantId, selectedCuisineIds),
        setRestaurantOccasionCategories(restaurantId, selectedOccasionIds),
      ])
      setSelectedCuisineIds(cuisine.cuisineCategoryIds)
      setSelectedOccasionIds(occasion.occasionCategoryIds)
      toast('success', t.common.save)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const saveAccount = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await updateCurrentUser({
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        countryCode: accountForm.countryCode.trim(),
        phoneNumber: accountForm.phoneNumber.trim(),
        language: accountForm.language.trim(),
        preferredCurrency: accountForm.preferredCurrency.trim(),
      })
      await updateMyPreferences(preferences)
      await accountQuery.refetch()
      toast('success', t.common.save)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !restaurantId) return
    setSaving(true)
    try {
      const item = await addRestaurantGalleryImage(restaurantId, file)
      setGallery((prev) => [...prev, item])
      toast('success', t.settings.galleryForm.uploadSuccess)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const handleGalleryRemove = async (galleryItemId: string): Promise<void> => {
    if (!restaurantId || saving) return
    setSaving(true)
    try {
      await removeRestaurantGalleryImage(restaurantId, galleryItemId)
      setGallery((prev) => prev.filter((g) => g.galleryItemId !== galleryItemId))
      toast('success', t.settings.galleryForm.removeSuccess)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSaving(true)
    try {
      await uploadMyAvatar(file)
      await accountQuery.refetch()
      toast('success', t.settings.accountForm.avatarSuccess)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSaving(false)
    }
  }

  const toggleId = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

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
              label={t.settings.profileForm.name}
              value={profile.name}
              onChange={(v) => setProfile({ ...profile, name: v })}
              required
            />
            <FormField
              label={t.settings.profileForm.description}
              value={profile.description}
              onChange={(v) => setProfile({ ...profile, description: v })}
              multiline
            />
            <FormField
              label={t.settings.profileForm.cuisineType}
              value={profile.cuisineType}
              onChange={(v) => setProfile({ ...profile, cuisineType: v })}
            />
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                {t.settings.profileForm.priceLevel}
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

      {activeTab === 'gallery' && (
        <Card className="max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <CardTitle>{t.settings.gallery}</CardTitle>
              <p className="text-sm text-on-surface-variant mt-1">
                {t.settings.galleryForm.emptyBody}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/gallery"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10"
              >
                <MaterialIcon name="open_in_new" size={18} />
                {t.menu.openGallery}
              </a>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handleGalleryUpload(e)}
              />
              <Button
                type="button"
                disabled={saving}
                onClick={() => galleryInputRef.current?.click()}
              >
                <MaterialIcon name="add_photo_alternate" size={18} className="me-2" />
                {t.settings.galleryForm.upload}
              </Button>
            </div>
          </div>
          {galleryLoading ? (
            <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
          ) : gallery.length === 0 ? (
            <EmptyState
              icon="photo_library"
              title={t.settings.galleryForm.emptyTitle}
              description={t.settings.galleryForm.emptyBody}
              className="py-10"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {gallery.map((item) => (
                <div
                  key={item.galleryItemId}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low"
                >
                  {item.url ? (
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-on-surface-variant">
                      <MaterialIcon name="image" size={28} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-2 end-2 h-8 w-8 rounded-full bg-error text-on-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title={t.common.delete}
                    disabled={saving}
                    onClick={() => void handleGalleryRemove(item.galleryItemId)}
                  >
                    <MaterialIcon name="delete" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'categories' && (
        <Card className="max-w-3xl">
          <CardTitle className="mb-2">{t.settings.categories}</CardTitle>
          <p className="text-sm text-on-surface-variant mb-6">
            {t.settings.categoriesForm.subtitle}
          </p>
          <form className="space-y-8" onSubmit={(e) => void saveCategories(e)}>
            <CategoryChecklist
              title={t.settings.categoriesForm.cuisine}
              loading={cuisineCatalogQuery.isLoading}
              options={(cuisineCatalogQuery.data ?? []).map((c) => ({
                id: c.cuisineCategoryId,
                label: c.name,
              }))}
              selected={selectedCuisineIds}
              onToggle={(id) =>
                setSelectedCuisineIds((prev) => toggleId(prev, id))
              }
            />
            <CategoryChecklist
              title={t.settings.categoriesForm.occasion}
              loading={occasionCatalogQuery.isLoading}
              options={(occasionCatalogQuery.data ?? []).map((c) => ({
                id: c.occasionCategoryId,
                label: c.name,
              }))}
              selected={selectedOccasionIds}
              onToggle={(id) =>
                setSelectedOccasionIds((prev) => toggleId(prev, id))
              }
            />
            <Button type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <Card>
            <CardTitle className="mb-6">{t.settings.account}</CardTitle>
            {accountQuery.isLoading ? (
              <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
            ) : accountQuery.isError ? (
              <p className="text-sm text-error">
                {isApiError(accountQuery.error)
                  ? accountQuery.error.message
                  : t.settings.accountForm.loadFailed}
              </p>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void saveAccount(e)}>
                <FormField
                  label={t.settings.accountForm.firstName}
                  value={accountForm.firstName}
                  onChange={(v) => setAccountForm({ ...accountForm, firstName: v })}
                  required
                />
                <FormField
                  label={t.settings.accountForm.lastName}
                  value={accountForm.lastName}
                  onChange={(v) => setAccountForm({ ...accountForm, lastName: v })}
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    label={t.settings.accountForm.countryCode}
                    value={accountForm.countryCode}
                    onChange={(v) =>
                      setAccountForm({ ...accountForm, countryCode: v })
                    }
                    required
                  />
                  <div className="col-span-2">
                    <FormField
                      label={t.settings.accountForm.phone}
                      value={accountForm.phoneNumber}
                      onChange={(v) =>
                        setAccountForm({ ...accountForm, phoneNumber: v })
                      }
                      required
                    />
                  </div>
                </div>
                <FormField
                  label={t.settings.accountForm.language}
                  value={accountForm.language}
                  onChange={(v) => setAccountForm({ ...accountForm, language: v })}
                  required
                />
                <FormField
                  label={t.settings.accountForm.currency}
                  value={accountForm.preferredCurrency}
                  onChange={(v) =>
                    setAccountForm({ ...accountForm, preferredCurrency: v })
                  }
                  required
                />
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={preferences.notificationOptIn}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        notificationOptIn: e.target.checked,
                      })
                    }
                  />
                  {t.settings.accountForm.notificationOptIn}
                </label>
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input
                    type="checkbox"
                    checked={preferences.marketingOptIn}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        marketingOptIn: e.target.checked,
                      })
                    }
                  />
                  {t.settings.accountForm.marketingOptIn}
                </label>
                <Button type="submit" disabled={saving}>
                  {saving ? t.common.loading : t.common.save}
                </Button>
              </form>
            )}
          </Card>
          <Card>
            <CardTitle className="mb-6">{t.settings.accountForm.avatar}</CardTitle>
            <p className="text-sm text-on-surface-variant mb-4">
              {t.settings.accountForm.avatarHint}
            </p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarUpload(e)}
            />
            <Button
              type="button"
              disabled={saving}
              onClick={() => avatarInputRef.current?.click()}
            >
              <MaterialIcon name="account_circle" size={18} className="me-2" />
              {t.settings.accountForm.uploadAvatar}
            </Button>
          </Card>
        </div>
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

function CategoryChecklist({
  title,
  loading,
  options,
  selected,
  onToggle,
}: {
  title: string
  loading: boolean
  options: Array<{ id: string; label: string }>
  selected: string[]
  onToggle: (id: string) => void
}) {
  const { t } = useLocale()
  return (
    <div>
      <h3 className="text-sm font-semibold text-on-surface mb-3">{title}</h3>
      {loading ? (
        <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t.settings.categoriesForm.empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selected.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-on-surface border-outline-variant/40 hover:border-primary/40',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
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

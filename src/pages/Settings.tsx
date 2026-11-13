import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { useAuth } from '@/context/AuthContext'
import { BranchPlansCard } from '@/components/branches/BranchPlansCard'
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
  useCanManageOrganization,
} from '@/hooks/useOrganizationQueries'
import { SettingsTeamPanel } from '@/components/settings/SettingsTeamPanel'
import { displayPayloadFields } from '@/lib/analyticsPayload'
import { formatDateTime } from '@/lib/format'
import {
  getRestaurant,
  getRestaurantCuisineCategories,
  getRestaurantOccasionCategories,
  setRestaurantCuisineCategories,
  setRestaurantOccasionCategories,
  updateRestaurant,
  type RestaurantDto,
} from '@/api/restaurants'
import {
  cuisineTypeChoices,
  listCuisineCategories,
  listOccasionCategories,
  taxonomyLabel,
} from '@/api/taxonomy'
import {
  getCurrentUser,
  getMyPreferences,
  updateCurrentUser,
  updateMyPreferences,
  uploadMyAvatar,
  type UserPreferences,
} from '@/api/users'
import { cn } from '@/lib/utils'
import { apiErrorText } from '@/lib/apiErrorText'
import { splitByLanguage } from '@/lib/restaurantName'
import { SUPPORTED_LANGUAGES, currencyLabel, currencyOptions } from '@/lib/currencies'

/**
 * Restaurant-level settings only. Hours, reservation rules, currency,
 * timezone and photos belong to each branch (backend ADR-050/051) and are set
 * from the Branches and Photos pages.
 */
const tabs = [
  'profile',
  'categories',
  'account',
  'team',
  'subscription',
  'security',
] as const

export function SettingsPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { logoutAll } = useAuth()
  const queryClient = useQueryClient()
  const canManageOrg = useCanManageOrganization()
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
        apiErrorText(err, t, t.settings.securityForm.passwordChangeFailed),
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
        apiErrorText(err, t, t.settings.securityForm.sessionRevokeFailed),
      )
    },
  })

  const logoutAllMutation = useMutation({
    mutationFn: () => logoutAll(),
    onSuccess: () => {
      toast('success', t.settings.securityForm.logoutAllSuccess)
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      toast(
        'error',
        apiErrorText(err, t, t.settings.securityForm.logoutAllFailed),
      )
    },
  })

  const [profile, setProfile] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    cuisineType: '',
  })
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
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const restaurantId = selectedRestaurantId

  const cuisineCatalogQuery = useQuery({
    queryKey: ['taxonomy', 'cuisine'],
    queryFn: ({ signal }) => listCuisineCategories(signal),
    // The profile tab's cuisine-type dropdown uses the same catalog.
    enabled: activeTab === 'categories' || activeTab === 'profile',
  })
  const cuisineChoices = cuisineTypeChoices(
    cuisineCatalogQuery.data ?? [],
    profile.cuisineType,
    locale,
  )
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
      language: p.language === 'ar' ? 'ar' : 'en',
      preferredCurrency: p.preferredCurrency || 'USD',
    })
    setPreferences(prefs)
  }, [accountQuery.data])

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
          toast('error', apiErrorText(err, t, t.login.errors.unknown))
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
        const restaurant = await getRestaurant(restaurantId)
        if (ac.signal.aborted) return
        applyRestaurant(restaurant)
      } catch (err) {
        if (ac.signal.aborted) return
        // Fall back to scoped restaurant snapshot for profile fields.
        if (selectedRestaurant) applyRestaurant(selectedRestaurant)
        toast('error', apiErrorText(err, t, t.login.errors.unknown))
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    })()

    return () => ac.abort()
  }, [restaurantId, status, selectedRestaurant, t.login.errors.unknown, toast])

  function applyRestaurant(restaurant: RestaurantDto): void {
    const names = splitByLanguage(restaurant.name, restaurant.nameAr, restaurant.nameEn)
    const descriptions = splitByLanguage(
      restaurant.description,
      restaurant.descriptionAr,
      restaurant.descriptionEn,
    )
    setProfile({
      nameAr: names.ar,
      nameEn: names.en,
      descriptionAr: descriptions.ar,
      descriptionEn: descriptions.en,
      cuisineType: restaurant.cuisineType ?? '',
    })
  }

  const saveProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || saving) return
    if (!profile.nameAr.trim() && !profile.nameEn.trim()) {
      toast('error', t.settings.profileForm.nameRequired)
      return
    }
    setSaving(true)
    try {
      const descriptionAr = profile.descriptionAr.trim() || null
      const descriptionEn = profile.descriptionEn.trim() || null
      const updated = await updateRestaurant(restaurantId, {
        nameAr: profile.nameAr.trim() || null,
        nameEn: profile.nameEn.trim() || null,
        description: descriptionAr ?? descriptionEn,
        descriptionAr,
        descriptionEn,
        cuisineType: profile.cuisineType.trim() || null,
        status: selectedRestaurant?.status ?? 'Active',
      })
      applyRestaurant(updated)
      refreshScope()
      toast('success', t.common.save)
    } catch (err) {
      toast('error', apiErrorText(err, t, t.login.errors.unknown))
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
      toast('error', apiErrorText(err, t, t.login.errors.unknown))
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
      toast('error', apiErrorText(err, t, t.login.errors.unknown))
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
      toast('error', apiErrorText(err, t, t.login.errors.unknown))
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
        {tabs
          .filter((tab) => (tab === 'team' || tab === 'subscription' ? canManageOrg : true))
          .map((tab) => (
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
            <p className="text-sm text-on-surface-variant">
              {t.settings.profileForm.bilingualHint}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label={t.settings.profileForm.nameAr}
                value={profile.nameAr}
                dir="rtl"
                onChange={(v) => setProfile({ ...profile, nameAr: v })}
              />
              <FormField
                label={t.settings.profileForm.nameEn}
                value={profile.nameEn}
                dir="ltr"
                onChange={(v) => setProfile({ ...profile, nameEn: v })}
              />
            </div>
            <FormField
              label={t.settings.profileForm.descriptionAr}
              value={profile.descriptionAr}
              dir="rtl"
              onChange={(v) => setProfile({ ...profile, descriptionAr: v })}
              multiline
            />
            <FormField
              label={t.settings.profileForm.descriptionEn}
              value={profile.descriptionEn}
              dir="ltr"
              onChange={(v) => setProfile({ ...profile, descriptionEn: v })}
              multiline
            />
            <Select
              label={t.settings.profileForm.cuisineType}
              value={cuisineChoices.selectedValue}
              onChange={(e) => setProfile({ ...profile, cuisineType: e.target.value })}
              disabled={cuisineCatalogQuery.isLoading}
              error={
                cuisineCatalogQuery.isError
                  ? t.settings.profileForm.cuisineTypeLoadFailed
                  : undefined
              }
              hint={
                cuisineChoices.legacyValue !== null
                  ? t.settings.profileForm.cuisineTypeLegacyHint
                  : undefined
              }
            >
              <option value="">{t.settings.profileForm.cuisineTypeNone}</option>
              {cuisineChoices.legacyValue !== null && (
                <option value={cuisineChoices.legacyValue}>
                  {`${cuisineChoices.legacyValue} (${t.settings.profileForm.cuisineTypeLegacy})`}
                </option>
              )}
              {cuisineChoices.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          </form>
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
                label: taxonomyLabel(c, locale),
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
                label: taxonomyLabel(c, locale),
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
                {apiErrorText(accountQuery.error, t, t.settings.accountForm.loadFailed)}
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label={t.settings.accountForm.language}
                    value={accountForm.language}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, language: e.target.value })
                    }
                  >
                    {SUPPORTED_LANGUAGES.map((code) => (
                      <option key={code} value={code}>
                        {t.settings.accountForm.languages[code]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={t.settings.accountForm.currency}
                    value={accountForm.preferredCurrency}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, preferredCurrency: e.target.value })
                    }
                  >
                    {currencyOptions(accountForm.preferredCurrency).map((code) => (
                      <option key={code} value={code}>
                        {currencyLabel(code, locale)}
                      </option>
                    ))}
                  </Select>
                </div>
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

      {activeTab === 'team' && canManageOrg && <SettingsTeamPanel />}

      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <SubscriptionCard
            title={t.settings.subscriptionPlan.planTitle}
            loading={subscriptionQuery.isLoading}
            error={
              subscriptionQuery.error && apiErrorText(subscriptionQuery.error, t, t.login.errors.unknown)
            }
            fields={displayPayloadFields(subscriptionQuery.data ?? {}, locale)}
            emptyTitle={t.settings.subscriptionPlan.noData}
          />
          <SubscriptionCard
            title={t.settings.subscriptionPlan.usageTitle}
            loading={usageQuery.isLoading}
            error={
              usageQuery.error && apiErrorText(usageQuery.error, t, t.login.errors.unknown)
            }
            fields={displayPayloadFields(usageQuery.data ?? {}, locale)}
            emptyTitle={t.settings.subscriptionPlan.noData}
          />
          <BranchPlansCard />
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
            <CardTitle className="mb-2">{t.settings.securityForm.sessions}</CardTitle>
            <p className="text-sm text-on-surface-variant mb-6">
              {t.settings.securityForm.logoutAllHint}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mb-6"
              disabled={logoutAllMutation.isPending}
              onClick={() => logoutAllMutation.mutate()}
            >
              {logoutAllMutation.isPending
                ? t.common.loading
                : t.settings.securityForm.logoutAll}
            </Button>
            {sessionsQuery.isLoading ? (
              <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
            ) : sessionsQuery.error ? (
              <p className="text-sm text-error">
                {apiErrorText(sessionsQuery.error, t, t.settings.securityForm.sessionsLoadFailed)}
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
  const { t } = useLocale()
  const copy = t.settings.securityForm
  const deviceTypes: Record<string, string> = copy.deviceTypes
  const device =
    session.browser && session.operatingSystem
      ? copy.deviceOn
          .replace('{browser}', session.browser)
          .replace('{system}', session.operatingSystem)
      : (session.browser ??
        session.operatingSystem ??
        session.deviceName ??
        deviceTypes[session.deviceType ?? 'unknown'] ??
        deviceTypes.unknown)

  const signedIn = session.createdAt ? formatDateTime(session.createdAt, locale) : null
  const lastUsed = session.lastUsedAt ? formatDateTime(session.lastUsedAt, locale) : null

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-outline-variant/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-surface-variant/30 text-primary shrink-0">
          <MaterialIcon name="devices" size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">
            <bdi>{device}</bdi>
          </p>
          {signedIn && (
            <p className="text-xs text-on-surface-variant">
              {copy.signedIn.replace('{date}', signedIn)}
            </p>
          )}
          {lastUsed && (
            <p className="text-xs text-on-surface-variant">
              {copy.lastUsed.replace('{date}', lastUsed)}
            </p>
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
  dir,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  required?: boolean
  type?: string
  /** Fixed text direction for a field in one language. */
  dir?: 'rtl' | 'ltr'
}) {
  return (
    <div>
      <label className="text-sm font-medium text-text-secondary mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          required={required}
          className="w-full rounded-lg border border-border bg-surface text-text-primary text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
      ) : (
        <Input
          type={type}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
    </div>
  )
}


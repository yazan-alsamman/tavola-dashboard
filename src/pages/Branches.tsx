import { useEffect, useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  createBranch,
  deleteBranch,
  getBranchWorkingHours,
  updateBranch,
  updateBranchWorkingHours,
  type BranchDto,
  type BranchWriteRequest,
} from '@/api/branches'
import type { WorkingHoursEntry } from '@/api/restaurants'
import { isApiError } from '@/api/errors'

const emptyForm: BranchWriteRequest = {
  city: '',
  district: '',
  address: '',
  countryCode: 'SY',
  currency: 'SYP',
  timezone: 'Asia/Damascus',
  phone: '',
}

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

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

function branchToForm(branch: BranchDto): BranchWriteRequest {
  return {
    city: branch.city,
    district: branch.district ?? '',
    address: branch.address,
    latitude: branch.latitude,
    longitude: branch.longitude,
    countryCode: branch.countryCode,
    currency: branch.currency ?? '',
    timezone: branch.timezone,
    phone: branch.phone ?? '',
  }
}

export function BranchesPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const {
    status,
    branches,
    selectedRestaurantId,
    selectedRestaurant,
    formatBranchLabel,
    refreshScope,
  } = useRestaurantScope()
  const [showForm, setShowForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchDto | null>(null)
  const [hoursBranch, setHoursBranch] = useState<BranchDto | null>(null)
  const [form, setForm] = useState<BranchWriteRequest>(emptyForm)
  const [hours, setHours] = useState<WorkingHoursEntry[]>(entriesToWeek([]))
  const [hoursLoading, setHoursLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const restaurantId = selectedRestaurantId
  const canManage =
    Boolean(restaurantId) &&
    (status === 'ready' || status === 'empty_branches')

  useEffect(() => {
    if (!restaurantId || !hoursBranch) return
    const ac = new AbortController()
    setHoursLoading(true)
    void getBranchWorkingHours(restaurantId, hoursBranch.branchId)
      .then((data) => {
        if (!ac.signal.aborted) setHours(entriesToWeek(data.entries ?? []))
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setHoursLoading(false)
      })
    return () => ac.abort()
  }, [restaurantId, hoursBranch, t.login.errors.unknown, toast])

  const openCreate = () => {
    setEditingBranch(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (branch: BranchDto) => {
    setEditingBranch(branch)
    setForm(branchToForm(branch))
    setShowForm(true)
  }

  const closeForm = () => {
    if (submitting) return
    setShowForm(false)
    setEditingBranch(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || submitting) return
    setSubmitting(true)
    const body: BranchWriteRequest = {
      ...form,
      district: form.district?.trim() || null,
      phone: form.phone?.trim() || null,
      currency: form.currency?.trim() || null,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
    }
    try {
      if (editingBranch) {
        await updateBranch(restaurantId, editingBranch.branchId, body)
      } else {
        await createBranch(restaurantId, body)
      }
      toast('success', t.common.save)
      closeForm()
      refreshScope()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (branchId: string): Promise<void> => {
    if (!restaurantId || deletingId) return
    setDeletingId(branchId)
    try {
      await deleteBranch(restaurantId, branchId)
      toast('success', t.common.delete)
      refreshScope()
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setDeletingId(null)
    }
  }

  const saveHours = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || !hoursBranch || submitting) return
    setSubmitting(true)
    try {
      const updated = await updateBranchWorkingHours(
        restaurantId,
        hoursBranch.branchId,
        { entries: hours },
      )
      setHours(entriesToWeek(updated.entries ?? hours))
      toast('success', t.common.save)
      setHoursBranch(null)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t.branches.title}
        subtitle={
          selectedRestaurant
            ? `${t.branches.subtitle} · ${selectedRestaurant.name}`
            : t.branches.subtitle
        }
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <MaterialIcon name="add" size={18} className="me-1" />
              {t.branches.addBranch}
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <EmptyState
          icon="store"
          title={t.scope.noRestaurantsTitle}
          description={t.scope.noRestaurantsBody}
        />
      )}

      {canManage && branches.length === 0 && (
        <EmptyState
          icon="store"
          title={t.branches.emptyTitle}
          description={t.branches.emptyBody}
          action={
            <Button onClick={openCreate}>{t.branches.addBranch}</Button>
          }
        />
      )}

      {canManage && branches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card key={branch.branchId} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {formatBranchLabel(branch)}
                  </CardTitle>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {branch.address}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MaterialIcon name="store" size={20} />
                </div>
              </div>
              <dl className="text-sm space-y-1 text-on-surface-variant">
                <div className="flex justify-between gap-2">
                  <dt>{t.branches.fields.timezone}</dt>
                  <dd className="text-on-surface">{branch.timezone}</dd>
                </div>
                {branch.phone && (
                  <div className="flex justify-between gap-2">
                    <dt>{t.branches.fields.phone}</dt>
                    <dd className="text-on-surface">{branch.phone}</dd>
                  </div>
                )}
                {branch.currency && (
                  <div className="flex justify-between gap-2">
                    <dt>{t.branches.fields.currency}</dt>
                    <dd className="text-on-surface">{branch.currency}</dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap gap-2 mt-auto pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(branch)}
                >
                  {t.common.edit}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHoursBranch(branch)}
                >
                  {t.branches.workingHours}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={deletingId === branch.branchId}
                  onClick={() => void handleDelete(branch.branchId)}
                >
                  {deletingId === branch.branchId
                    ? t.common.loading
                    : t.common.delete}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editingBranch ? t.branches.editBranch : t.branches.addBranch}
        description={t.branches.formSubtitle}
      >
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <Field
            label={t.branches.fields.city}
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
            required
          />
          <Field
            label={t.branches.fields.district}
            value={form.district ?? ''}
            onChange={(v) => setForm({ ...form, district: v })}
          />
          <Field
            label={t.branches.fields.address}
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t.branches.fields.countryCode}
              value={form.countryCode}
              onChange={(v) => setForm({ ...form, countryCode: v })}
              required
            />
            <Field
              label={t.branches.fields.phone}
              value={form.phone ?? ''}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t.branches.fields.timezone}
              value={form.timezone}
              onChange={(v) => setForm({ ...form, timezone: v })}
              required
            />
            <Field
              label={t.branches.fields.currency}
              value={form.currency ?? ''}
              onChange={(v) => setForm({ ...form, currency: v })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t.common.loading : t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(hoursBranch)}
        onClose={() => !submitting && setHoursBranch(null)}
        title={t.branches.workingHours}
        description={
          hoursBranch
            ? formatBranchLabel(hoursBranch)
            : t.branches.hoursSubtitle
        }
      >
        {hoursLoading ? (
          <p className="text-sm text-on-surface-variant py-6 text-center">
            {t.common.loading}
          </p>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void saveHours(e)}>
            {hours.map((entry) => (
              <div
                key={entry.dayOfWeek}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="w-28 text-sm font-medium text-on-surface">
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
                <span className="text-on-surface-variant text-sm">
                  {t.branches.to}
                </span>
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
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHoursBranch(null)}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t.common.loading : t.common.save}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}

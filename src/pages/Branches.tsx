import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  createBranch,
  deleteBranch,
  type BranchWriteRequest,
} from '@/api/branches'
import { isApiError } from '@/api/errors'
import { cn } from '@/lib/utils'

const emptyForm: BranchWriteRequest = {
  city: '',
  district: '',
  address: '',
  countryCode: 'SY',
  currency: 'SYP',
  timezone: 'Asia/Damascus',
  phone: '',
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
  const [form, setForm] = useState<BranchWriteRequest>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const restaurantId = selectedRestaurantId
  const canManage =
    Boolean(restaurantId) &&
    (status === 'ready' || status === 'empty_branches')

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!restaurantId || submitting) return
    setSubmitting(true)
    try {
      await createBranch(restaurantId, {
        ...form,
        district: form.district?.trim() || null,
        phone: form.phone?.trim() || null,
        currency: form.currency?.trim() || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
      })
      toast('success', t.common.save)
      setForm(emptyForm)
      setShowForm(false)
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

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-on-surface-variant">
        {t.scope.loading}
      </div>
    )
  }

  if (!canManage) {
    return (
      <EmptyState
        icon="store"
        title={t.scope.noRestaurantsTitle}
        description={t.scope.noRestaurantsBody}
      />
    )
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
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <MaterialIcon name="add" size={16} /> {t.branches.addBranch}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <form className="space-y-3" onSubmit={(e) => void handleCreate(e)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              <Field label="District" value={form.district ?? ''} onChange={(v) => setForm({ ...form, district: v })} />
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required className="sm:col-span-2" />
              <Field label="Country code" value={form.countryCode} onChange={(v) => setForm({ ...form, countryCode: v })} required />
              <Field label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} required />
              <Field label="Currency" value={form.currency ?? ''} onChange={(v) => setForm({ ...form, currency: v })} />
              <Field label="Phone" value={form.phone ?? ''} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? t.common.loading : t.common.save}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                {t.common.cancel}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {branches.length === 0 ? (
        <EmptyState
          icon="store"
          title={t.scope.noBranchesTitle}
          description={t.scope.noBranchesBody}
          action={
            !showForm ? (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <MaterialIcon name="add" size={16} /> {t.branches.addBranch}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <Card key={branch.branchId}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <MaterialIcon name="location_on" size={20} />
                </div>
              </div>
              <h3 className="font-semibold text-on-surface">{formatBranchLabel(branch)}</h3>
              <p className="text-sm text-on-surface-variant mt-1">{branch.address}</p>
              {branch.phone && (
                <p className="text-sm text-on-surface-variant mt-1">{branch.phone}</p>
              )}
              <p className="text-meta text-on-surface-variant mt-2">
                {branch.timezone} · {branch.countryCode}
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-danger"
                  disabled={deletingId === branch.branchId}
                  onClick={() => void handleDelete(branch.branchId)}
                >
                  {t.common.delete}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  className?: string
}) {
  return (
    <div className={cn(className)}>
      <label className="text-sm font-medium text-text-secondary mb-1.5 block">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}

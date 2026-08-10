import { useState, type FormEvent } from 'react'
import { isApiError } from '@/api/errors'
import type {
  CreateOfferRequest,
  OfferDiscountType,
  OfferDto,
  OfferType,
} from '@/api/offers'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Num } from '@/components/ui/Num'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useOffersListQuery } from '@/hooks/useOfferQueries'
import {
  useCreateOfferMutation,
  useDeleteOfferMutation,
  usePublishOfferMutation,
  useUpdateOfferMutation,
} from '@/hooks/useOfferMutations'
import { useCanManageOffers } from '@/hooks/usePermissions'

const PAGE_SIZE = 20

const OFFER_TYPES: OfferType[] = ['Promotion']
const DISCOUNT_TYPES: OfferDiscountType[] = ['Percentage', 'FixedAmount']

interface OfferFormState {
  type: OfferType
  title: string
  description: string
  discountType: OfferDiscountType
  discountValue: string
  startsAt: string
  endsAt: string
}

const emptyForm = (): OfferFormState => ({
  type: 'Promotion',
  title: '',
  description: '',
  discountType: 'Percentage',
  discountValue: '',
  startsAt: '',
  endsAt: '',
})

function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString()
}

function offerToForm(offer: OfferDto): OfferFormState {
  return {
    type: offer.type ?? 'Promotion',
    title: offer.title ?? '',
    description: offer.description ?? '',
    discountType: offer.discountType ?? 'Percentage',
    discountValue: offer.discountValue != null ? String(offer.discountValue) : '',
    startsAt: toDatetimeLocal(offer.startsAt),
    endsAt: toDatetimeLocal(offer.endsAt),
  }
}

function formToRequest(form: OfferFormState): CreateOfferRequest {
  return {
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    startsAt: fromDatetimeLocal(form.startsAt),
    endsAt: fromDatetimeLocal(form.endsAt),
  }
}

function formatInstant(iso: string | undefined, locale: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function offerStatusLabel(
  status: string | undefined,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (status === 'Draft') return t.offers.statusDraft
  if (status === 'Published') return t.offers.statusPublished
  return status ?? '—'
}

function discountLabel(
  offer: OfferDto,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (offer.discountType === 'Percentage') {
    return `${offer.discountValue ?? 0}%`
  }
  if (offer.discountType === 'FixedAmount') {
    return `${offer.discountValue ?? 0} ${t.offers.fixedAmount}`
  }
  return String(offer.discountValue ?? '—')
}

export function OffersPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const { selectedRestaurantId, status: scopeStatus } = useRestaurantScope()
  const canManage = useCanManageOffers()

  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<OfferDto | null>(null)
  const [form, setForm] = useState<OfferFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<OfferDto | null>(null)

  const enabled = scopeStatus === 'ready' && Boolean(selectedRestaurantId)
  const listQuery = useOffersListQuery(
    selectedRestaurantId ?? undefined,
    page,
    PAGE_SIZE,
    enabled,
  )

  const createMutation = useCreateOfferMutation()
  const updateMutation = useUpdateOfferMutation()
  const publishMutation = usePublishOfferMutation()
  const deleteMutation = useDeleteOfferMutation()

  const mapError = (err: unknown): string =>
    isApiError(err) ? err.message : t.offers.errors.unknown

  const openCreate = () => {
    setEditingOffer(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  const openEdit = (offer: OfferDto) => {
    setEditingOffer(offer)
    setForm(offerToForm(offer))
    setFormOpen(true)
  }

  const closeForm = () => {
    if (createMutation.isPending || updateMutation.isPending) return
    setFormOpen(false)
    setEditingOffer(null)
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedRestaurantId || !canManage) return

    const body = formToRequest(form)
    try {
      if (editingOffer) {
        await updateMutation.mutateAsync({
          restaurantId: selectedRestaurantId,
          offerId: editingOffer.offerId,
          body,
        })
        toast('success', t.offers.updateSuccess)
      } else {
        await createMutation.mutateAsync({
          restaurantId: selectedRestaurantId,
          body,
        })
        toast('success', t.offers.createSuccess)
      }
      setFormOpen(false)
      setEditingOffer(null)
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  const handlePublish = async (offer: OfferDto): Promise<void> => {
    if (!selectedRestaurantId || !canManage) return
    try {
      await publishMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        offerId: offer.offerId,
      })
      toast('success', t.offers.publishSuccess)
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget || !selectedRestaurantId) return
    try {
      await deleteMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        offerId: deleteTarget.offerId,
      })
      toast('success', t.offers.deleteSuccess)
      setDeleteTarget(null)
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  if (!enabled) {
    return (
      <div>
        <PageHeader title={t.offers.title} subtitle={t.offers.subtitle} />
        <EmptyState
          icon="local_offer"
          title={t.scope.noRestaurantsTitle}
          description={t.scope.noRestaurantsBody}
        />
      </div>
    )
  }

  const offers = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const forbidden =
    listQuery.isError &&
    isApiError(listQuery.error) &&
    listQuery.error.code === 'FORBIDDEN'

  return (
    <div>
      <PageHeader
        title={t.offers.title}
        subtitle={t.offers.subtitle}
        actions={
          canManage ? (
            <Button size="sm" onClick={openCreate}>
              <MaterialIcon name="add" size={18} />
              {t.offers.create}
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <p className="text-label-sm text-on-surface-variant mb-4">
          {t.offers.readOnlyHint}
        </p>
      )}

      {listQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          {t.common.loading}
        </p>
      )}

      {listQuery.isError && (
        <EmptyState
          icon="error"
          title={forbidden ? t.offers.forbiddenTitle : t.offers.errorTitle}
          description={forbidden ? t.offers.forbiddenBody : t.offers.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void listQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {listQuery.isSuccess && offers.length === 0 && (
        <EmptyState
          icon="local_offer"
          title={t.offers.emptyTitle}
          description={t.offers.emptyBody}
          action={
            canManage ? (
              <Button variant="secondary" size="md" onClick={openCreate}>
                {t.offers.create}
              </Button>
            ) : undefined
          }
        />
      )}

      {listQuery.isSuccess && offers.length > 0 && (
        <>
          <DataTable className="mb-4">
            <DataTableHead>
              <DataTableHeader>{t.offers.columns.title}</DataTableHeader>
              <DataTableHeader>{t.offers.columns.discount}</DataTableHeader>
              <DataTableHeader className="hidden md:table-cell">
                {t.offers.columns.period}
              </DataTableHeader>
              <DataTableHeader>{t.offers.columns.status}</DataTableHeader>
              {canManage && (
                <DataTableHeader className="text-end">
                  {t.common.actions}
                </DataTableHeader>
              )}
            </DataTableHead>
            <DataTableBody>
              {offers.map((offer) => {
                const isDraft = offer.status === 'Draft'
                return (
                  <DataTableRow key={offer.offerId}>
                    <DataTableCell>
                      <div className="flex flex-col max-w-xs">
                        <span className="font-medium truncate">{offer.title ?? '—'}</span>
                        {offer.description && (
                          <span className="text-label-sm text-on-surface-variant truncate">
                            {offer.description}
                          </span>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell>{discountLabel(offer, t)}</DataTableCell>
                    <DataTableCell className="hidden md:table-cell">
                      <div className="flex flex-col text-label-sm">
                        <span>{formatInstant(offer.startsAt, locale)}</span>
                        <span className="text-on-surface-variant">
                          {formatInstant(offer.endsAt, locale)}
                        </span>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge
                        type="custom"
                        status={offer.status ?? ''}
                        label={offerStatusLabel(offer.status, t)}
                      />
                    </DataTableCell>
                    {canManage && (
                      <DataTableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          {isDraft && (
                            <>
                              <button
                                type="button"
                                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                                title={t.common.edit}
                                onClick={() => openEdit(offer)}
                              >
                                <MaterialIcon name="edit" size={18} />
                              </button>
                              <button
                                type="button"
                                className="p-2 rounded-lg text-primary hover:bg-primary/10"
                                title={t.offers.publish}
                                disabled={publishMutation.isPending}
                                onClick={() => void handlePublish(offer)}
                              >
                                <MaterialIcon name="publish" size={18} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="p-2 rounded-lg text-error hover:bg-error/10"
                            title={t.common.delete}
                            onClick={() => setDeleteTarget(offer)}
                          >
                            <MaterialIcon name="delete" size={18} />
                          </button>
                        </div>
                      </DataTableCell>
                    )}
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-label-sm text-on-surface-variant">
                {t.offers.page} <Num>{page}</Num> {t.offers.of} <Num>{totalPages}</Num>
                {' · '}
                <Num>{total}</Num> {t.offers.totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t.offers.previous}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t.offers.next}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingOffer ? t.offers.editTitle : t.offers.createTitle}
        description={editingOffer ? t.offers.editSubtitle : t.offers.createSubtitle}
        size="lg"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">
              {t.offers.fields.type}
            </span>
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, type: e.target.value as OfferType }))
              }
            >
              {OFFER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">
              {t.offers.fields.title}
            </span>
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">
              {t.offers.fields.description}
            </span>
            <textarea
              className="w-full min-h-[80px] rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface text-body-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              required
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">
                {t.offers.fields.discountType}
              </span>
              <Select
                value={form.discountType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    discountType: e.target.value as OfferDiscountType,
                  }))
                }
              >
                {DISCOUNT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt === 'Percentage'
                      ? t.offers.discountPercentage
                      : t.offers.discountFixedAmount}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">
                {t.offers.fields.discountValue}
              </span>
              <Input
                type="number"
                min={0}
                step={form.discountType === 'Percentage' ? 1 : 0.01}
                value={form.discountValue}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, discountValue: e.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">
                {t.offers.fields.startsAt}
              </span>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">
                {t.offers.fields.endsAt}
              </span>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? t.common.loading
                : t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title={t.offers.deleteTitle}
        message={t.offers.deleteMessage}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        variant="danger"
        busy={deleteMutation.isPending}
        closeOnConfirm={false}
      />
    </div>
  )
}

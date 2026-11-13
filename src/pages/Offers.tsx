import { useState, type FormEvent } from 'react'
import { isApiError } from '@/api/errors'
import {
  CURRENT_OFFER_TYPES,
  NO_OFFER_CONDITIONS,
  isOfferEditable,
  offerConditions,
  offerCurrency,
  type CreateOfferRequest,
  type OfferConditions,
  type OfferDiscountType,
  type OfferDto,
  type OfferType,
} from '@/api/offers'
import { OfferConditionsFields } from '@/components/offers/OfferConditionsFields'
import { OfferImpactCard } from '@/components/offers/OfferImpactCard'
import {
  offerConditionLabels,
  offerScheduleLabel,
  offerStatusLabel,
  offerTypeLabel,
  offerValueLabel,
} from '@/components/offers/offerText'
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
import { formatDate, formatDateRange } from '@/lib/format'
import { apiErrorText } from '@/lib/apiErrorText'

const PAGE_SIZE = 20

const DISCOUNT_TYPES: OfferDiscountType[] = ['Percentage', 'FixedAmount']

interface OfferFormState {
  type: OfferType
  title: string
  description: string
  discountType: OfferDiscountType
  discountValue: string
  startsAt: string
  endsAt: string
  conditions: OfferConditions
}

const emptyForm = (): OfferFormState => ({
  type: CURRENT_OFFER_TYPES[0],
  title: '',
  description: '',
  discountType: 'Percentage',
  discountValue: '',
  startsAt: '',
  endsAt: '',
  conditions: { ...NO_OFFER_CONDITIONS },
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
    type: offer.type ?? CURRENT_OFFER_TYPES[0],
    title: offer.title ?? '',
    description: offer.description ?? '',
    discountType: offer.discountType ?? 'Percentage',
    discountValue: offer.discountValue != null ? String(offer.discountValue) : '',
    startsAt: toDatetimeLocal(offer.startsAt),
    endsAt: toDatetimeLocal(offer.endsAt),
    conditions: offerConditions(offer),
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
    ...form.conditions,
  }
}

function offerPeriod(offer: OfferDto, locale: string): string {
  if (offer.startsAt && offer.endsAt) {
    return formatDateRange(offer.startsAt, offer.endsAt, locale)
  }
  if (offer.startsAt) return formatDate(offer.startsAt, locale)
  if (offer.endsAt) return formatDate(offer.endsAt, locale)
  return '—'
}

export function OffersPage() {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const {
    selectedRestaurantId,
    status: scopeStatus,
    branches,
    formatBranchLabel,
  } = useRestaurantScope()
  const canManage = useCanManageOffers()

  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<OfferDto | null>(null)
  const [form, setForm] = useState<OfferFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<OfferDto | null>(null)
  const [impactTarget, setImpactTarget] = useState<OfferDto | null>(null)

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
    apiErrorText(err, t, t.offers.errors.unknown)

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

    const { startTime, endTime } = form.conditions
    if (startTime && endTime && startTime >= endTime) {
      toast('error', t.offers.errors.hours)
      return
    }
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

  const currencyOf = (offer: Pick<OfferDto, 'branchIds'>): string | null =>
    offerCurrency(offer.branchIds ?? [], branches)

  const offerActions = (offer: OfferDto) => {
    if (!canManage) return null
    return (
      <div className="flex flex-wrap justify-end gap-1">
        {offer.status === 'Draft' && (
          <Button
            size="sm"
            disabled={publishMutation.isPending}
            onClick={() => void handlePublish(offer)}
          >
            {t.offers.publish}
          </Button>
        )}
        {offer.status !== 'Draft' && (
          <Button size="sm" variant="outline" onClick={() => setImpactTarget(offer)}>
            <MaterialIcon name="insights" size={16} />
            {t.offers.impactAction}
          </Button>
        )}
        {isOfferEditable(offer) && (
          <Button size="sm" variant="outline" onClick={() => openEdit(offer)}>
            <MaterialIcon name="edit" size={16} />
            {t.common.edit}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-error"
          onClick={() => setDeleteTarget(offer)}
        >
          <MaterialIcon name="delete" size={16} />
          {t.common.delete}
        </Button>
      </div>
    )
  }

  const offerDetails = (offer: OfferDto) => {
    const conditions = offerConditions(offer)
    const extras = offerConditionLabels(conditions, t.offers, locale)
    return (
      <>
        <span className="block">{offerScheduleLabel(conditions, t.offers)}</span>
        {extras.length > 0 && (
          <span className="block text-on-surface-variant">{extras.join(' · ')}</span>
        )}
      </>
    )
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
  const formTypes: OfferType[] = CURRENT_OFFER_TYPES.includes(
    form.type as (typeof CURRENT_OFFER_TYPES)[number],
  )
    ? [...CURRENT_OFFER_TYPES]
    : [form.type, ...CURRENT_OFFER_TYPES]
  const formCurrency = offerCurrency(form.conditions.branchIds, branches)
  const valueUnit =
    form.discountType === 'Percentage' ? t.offers.fields.percent : formCurrency
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
          <DataTable
            className="mb-4"
            cards={
              <div className="mb-4 grid gap-3">
                {offers.map((offer) => (
                  <article
                    key={offer.offerId}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface truncate">
                          {offer.title ?? '—'}
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          {offerTypeLabel(offer.type, t.offers)} ·{' '}
                          {offerValueLabel(offer, currencyOf(offer), t.offers, locale)}
                        </p>
                      </div>
                      <StatusBadge
                        type="custom"
                        status={offer.status ?? ''}
                        label={offerStatusLabel(offer.status, t.offers)}
                      />
                    </div>
                    <div className="mt-2 text-label-sm text-on-surface">
                      <span className="block">{offerPeriod(offer, locale)}</span>
                      {offerDetails(offer)}
                    </div>
                    {canManage && <div className="mt-3">{offerActions(offer)}</div>}
                  </article>
                ))}
              </div>
            }
          >
            <DataTableHead>
              <DataTableHeader>{t.offers.columns.title}</DataTableHeader>
              <DataTableHeader>{t.offers.columns.discount}</DataTableHeader>
              <DataTableHeader>{t.offers.columns.period}</DataTableHeader>
              <DataTableHeader>{t.offers.columns.status}</DataTableHeader>
              {canManage && (
                <DataTableHeader className="text-end">
                  {t.common.actions}
                </DataTableHeader>
              )}
            </DataTableHead>
            <DataTableBody>
              {offers.map((offer) => {
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
                    <DataTableCell>
                      <span className="block text-label-sm text-on-surface-variant">
                        {offerTypeLabel(offer.type, t.offers)}
                      </span>
                      <span className="block font-medium whitespace-nowrap">
                        {offerValueLabel(offer, currencyOf(offer), t.offers, locale)}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="text-label-sm">
                      <span className="block whitespace-nowrap">{offerPeriod(offer, locale)}</span>
                      {offerDetails(offer)}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge
                        type="custom"
                        status={offer.status ?? ''}
                        label={offerStatusLabel(offer.status, t.offers)}
                      />
                    </DataTableCell>
                    {canManage && (
                      <DataTableCell className="text-end">
                        {offerActions(offer)}
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
              {formTypes.map((type) => (
                <option key={type} value={type}>
                  {offerTypeLabel(type, t.offers)}
                </option>
              ))}
            </Select>
            {form.type in t.offers.typeHints && (
              <span className="text-label-sm text-on-surface-variant">
                {(t.offers.typeHints as Record<string, string>)[form.type]}
              </span>
            )}
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
                      : formCurrency
                        ? `${t.offers.discountFixedAmount} (${formCurrency})`
                        : t.offers.discountFixedAmount}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">
                {valueUnit
                  ? t.offers.fields.discountValueIn.replace('{unit}', valueUnit)
                  : t.offers.fields.discountValue}
              </span>
              <Input
                type="number"
                min={0}
                max={form.discountType === 'Percentage' ? 100 : undefined}
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

          <OfferConditionsFields
            value={form.conditions}
            onChange={(conditions) => setForm((prev) => ({ ...prev, conditions }))}
            branches={branches}
            formatBranchLabel={formatBranchLabel}
          />

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

      <Modal
        open={Boolean(impactTarget)}
        onClose={() => setImpactTarget(null)}
        title={t.offers.impact.title}
        description={impactTarget?.title}
        size="lg"
      >
        {impactTarget && selectedRestaurantId && (
          <OfferImpactCard restaurantId={selectedRestaurantId} offerId={impactTarget.offerId} />
        )}
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

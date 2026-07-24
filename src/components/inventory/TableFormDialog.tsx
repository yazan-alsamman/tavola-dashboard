import { useEffect, useState, type FormEvent } from 'react'
import type { FloorPlanDto } from '@/api/floorPlans'
import type {
  CreateTableRequest,
  TableDto,
  TableShapeDto,
  UpdateTableRequest,
} from '@/api/tables'
import { tableToUpdateRequest } from '@/api/tables'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import {
  useCreateTableMutation,
  useUpdateTableMutation,
} from '@/hooks/useInventoryMutations'
import {
  extractValidationFieldErrors,
  mapInventoryMutationError,
} from '@/lib/inventoryMutationErrors'

const DEFAULT_W = 72
const DEFAULT_H = 72

type Mode =
  | { kind: 'create'; floorPlanId: string; defaultX?: number; defaultY?: number }
  | { kind: 'edit'; table: TableDto }

interface TableFormDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  floorPlans: FloorPlanDto[]
  mode: Mode | null
}

interface FormState {
  floorPlanId: string
  tableNumber: string
  capacity: string
  positionX: string
  positionY: string
  width: string
  height: string
  rotation: string
  shape: TableShapeDto
  indoor: boolean
  vip: boolean
  smoking: boolean
}

function emptyForm(mode: Mode | null): FormState {
  if (mode?.kind === 'edit') {
    const tb = mode.table
    return {
      floorPlanId: tb.floorPlanId,
      tableNumber: tb.tableNumber,
      capacity: String(tb.capacity),
      positionX: tb.positionX != null ? String(tb.positionX) : '',
      positionY: tb.positionY != null ? String(tb.positionY) : '',
      width: tb.width != null ? String(tb.width) : String(DEFAULT_W),
      height: tb.height != null ? String(tb.height) : String(DEFAULT_H),
      rotation: tb.rotation != null ? String(tb.rotation) : '0',
      shape: tb.shape,
      indoor: tb.indoor,
      vip: tb.vip,
      smoking: tb.smoking,
    }
  }
  return {
    floorPlanId: mode?.kind === 'create' ? mode.floorPlanId : '',
    tableNumber: '',
    capacity: '4',
    positionX:
      mode?.kind === 'create' && mode.defaultX != null
        ? String(mode.defaultX)
        : '40',
    positionY:
      mode?.kind === 'create' && mode.defaultY != null
        ? String(mode.defaultY)
        : '40',
    width: String(DEFAULT_W),
    height: String(DEFAULT_H),
    rotation: '0',
    shape: 'Rectangle',
    indoor: true,
    vip: false,
    smoking: false,
  }
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function TableFormDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  floorPlans,
  mode,
}: TableFormDialogProps) {
  const { t } = useLocale()
  const createMutation = useCreateTableMutation()
  const updateMutation = useUpdateTableMutation()
  const [form, setForm] = useState<FormState>(() => emptyForm(mode))
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const pending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      setForm(emptyForm(mode))
      setFormError(null)
      setFieldErrors({})
      createMutation.reset()
      updateMutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!mode) return

    const tableNumber = form.tableNumber.trim()
    const capacity = Number(form.capacity)
    if (!tableNumber) {
      setFormError(t.inventory.tableNumberRequired)
      return
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setFormError(t.inventory.capacityInvalid)
      return
    }

    const geometry = {
      positionX: parseOptionalNumber(form.positionX),
      positionY: parseOptionalNumber(form.positionY),
      width: parseOptionalNumber(form.width),
      height: parseOptionalNumber(form.height),
      rotation: parseOptionalNumber(form.rotation),
    }

    setFormError(null)
    setFieldErrors({})

    try {
      if (mode.kind === 'create') {
        const body: CreateTableRequest = {
          floorPlanId: form.floorPlanId || mode.floorPlanId,
          tableNumber,
          capacity,
          shape: form.shape,
          indoor: form.indoor,
          vip: form.vip,
          smoking: form.smoking,
          ...geometry,
        }
        await createMutation.mutateAsync({
          restaurantId,
          branchId,
          body,
        })
      } else {
        const body: UpdateTableRequest = tableToUpdateRequest(mode.table, {
          tableNumber,
          capacity,
          shape: form.shape,
          indoor: form.indoor,
          vip: form.vip,
          smoking: form.smoking,
          ...geometry,
        })
        await updateMutation.mutateAsync({
          tableId: mode.table.tableId,
          body,
          scope: { restaurantId, branchId },
          floorPlanId: mode.table.floorPlanId,
        })
      }
      onClose()
    } catch (err) {
      const fields = extractValidationFieldErrors(err)
      setFieldErrors(fields)
      setFormError(
        fields.tableNumber ??
          fields.capacity ??
          mapInventoryMutationError(err, t.inventory.errors),
      )
    }
  }

  if (!mode) return null

  const title =
    mode.kind === 'create' ? t.inventory.createTable : t.inventory.editTable

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      size="md"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        {mode.kind === 'create' && (
          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              {t.inventory.floorPlan}
            </span>
            <select
              value={form.floorPlanId}
              onChange={(e) => set('floorPlanId')(e.target.value)}
              disabled={pending}
              className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md"
            >
              {floorPlans.map((fp) => (
                <option key={fp.floorPlanId} value={fp.floorPlanId}>
                  {fp.name}
                  {fp.isActive ? ` (${t.floorPlan.active})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              {t.tables.number}
            </span>
            <input
              value={form.tableNumber}
              onChange={(e) => set('tableNumber')(e.target.value)}
              disabled={pending}
              className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
              maxLength={50}
            />
            {fieldErrors.tableNumber && (
              <span className="text-label-sm text-error">
                {fieldErrors.tableNumber}
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              {t.tables.capacity}
            </span>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => set('capacity')(e.target.value)}
              disabled={pending}
              className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-label-md text-on-surface-variant">
            {t.tables.shape}
          </span>
          <select
            value={form.shape}
            onChange={(e) => set('shape')(e.target.value as TableShapeDto)}
            disabled={pending}
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
          >
            <option value="Rectangle">{t.tables.shapes.Rectangle}</option>
            <option value="Round">{t.tables.shapes.Round}</option>
          </select>
        </label>

        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="text-label-md text-on-surface-variant mb-1">
            {t.inventory.geometry}
          </legend>
          {(
            [
              ['positionX', t.inventory.positionX],
              ['positionY', t.inventory.positionY],
              ['width', t.inventory.width],
              ['height', t.inventory.height],
              ['rotation', t.inventory.rotation],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-label-sm text-on-surface-variant">
                {label}
              </span>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => set(key)(e.target.value)}
                disabled={pending}
                className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md"
              />
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-label-md">
            <input
              type="checkbox"
              checked={form.indoor}
              onChange={(e) => set('indoor')(e.target.checked)}
              disabled={pending}
            />
            {t.tables.indoor}
          </label>
          <label className="flex items-center gap-2 text-label-md">
            <input
              type="checkbox"
              checked={form.vip}
              onChange={(e) => set('vip')(e.target.checked)}
              disabled={pending}
            />
            {t.tables.vip}
          </label>
          <label className="flex items-center gap-2 text-label-md">
            <input
              type="checkbox"
              checked={form.smoking}
              onChange={(e) => set('smoking')(e.target.checked)}
              disabled={pending}
            />
            {t.tables.smoking}
          </label>
        </div>

        {formError && (
          <p className="text-label-sm text-error" role="alert">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-label-md text-on-surface-variant"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg text-label-md bg-primary text-on-primary disabled:opacity-50"
          >
            {pending ? t.inventory.saving : t.common.save}
          </button>
        </div>
      </form>
    </Modal>
  )
}

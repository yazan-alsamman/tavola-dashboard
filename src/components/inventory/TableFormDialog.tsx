import { useEffect, useState, type FormEvent } from 'react'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
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
import {
  DEFAULT_TABLE_HEIGHT,
  DEFAULT_TABLE_WIDTH,
} from '@/lib/floorGeometry'
import { tableFloor } from '@/lib/floors'

type Mode =
  | { kind: 'create'; floorPlanId: string }
  | { kind: 'edit'; table: TableDto }

interface TableFormDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  floorPlans: FloorPlanDto[]
  mode: Mode | null
  /** Dining areas of the table's floor plan; empty hides the area picker. */
  areas?: FloorPlanAreaDto[]
  /** Floors to choose from; empty hides the floor picker. */
  floors?: { value: number; label: string }[]
  /** Floor a new table starts on. */
  defaultFloor?: number
}

interface FormState {
  floorPlanId: string
  tableNumber: string
  capacity: string
  shape: TableShapeDto
  floor: number
  floorPlanAreaId: string
  indoor: boolean
  vip: boolean
  smoking: boolean
}

function emptyForm(mode: Mode | null, defaultFloor: number): FormState {
  if (mode?.kind === 'edit') {
    const tb = mode.table
    return {
      floorPlanId: tb.floorPlanId,
      tableNumber: tb.tableNumber,
      capacity: String(tb.capacity),
      shape: tb.shape,
      floor: tableFloor(tb),
      floorPlanAreaId: tb.floorPlanAreaId ?? '',
      indoor: tb.indoor,
      vip: tb.vip,
      smoking: tb.smoking,
    }
  }
  return {
    floorPlanId: mode?.kind === 'create' ? mode.floorPlanId : '',
    tableNumber: '',
    capacity: '4',
    shape: 'Rectangle',
    floor: defaultFloor,
    floorPlanAreaId: '',
    indoor: true,
    vip: false,
    smoking: false,
  }
}

export function TableFormDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  floorPlans,
  mode,
  areas = [],
  floors = [],
  defaultFloor = 0,
}: TableFormDialogProps) {
  const { t } = useLocale()
  const createMutation = useCreateTableMutation()
  const updateMutation = useUpdateTableMutation()
  const [form, setForm] = useState<FormState>(() => emptyForm(mode, defaultFloor))
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const pending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open) {
      setForm(emptyForm(mode, defaultFloor))
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

    const placement = {
      floor: form.floor,
      floorPlanAreaId: form.floorPlanAreaId || null,
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
          // No position: a new table waits in the "not placed yet" queue
          // until staff drag it onto the map.
          width: DEFAULT_TABLE_WIDTH,
          height: form.shape === 'Round' ? DEFAULT_TABLE_WIDTH : DEFAULT_TABLE_HEIGHT,
          ...placement,
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
          ...placement,
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

        {(floors.length > 1 || areas.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {floors.length > 1 && (
              <label className="block">
                <span className="text-label-md text-on-surface-variant">
                  {t.inventory.floor}
                </span>
                <select
                  value={form.floor}
                  onChange={(e) => set('floor')(Number(e.target.value))}
                  disabled={pending}
                  className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
                >
                  {floors.map((floor) => (
                    <option key={floor.value} value={floor.value}>
                      {floor.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {areas.length > 0 && (
              <label className="block">
                <span className="text-label-md text-on-surface-variant">
                  {t.inventory.area}
                </span>
                <select
                  value={form.floorPlanAreaId}
                  onChange={(e) => set('floorPlanAreaId')(e.target.value)}
                  disabled={pending}
                  className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
                >
                  <option value="">{t.inventory.noArea}</option>
                  {areas.map((area) => (
                    <option key={area.floorPlanAreaId} value={area.floorPlanAreaId}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

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

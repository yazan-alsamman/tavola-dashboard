import { useEffect, useState, type FormEvent } from 'react'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import type { TableDraft } from '@/hooks/useFloorPlanEditor'
import {
  isNumberTaken,
  nextNumberInArea,
  shapeChoiceOf,
  shapeSpan,
  type TableShapeChoice,
} from '@/lib/floorGrid'
import { cn } from '@/lib/utils'
import { apiErrorText } from '@/lib/apiErrorText'

const SHAPES: TableShapeChoice[] = ['square', 'round', 'long']

interface TableFormDialogProps {
  open: boolean
  onClose: () => void
  /** Null adds a table; a table edits it. */
  table: TableDto | null
  areas: FloorPlanAreaDto[]
  /** Every table of the branch, for numbering and duplicate checks. */
  branchTables: TableDto[]
  defaultAreaId?: string | null
  /** Rejects with a user-facing message when the API refuses. */
  onSubmit: (draft: TableDraft) => Promise<unknown>
}

interface FormState {
  tableNumber: string
  numberEdited: boolean
  capacity: string
  shape: TableShapeChoice
  floorPlanAreaId: string
}

function initialForm(
  table: TableDto | null,
  branchTables: TableDto[],
  defaultAreaId: string | null,
): FormState {
  if (table) {
    return {
      tableNumber: table.tableNumber,
      numberEdited: true,
      capacity: String(table.capacity),
      shape: shapeChoiceOf(table),
      floorPlanAreaId: table.floorPlanAreaId ?? '',
    }
  }
  return {
    tableNumber: nextNumberInArea(branchTables, defaultAreaId),
    numberEdited: false,
    capacity: '4',
    shape: 'square',
    floorPlanAreaId: defaultAreaId ?? '',
  }
}

/**
 * Add / edit a table: number, seats, shape and area only (CR p.05). The
 * grid size follows from seats and shape; the number is filled in for the
 * chosen area and never accepted twice in the branch.
 */
export function TableFormDialog({
  open,
  onClose,
  table,
  areas,
  branchTables,
  defaultAreaId = null,
  onSubmit,
}: TableFormDialogProps) {
  const { t } = useLocale()
  const [form, setForm] = useState<FormState>(() =>
    initialForm(table, branchTables, defaultAreaId),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initialForm(table, branchTables, defaultAreaId))
    setError(null)
    // Reset only when the dialog opens for a table (or for a new one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table?.tableId])

  const capacity = Number(form.capacity)
  const span = shapeSpan(form.shape, Number.isInteger(capacity) && capacity > 0 ? capacity : 1)

  const pickArea = (areaId: string) =>
    setForm((prev) => ({
      ...prev,
      floorPlanAreaId: areaId,
      tableNumber: prev.numberEdited
        ? prev.tableNumber
        : nextNumberInArea(branchTables, areaId || null),
    }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const tableNumber = form.tableNumber.trim()
    if (!tableNumber) return setError(t.floorGrid.numberRequired)
    if (!Number.isInteger(capacity) || capacity < 1) return setError(t.floorGrid.capacityInvalid)
    if (isNumberTaken(branchTables, tableNumber, table?.tableId)) {
      return setError(t.floorGrid.numberTaken)
    }
    setError(null)
    setPending(true)
    try {
      await onSubmit({
        tableNumber,
        capacity,
        shape: form.shape,
        floorPlanAreaId: form.floorPlanAreaId || null,
      })
      onClose()
    } catch (err) {
      setError(apiErrorText(err, t, t.inventory.errors.unknown))
    } finally {
      setPending(false)
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md'

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={
        table
          ? t.floorGrid.editTitle.replace('{table}', table.tableNumber)
          : t.floorGrid.createTitle
      }
      size="md"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        {areas.length > 0 && (
          <label className="block">
            <span className="text-label-md text-on-surface-variant">{t.floorGrid.formArea}</span>
            <select
              value={form.floorPlanAreaId}
              onChange={(e) => pickArea(e.target.value)}
              disabled={pending}
              className={inputClass}
            >
              <option value="">{t.floorGrid.noArea}</option>
              {areas.map((area) => (
                <option key={area.floorPlanAreaId} value={area.floorPlanAreaId}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-label-md text-on-surface-variant">{t.floorGrid.formNumber}</span>
            <input
              value={form.tableNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tableNumber: e.target.value, numberEdited: true }))
              }
              disabled={pending}
              dir="ltr"
              className={inputClass}
              maxLength={50}
            />
          </label>
          <label className="block">
            <span className="text-label-md text-on-surface-variant">{t.floorGrid.formCapacity}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
              disabled={pending}
              className={inputClass}
            />
          </label>
        </div>
        {!table && (
          <p className="-mt-2 text-label-sm text-on-surface-variant">{t.floorGrid.numberAuto}</p>
        )}

        <fieldset>
          <legend className="text-label-md text-on-surface-variant">{t.floorGrid.formShape}</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                aria-pressed={form.shape === shape}
                disabled={pending}
                onClick={() => setForm((prev) => ({ ...prev, shape }))}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-label-md',
                  form.shape === shape
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/40 text-on-surface hover:border-primary/50',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'border-2 border-current',
                    shape === 'round' && 'size-5 rounded-full',
                    shape === 'square' && 'size-5 rounded-sm',
                    shape === 'long' && 'h-4 w-8 rounded-sm',
                  )}
                />
                {t.floorGrid.shapes[shape]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-label-sm text-on-surface-variant">
            {t.floorGrid.sizeOnGrid
              .replace('{cols}', String(span.cols))
              .replace('{rows}', String(span.rows))}
          </p>
        </fieldset>

        {error && (
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-label-md text-on-surface-variant"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
          >
            {pending ? t.inventory.saving : t.common.save}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import {
  allowedTableStatusTransitions,
  type TableDto,
  type TableStatusDto,
} from '@/api/tables'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useChangeTableStatusMutation } from '@/hooks/useInventoryMutations'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'

interface ChangeTableStatusDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  table: TableDto | null
}

export function ChangeTableStatusDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  table,
}: ChangeTableStatusDialogProps) {
  const { t } = useLocale()
  const mutation = useChangeTableStatusMutation()
  const [status, setStatus] = useState<TableStatusDto | ''>('')
  const [error, setError] = useState<string | null>(null)

  const allowed = table ? allowedTableStatusTransitions(table.status) : []

  useEffect(() => {
    if (open && table) {
      setStatus(allowed[0] ?? '')
      setError(null)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table?.tableId, table?.status])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!table || !status) return
    setError(null)
    try {
      await mutation.mutateAsync({
        tableId: table.tableId,
        body: { status },
        scope: { restaurantId, branchId },
        floorPlanId: table.floorPlanId,
      })
      onClose()
    } catch (err) {
      setError(mapInventoryMutationError(err, t.inventory.errors))
    }
  }

  if (!table) return null

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => undefined : onClose}
      title={t.inventory.changeStatus}
      description={`${table.tableNumber} · ${t.status[table.status]}`}
      size="sm"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block">
          <span className="text-label-md text-on-surface-variant">
            {t.inventory.newStatus}
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TableStatusDto)}
            disabled={mutation.isPending || allowed.length === 0}
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
          >
            {allowed.map((s) => (
              <option key={s} value={s}>
                {t.status[s]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-label-sm text-on-surface-variant">
          {t.inventory.statusVsAvailability}
        </p>
        {error && (
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-label-md text-on-surface-variant"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !status}
            className="px-4 py-2 rounded-lg text-label-md bg-primary text-on-primary disabled:opacity-50"
          >
            {mutation.isPending ? t.inventory.saving : t.inventory.changeStatus}
          </button>
        </div>
      </form>
    </Modal>
  )
}

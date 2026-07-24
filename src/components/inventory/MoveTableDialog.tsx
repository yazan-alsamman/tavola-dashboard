import { useEffect, useState, type FormEvent } from 'react'
import type { FloorPlanDto } from '@/api/floorPlans'
import type { TableDto } from '@/api/tables'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useMoveTableMutation } from '@/hooks/useInventoryMutations'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'

interface MoveTableDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  table: TableDto | null
  floorPlans: FloorPlanDto[]
}

/**
 * Domain action: reassign floorPlanId within the same branch only.
 */
export function MoveTableDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  table,
  floorPlans,
}: MoveTableDialogProps) {
  const { t } = useLocale()
  const mutation = useMoveTableMutation()
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const targets = floorPlans.filter(
    (fp) => table && fp.floorPlanId !== table.floorPlanId,
  )
  const currentFloor = floorPlans.find(
    (fp) => fp.floorPlanId === table?.floorPlanId,
  )

  useEffect(() => {
    if (open) {
      setTargetId(targets[0]?.floorPlanId ?? '')
      setError(null)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table?.tableId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!table || !targetId) {
      setError(t.inventory.moveTargetRequired)
      return
    }
    setError(null)
    try {
      await mutation.mutateAsync({
        tableId: table.tableId,
        body: { targetFloorPlanId: targetId },
        scope: { restaurantId, branchId },
        sourceFloorPlanId: table.floorPlanId,
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
      title={t.inventory.moveTable}
      description={t.inventory.moveTableHint}
      size="sm"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          {t.inventory.currentFloorPlan}:{' '}
          <span className="font-medium text-on-surface">
            {currentFloor?.name ?? table.floorPlanId}
          </span>
        </p>

        {targets.length === 0 ? (
          <p className="text-label-sm text-on-surface-variant">
            {t.inventory.noMoveTargets}
          </p>
        ) : (
          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              {t.inventory.targetFloorPlan}
            </span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={mutation.isPending}
              className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2"
            >
              {targets.map((fp) => (
                <option key={fp.floorPlanId} value={fp.floorPlanId}>
                  {fp.name}
                  {fp.isActive ? ` (${t.floorPlan.active})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

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
            disabled={mutation.isPending || targets.length === 0 || !targetId}
            className="px-4 py-2 rounded-lg text-label-md bg-primary text-on-primary disabled:opacity-50"
          >
            {mutation.isPending ? t.inventory.saving : t.inventory.moveTable}
          </button>
        </div>
      </form>
    </Modal>
  )
}

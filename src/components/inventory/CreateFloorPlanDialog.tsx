import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useCreateFloorPlanMutation } from '@/hooks/useInventoryMutations'
import {
  extractValidationFieldErrors,
  mapInventoryMutationError,
} from '@/lib/inventoryMutationErrors'

interface CreateFloorPlanDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  onCreated?: (floorPlanId: string) => void
}

export function CreateFloorPlanDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  onCreated,
}: CreateFloorPlanDialogProps) {
  const { t } = useLocale()
  const mutation = useCreateFloorPlanMutation()
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setFormError(null)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setFormError(t.inventory.nameRequired)
      return
    }
    setFormError(null)
    try {
      const created = await mutation.mutateAsync({
        restaurantId,
        branchId,
        name: trimmed,
      })
      onCreated?.(created.floorPlanId)
      onClose()
    } catch (err) {
      const fields = extractValidationFieldErrors(err)
      setFormError(
        fields.name ??
          mapInventoryMutationError(err, t.inventory.errors),
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => undefined : onClose}
      title={t.inventory.createFloorPlan}
      description={t.inventory.createFloorPlanHint}
      size="sm"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block">
          <span className="text-label-md text-on-surface-variant">
            {t.inventory.floorPlanName}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={mutation.isPending}
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
            maxLength={100}
          />
        </label>
        {formError && (
          <p className="text-label-sm text-error" role="alert">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-high"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg text-label-md bg-primary text-on-primary disabled:opacity-50"
          >
            {mutation.isPending
              ? t.inventory.saving
              : t.inventory.createFloorPlan}
          </button>
        </div>
      </form>
    </Modal>
  )
}

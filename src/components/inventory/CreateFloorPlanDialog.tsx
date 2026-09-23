import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useCreateFloorPlanMutation } from '@/hooks/useInventoryMutations'
import {
  extractValidationFieldErrors,
  mapInventoryMutationError,
} from '@/lib/inventoryMutationErrors'
import { cn } from '@/lib/utils'

interface CreateFloorPlanDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  onCreated?: (floorPlanId: string) => void
  /** `area` frames the floor plan as a named area of the branch (Floor Plan page). */
  variant?: 'floorPlan' | 'area'
  /** Names already used in this branch; matching suggestions are hidden. */
  existingNames?: string[]
}

export function CreateFloorPlanDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  onCreated,
  variant = 'floorPlan',
  existingNames = [],
}: CreateFloorPlanDialogProps) {
  const { t } = useLocale()
  const mutation = useCreateFloorPlanMutation()
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const isArea = variant === 'area'
  const taken = new Set(existingNames.map((n) => n.trim().toLocaleLowerCase()))
  const suggestions = t.floorPlan.areaSuggestions.filter(
    (label) => !taken.has(label.toLocaleLowerCase()),
  )

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
      setFormError(isArea ? t.floorPlan.areaNameRequired : t.inventory.nameRequired)
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

  const title = isArea ? t.floorPlan.addArea : t.inventory.createFloorPlan

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => undefined : onClose}
      title={title}
      description={isArea ? t.floorPlan.addAreaHint : t.inventory.createFloorPlanHint}
      size="sm"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block">
          <span className="text-label-md text-on-surface-variant">
            {isArea ? t.floorPlan.areaName : t.inventory.floorPlanName}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={mutation.isPending}
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={isArea ? t.floorPlan.areaNamePlaceholder : undefined}
            autoFocus
            maxLength={100}
          />
        </label>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-label-sm text-on-surface-variant">
              {t.floorPlan.areaSuggestionsLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((label) => {
                const picked = name.trim() === label
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setName(label)
                      setFormError(null)
                    }}
                    aria-pressed={picked}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-label-md min-h-9 transition-colors',
                      picked
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface hover:border-primary/50',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

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
            {mutation.isPending ? t.inventory.saving : title}
          </button>
        </div>
      </form>
    </Modal>
  )
}

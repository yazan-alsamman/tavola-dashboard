import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useCreateFloorPlanAreaMutation } from '@/hooks/useInventoryMutations'
import { isApiError } from '@/api/errors'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import {
  extractValidationFieldErrors,
  mapInventoryMutationError,
} from '@/lib/inventoryMutationErrors'
import { HALL_COLOR_PRESETS } from '@/lib/floorPartitions'
import { cn } from '@/lib/utils'

interface CreateFloorPlanAreaDialogProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  branchId: string
  floorPlanId: string
  sortOrder: number
  existingNames: string[]
  /** When set, the parent assigns tables that meet this outline after create. */
  drawn?: boolean
  onCreated: (area: FloorPlanAreaDto) => void
}

export function CreateFloorPlanAreaDialog({
  open,
  onClose,
  restaurantId,
  branchId,
  floorPlanId,
  sortOrder,
  existingNames,
  drawn = false,
  onCreated,
}: CreateFloorPlanAreaDialogProps) {
  const { t } = useLocale()
  const mutation = useCreateFloorPlanAreaMutation()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(HALL_COLOR_PRESETS[0])
  const [formError, setFormError] = useState<string | null>(null)

  const taken = new Set(existingNames.map((item) => item.trim().toLocaleLowerCase()))
  const suggestions = t.floorPlan.areaSuggestions.filter(
    (label) => !taken.has(label.toLocaleLowerCase()),
  )

  useEffect(() => {
    if (open) {
      setName('')
      setColor(HALL_COLOR_PRESETS[0])
      setFormError(null)
      mutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setFormError(t.floorPlan.areaNameRequired)
      return
    }
    setFormError(null)
    try {
      const created = await mutation.mutateAsync({
        restaurantId,
        branchId,
        floorPlanId,
        body: { name: trimmed, color, sortOrder },
      })
      onCreated(created)
      onClose()
    } catch (err) {
      const fields = extractValidationFieldErrors(err)
      const takenName =
        isApiError(err) && err.code === 'CONFLICT'
          ? t.floorPlan.hallNameTaken
          : null
      setFormError(
        fields.name ??
          takenName ??
          mapInventoryMutationError(err, t.inventory.errors),
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => undefined : onClose}
      title={t.floorPlan.addHall}
      description={drawn ? t.floorPlan.drawHallHint : t.floorPlan.addHallHint}
      size="sm"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block">
          <span className="text-label-md text-on-surface-variant">
            {t.floorPlan.hallName}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={mutation.isPending}
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t.floorPlan.areaNamePlaceholder}
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
                const index = t.floorPlan.areaSuggestions.indexOf(label)
                const swatch =
                  HALL_COLOR_PRESETS[index % HALL_COLOR_PRESETS.length] ??
                  HALL_COLOR_PRESETS[0]
                const picked = name.trim() === label
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setName(label)
                      setColor(swatch)
                      setFormError(null)
                    }}
                    aria-pressed={picked}
                    className={cn(
                      'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-label-md transition-colors',
                      picked
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface hover:border-primary/50',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: swatch }}
                      aria-hidden
                    />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-label-sm text-on-surface-variant">
            {t.floorPlan.hallColor}
          </p>
          <div className="flex flex-wrap gap-2" role="listbox" aria-label={t.floorPlan.hallColor}>
            {HALL_COLOR_PRESETS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="option"
                aria-selected={color === swatch}
                aria-label={swatch}
                disabled={mutation.isPending}
                onClick={() => setColor(swatch)}
                className={cn(
                  'h-9 w-9 rounded-full border-2',
                  color === swatch ? 'border-on-surface' : 'border-transparent',
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </div>

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
            className="rounded-lg px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-high"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
          >
            {mutation.isPending ? t.inventory.saving : t.floorPlan.addHall}
          </button>
        </div>
      </form>
    </Modal>
  )
}

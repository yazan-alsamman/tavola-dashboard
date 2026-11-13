import { useEffect, useState, type FormEvent } from 'react'
import {
  FLOOR_PLAN_AREA_FEATURES,
  type FloorPlanAreaDto,
  type FloorPlanAreaFeature,
} from '@/api/floorPlanAreas'
import { Modal } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import type { AreaDraft } from '@/hooks/useFloorPlanEditor'
import { AREA_COLOR_PRESETS } from '@/lib/floorGrid'
import { cn } from '@/lib/utils'
import { apiErrorText } from '@/lib/apiErrorText'

interface FloorAreaDialogProps {
  open: boolean
  onClose: () => void
  /** Null names a newly drawn area; an area edits it. */
  area: FloorPlanAreaDto | null
  existingNames: string[]
  /** Rejects with a user-facing message when the API refuses. */
  onSubmit: (draft: AreaDraft) => Promise<unknown>
  /** Edit mode only: redraw the rectangle, or delete the area. */
  onRedraw?: () => void
  onDelete?: () => void
}

/** Name, colour and guest-facing features of an area (CR p.05). */
export function FloorAreaDialog({
  open,
  onClose,
  area,
  existingNames,
  onSubmit,
  onRedraw,
  onDelete,
}: FloorAreaDialogProps) {
  const { t } = useLocale()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(AREA_COLOR_PRESETS[0])
  const [features, setFeatures] = useState<FloorPlanAreaFeature[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const taken = new Set(
    existingNames
      .filter((item) => item !== area?.name)
      .map((item) => item.trim().toLocaleLowerCase()),
  )
  const suggestions = t.floorPlan.areaSuggestions.filter(
    (label) => !taken.has(label.toLocaleLowerCase()),
  )

  useEffect(() => {
    if (!open) return
    setName(area?.name ?? '')
    setColor(area?.color ?? AREA_COLOR_PRESETS[existingNames.length % AREA_COLOR_PRESETS.length])
    setFeatures(area?.features ?? [])
    setError(null)
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area?.floorPlanAreaId])

  const toggle = (feature: FloorPlanAreaFeature) =>
    setFeatures((current) =>
      current.includes(feature)
        ? current.filter((item) => item !== feature)
        : [...current, feature],
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError(t.floorGrid.areaNameRequired)
    if (taken.has(trimmed.toLocaleLowerCase())) return setError(t.floorGrid.areaNameTaken)
    setError(null)
    setPending(true)
    try {
      await onSubmit({ name: trimmed, color, features })
      onClose()
    } catch (err) {
      setError(apiErrorText(err, t, t.inventory.errors.unknown))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={area ? t.floorGrid.editArea : t.floorGrid.newAreaTitle}
      size="md"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        <label className="block">
          <span className="text-label-md text-on-surface-variant">{t.floorGrid.areaName}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-lg bg-surface-container-low px-3 py-2 text-body-md"
            placeholder={t.floorPlan.areaNamePlaceholder}
            maxLength={100}
            autoFocus
          />
        </label>
        {!area && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 6).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setName(label)}
                aria-pressed={name.trim() === label}
                className={cn(
                  'min-h-9 rounded-full border px-3 text-label-md',
                  name.trim() === label
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant/40 bg-surface-container-low hover:border-primary/50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <fieldset>
          <legend className="text-label-md text-on-surface-variant">{t.floorGrid.areaColor}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {AREA_COLOR_PRESETS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-pressed={color === swatch}
                aria-label={swatch}
                onClick={() => setColor(swatch)}
                className={cn(
                  'size-9 rounded-full border-2',
                  color === swatch ? 'border-on-surface' : 'border-transparent',
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-label-md text-on-surface-variant">
            {t.floorGrid.areaFeatures}
          </legend>
          <p className="text-label-sm text-on-surface-variant">{t.floorGrid.featuresHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FLOOR_PLAN_AREA_FEATURES.map((feature) => (
              <button
                key={feature}
                type="button"
                aria-pressed={features.includes(feature)}
                onClick={() => toggle(feature)}
                className={cn(
                  'min-h-9 rounded-full border px-3 text-label-md',
                  features.includes(feature)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/40 text-on-surface hover:border-primary/50',
                )}
              >
                {t.floorGrid.features[feature]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {area && onDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="me-auto rounded-lg px-3 py-2 text-label-md text-error hover:bg-error/10"
            >
              {t.floorGrid.deleteArea}
            </button>
          )}
          {area && onRedraw && (
            <button
              type="button"
              disabled={pending}
              onClick={onRedraw}
              className="rounded-lg px-3 py-2 text-label-md text-primary hover:bg-primary/10"
            >
              {t.floorGrid.redrawArea}
            </button>
          )}
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

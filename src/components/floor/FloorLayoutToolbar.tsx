import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'
import { TABLE_PRESETS, type TablePreset } from '@/lib/floorGeometry'
import { cn } from '@/lib/utils'

interface FloorLayoutToolbarProps {
  canManage: boolean
  snapEnabled: boolean
  onSnapToggle: () => void
  zoomPercent: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  activePresetId: TablePreset['id'] | null
  onPreset: (preset: TablePreset) => void
  onClearPreset: () => void
  placing: boolean
}

export function FloorLayoutToolbar({
  canManage,
  snapEnabled,
  onSnapToggle,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
  activePresetId,
  onPreset,
  onClearPreset,
  placing,
}: FloorLayoutToolbarProps) {
  const { t } = useLocale()
  const presetLabels: Record<TablePreset['id'], string> = {
    round2: t.floorPlan.presetRound2,
    round4: t.floorPlan.presetRound4,
    rect4: t.floorPlan.presetRect4,
    rect6: t.floorPlan.presetRect6,
    rect8: t.floorPlan.presetRect8,
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 sm:p-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onZoomOut}
          aria-label={t.floorPlan.zoomOut}
        >
          <MaterialIcon name="zoom_out" size={18} />
        </Button>
        <span className="min-w-12 text-center text-label-sm text-on-surface-variant tabular-nums">
          {zoomPercent}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onZoomIn}
          aria-label={t.floorPlan.zoomIn}
        >
          <MaterialIcon name="zoom_in" size={18} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onFit}
          aria-label={t.floorPlan.fitView}
        >
          <MaterialIcon name="fit_screen" size={18} />
        </Button>
        <Button
          type="button"
          variant={snapEnabled ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onSnapToggle}
          className="ms-1 shrink-0"
        >
          <MaterialIcon name="grid_on" size={16} />
          {snapEnabled ? t.floorPlan.snapOn : t.floorPlan.snapOff}
        </Button>
      </div>

      {canManage && (
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-label-sm text-on-surface-variant">
            {t.floorPlan.presetsLabel}
          </span>
          {TABLE_PRESETS.map((preset) => {
            const active = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                disabled={placing}
                onClick={() =>
                  active ? onClearPreset() : onPreset(preset)
                }
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-label-md font-semibold min-h-10',
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface hover:border-primary/50',
                )}
              >
                {presetLabels[preset.id]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

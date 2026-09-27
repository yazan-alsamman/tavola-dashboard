import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { TABLE_PRESETS, type TablePreset } from '@/lib/floorGeometry'
import { cn } from '@/lib/utils'

interface FloorPlanAreaBarProps {
  areas: FloorPlanAreaDto[]
  tables: TableDto[]
  highlightedAreaId: string | null
  drawHall: boolean
  canManage: boolean
  onHighlight: (areaId: string | null) => void
  onAdd: () => void
  onToggleDraw: () => void
  onDelete: (area: FloorPlanAreaDto) => void
  floorName?: string | null
  activePresetId?: TablePreset['id'] | null
  onPreset?: (preset: TablePreset | null) => void
  placing?: boolean
}

/** Halls inside the open floor plan. Drawing assigns tables; the outline follows them. */
export function FloorPlanAreaBar({
  areas,
  tables,
  highlightedAreaId,
  drawHall,
  canManage,
  onHighlight,
  onAdd,
  onToggleDraw,
  onDelete,
  floorName,
  activePresetId = null,
  onPreset,
  placing = false,
}: FloorPlanAreaBarProps) {
  const { t } = useLocale()
  const presetLabels: Record<TablePreset['id'], string> = {
    round2: t.floorPlan.presetRound2,
    round4: t.floorPlan.presetRound4,
    rect4: t.floorPlan.presetRect4,
    rect6: t.floorPlan.presetRect6,
    rect8: t.floorPlan.presetRect8,
  }

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3">
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={drawHall ? 'primary' : 'secondary'}
            size="sm"
            onClick={onToggleDraw}
            aria-pressed={drawHall}
          >
            <MaterialIcon name="gesture" size={18} />
            {drawHall ? t.floorPlan.drawHallActive : t.floorPlan.drawHall}
          </Button>
          <span className="text-label-sm text-on-surface-variant">
            {t.floorPlan.presetsLabel}
          </span>
          {TABLE_PRESETS.map((preset) => {
            const active = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                disabled={placing}
                onClick={() => onPreset?.(active ? null : preset)}
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-md font-semibold text-on-surface">
          {t.floorPlan.hallsLabel}
          {floorName ? ` · ${floorName}` : ''}
        </span>
        <button
          type="button"
          onClick={() => onHighlight(null)}
          className={cn(
            'min-h-10 rounded-full border px-3 text-label-md',
            highlightedAreaId == null
              ? 'border-primary bg-primary-container text-on-primary-container'
              : 'border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          {t.floorPlan.allHalls}
        </button>
        {areas.map((area) => {
          const count = tables.filter(
            (table) => table.floorPlanAreaId === area.floorPlanAreaId,
          ).length
          const selected = highlightedAreaId === area.floorPlanAreaId
          return (
            <div key={area.floorPlanAreaId} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onHighlight(selected ? null : area.floorPlanAreaId)
                }
                className={cn(
                  'flex min-h-10 items-center gap-2 rounded-full border px-3 text-label-md',
                  selected
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant/40 bg-surface-container-lowest',
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: area.color }}
                  aria-hidden
                />
                <span className="max-w-40 truncate font-semibold">{area.name}</span>
                <Num>{count}</Num>
              </button>
              {canManage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.floorPlan.deleteHall}
                  onClick={() => onDelete(area)}
                >
                  <MaterialIcon name="delete" size={16} />
                </Button>
              )}
            </div>
          )
        })}
        {canManage && (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <MaterialIcon name="add" size={18} />
            {t.floorPlan.addHall}
          </Button>
        )}
      </div>
      <p className="text-label-sm text-on-surface-variant">
        {drawHall ? t.floorPlan.drawHallHint : t.floorPlan.partitionNote}
      </p>
    </div>
  )
}

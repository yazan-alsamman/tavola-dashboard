import { useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Num } from '@/components/ui/Num'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import type { Table, TableStatus } from '@/types'
import {
  FLOOR_CANVAS,
  statusRing,
  clampFloorPosition,
  type FloorTableLayout,
  type FloorZone,
} from '@/lib/floorLayout'

interface FloorMapSpatialProps {
  tables: Table[]
  floorBlueprint: FloorTableLayout[]
  floorZones: FloorZone[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  compact?: boolean
  getGuestName?: (table: Table) => string | undefined
  editMode?: boolean
  selectedZoneId?: string | null
  onZoneSelect?: (id: string | null) => void
  onTableMove?: (tableId: string, x: number, y: number) => void
  onZoneMove?: (zoneId: string, x: number, y: number) => void
}

export function FloorMapSpatial({
  tables,
  floorBlueprint,
  floorZones,
  selectedId,
  onSelect,
  compact = false,
  getGuestName,
  editMode = false,
  selectedZoneId,
  onZoneSelect,
  onTableMove,
  onZoneMove,
}: FloorMapSpatialProps) {
  const { t } = useLocale()
  const tableMap = new Map(tables.map((tb) => [tb.id, tb]))
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ type: 'table' | 'zone'; id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, type: 'table' | 'zone', id: string, origX: number, origY: number) => {
      if (!editMode) return
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = { type, id, startX: e.clientX, startY: e.clientY, origX, origY }
      if (type === 'zone') onZoneSelect?.(id)
    },
    [editMode, onZoneSelect],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !editMode) return
      const el = canvasRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dx = ((e.clientX - drag.startX) / rect.width) * FLOOR_CANVAS.w
      const dy = ((e.clientY - drag.startY) / rect.height) * FLOOR_CANVAS.h

      if (drag.type === 'table') {
        const layout = floorBlueprint.find((l) => l.id === drag.id)
        if (layout) {
          const clamped = clampFloorPosition(drag.origX + dx, drag.origY + dy, layout.w, layout.h)
          onTableMove?.(drag.id, clamped.x, clamped.y)
        }
      } else {
        const zone = floorZones.find((z) => z.id === drag.id)
        if (zone) {
          const newX = Math.max(0, Math.min(100 - zone.w, drag.origX + (dx / FLOOR_CANVAS.w) * 100))
          const newY = Math.max(0, Math.min(100 - zone.h, drag.origY + (dy / FLOOR_CANVAS.h) * 100))
          onZoneMove?.(drag.id, newX, newY)
        }
      }
    },
    [editMode, floorBlueprint, floorZones, onTableMove, onZoneMove],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const loungeZones = floorZones.filter((z) => z.type === 'lounge')
  const stripZones = floorZones.filter((z) => z.type === 'strip')

  return (
    <div
      className={cn(
        'relative w-full bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden',
        compact ? 'h-[200px]' : 'h-[min(480px,55vh)]',
        editMode && 'ring-2 ring-primary/40',
      )}
    >
      {editMode && (
        <div className="absolute top-2 start-2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container text-label-sm font-semibold">
          <MaterialIcon name="edit" size={14} />
          {t.floorPlan.editMode}
        </div>
      )}

      <div
        ref={canvasRef}
        className="absolute inset-0 top-[12%] bottom-[10%]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="relative w-full h-full" style={{ maxWidth: FLOOR_CANVAS.w, margin: '0 auto' }}>
          {stripZones.map((zone) => (
            <div
              key={zone.id}
              className={cn(
                'absolute flex items-center justify-center border border-dashed border-outline-variant/50',
                zone.labelKey === 'kitchen' && 'bg-surface-container border-b',
                zone.labelKey === 'entrance' && 'bg-primary/5 border-t border-primary/20',
                zone.labelKey === 'bar' && 'bg-surface-container/50 opacity-70',
                editMode && 'cursor-move hover:border-primary/50',
                selectedZoneId === zone.id && editMode && 'border-primary ring-2 ring-primary/20',
              )}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
              }}
              onPointerDown={(e) => editMode && handlePointerDown(e, 'zone', zone.id, zone.x, zone.y)}
            >
              <span className="text-label-sm font-bold text-on-surface-variant tracking-wide pointer-events-none">
                {t.floorPlan[zone.labelKey]}
              </span>
            </div>
          ))}

          {loungeZones.map((zone) => (
            <div
              key={zone.id}
              className={cn(
                'absolute rounded-lg border border-dashed border-outline-variant bg-secondary-container/15 pointer-events-auto',
                editMode && 'cursor-move hover:border-primary/50 hover:bg-secondary-container/25',
                selectedZoneId === zone.id && editMode && 'border-primary ring-2 ring-primary/20 bg-primary/5',
              )}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
              }}
              onPointerDown={(e) => {
                if (editMode) {
                  handlePointerDown(e, 'zone', zone.id, zone.x, zone.y)
                }
              }}
            >
              <span className="absolute top-1 inset-x-0 text-center text-label-sm font-bold text-primary pointer-events-none">
                {t.floorPlan[zone.labelKey]}
              </span>
            </div>
          ))}

          {floorBlueprint.map((layout) => {
            const table = tableMap.get(layout.id)
            if (!table) return null
            const guest = getGuestName?.(table)
            const isSelected = selectedId === table.id
            const occupied = table.status === 'occupied'

            return (
              <button
                key={table.id}
                type="button"
                disabled={!editMode && table.status === 'out_of_service'}
                onClick={() => !editMode && onSelect?.(table.id)}
                onPointerDown={(e) => {
                  if (editMode) {
                    handlePointerDown(e, 'table', table.id, layout.x, layout.y)
                  }
                }}
                className={cn(
                  'absolute flex flex-col items-center justify-center transition-all duration-200 z-10',
                  layout.shape === 'round' ? 'rounded-lg' : 'rounded',
                  statusRing[table.status],
                  isSelected && !editMode && 'ring-2 ring-primary/30 scale-105 z-20',
                  editMode && 'cursor-move ring-2 ring-primary/20 hover:scale-105',
                  !editMode && onSelect && table.status !== 'out_of_service' && 'hover:scale-105 cursor-pointer',
                  table.status === 'out_of_service' && !editMode && 'cursor-not-allowed',
                  compact && 'min-w-0 min-h-0',
                )}
                style={{
                  left: `${(layout.x / FLOOR_CANVAS.w) * 100}%`,
                  top: `${(layout.y / FLOOR_CANVAS.h) * 100}%`,
                  width: `${(layout.w / FLOOR_CANVAS.w) * 100}%`,
                  height: `${(layout.h / FLOOR_CANVAS.h) * 100}%`,
                }}
                title={table.name}
              >
                  <Num className={cn('font-bold text-[10px]', occupied ? 'text-on-primary-container' : 'text-primary')}>
                  {table.number}
                </Num>
                {!compact && occupied && (
                  <MaterialIcon name="person" size={12} filled className="text-on-primary-container" />
                )}
                {!compact && guest && !editMode && (
                  <span className="text-[8px] truncate max-w-full px-1 mt-0.5 opacity-80">{guest}</span>
                )}
                {editMode && (
                  <MaterialIcon name="drag_indicator" size={10} className="text-on-surface-variant opacity-60" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {!compact && !editMode && (
        <div className="absolute bottom-[11%] start-3 flex gap-3 z-20">
          {(['available', 'reserved', 'occupied'] as TableStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-label-sm text-on-surface-variant bg-surface-container-lowest/80 px-2 py-0.5 rounded-full">
              <span className={cn(
                'w-3 h-3 rounded-full',
                s === 'occupied' ? 'bg-primary-container' : s === 'available' ? 'border border-outline-variant' : 'bg-secondary-container border border-primary-container',
              )} />
              {t.status[s]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function FloorMapMini({ tables }: Pick<FloorMapSpatialProps, 'tables'>) {
  const { t } = useLocale()

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {tables.slice(0, 8).map((table) => {
          const occupied = table.status === 'occupied'
          const available = table.status === 'available'
          return (
            <div
              key={table.id}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all',
                occupied && 'bg-primary-container text-on-primary-container shadow-sm',
                available && 'border-2 border-outline-variant/40 text-on-surface-variant hover:border-primary/50',
                table.status === 'reserved' && 'bg-secondary-container text-primary border border-primary-container',
              )}
            >
              <Num className="text-[10px] font-bold">T{table.number}</Num>
              {occupied && <MaterialIcon name="person" size={14} filled />}
              {available && <MaterialIcon name="event_seat" size={14} />}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex justify-around border-t border-outline-variant/20 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-container" />
          <span className="text-label-sm text-on-surface-variant">{t.status.occupied}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-outline-variant" />
          <span className="text-label-sm text-on-surface-variant">{t.status.available}</span>
        </div>
      </div>
    </>
  )
}

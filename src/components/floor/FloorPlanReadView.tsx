import { useRef, useState } from 'react'
import type { TableDto, TableStatusDto } from '@/api/tables'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'

const DEFAULT_W = 72
const DEFAULT_H = 72
const CANVAS_PAD = 24

const statusFill: Record<TableStatusDto, string> = {
  Available: 'bg-surface-variant text-on-surface-variant border-outline-variant/40',
  Occupied: 'bg-primary text-on-primary border-primary',
  Cleaning: 'bg-warning/15 text-warning border-warning/40',
  Disabled: 'bg-error/10 text-error border-error/30',
}

interface FloorPlanReadViewProps {
  tables: TableDto[]
  selectedTableId: string | null
  onSelectTable: (tableId: string | null) => void
  /** When true, tables can be dragged; persist only on pointer-up via onReposition. */
  repositionEnabled?: boolean
  repositionBusyTableId?: string | null
  onReposition?: (
    tableId: string,
    positionX: number,
    positionY: number,
  ) => void
}

interface DragState {
  tableId: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  currentX: number
  currentY: number
}

/**
 * Floor visualization from backend TableDto geometry.
 * Uses physical `left`/`top` — never mirrors X under RTL.
 * Drag is local until pointer-up; no network on pointer-move.
 */
export function FloorPlanReadView({
  tables,
  selectedTableId,
  onSelectTable,
  repositionEnabled = false,
  repositionBusyTableId = null,
  onReposition,
}: FloorPlanReadViewProps) {
  const { t } = useLocale()
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragMoved = useRef(false)

  const placed = tables.filter(
    (tb) => tb.positionX != null && tb.positionY != null,
  )
  const unplaced = tables.filter(
    (tb) => tb.positionX == null || tb.positionY == null,
  )

  let maxX = 400
  let maxY = 300
  for (const tb of placed) {
    const w = tb.width ?? DEFAULT_W
    const h = tb.height ?? DEFAULT_H
    const x =
      drag?.tableId === tb.tableId ? drag.currentX : (tb.positionX ?? 0)
    const y =
      drag?.tableId === tb.tableId ? drag.currentY : (tb.positionY ?? 0)
    maxX = Math.max(maxX, x + w + CANVAS_PAD)
    maxY = Math.max(maxY, y + h + CANVAS_PAD)
  }

  const endDrag = (state: DragState) => {
    setDrag(null)
    if (!dragMoved.current) return
    if (
      state.currentX !== state.originX ||
      state.currentY !== state.originY
    ) {
      onReposition?.(state.tableId, state.currentX, state.currentY)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="relative w-full overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-low"
        data-testid="floor-plan-canvas"
        dir="ltr"
        onPointerMove={(e) => {
          if (!drag) return
          const dx = e.clientX - drag.startClientX
          const dy = e.clientY - drag.startClientY
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
          setDrag({
            ...drag,
            currentX: Math.max(0, Math.round(drag.originX + dx)),
            currentY: Math.max(0, Math.round(drag.originY + dy)),
          })
        }}
        onPointerUp={() => {
          if (drag) endDrag(drag)
        }}
        onPointerLeave={() => {
          if (drag) endDrag(drag)
        }}
      >
        <div
          className="relative mx-auto"
          style={{ width: maxX, height: maxY, minHeight: 280 }}
        >
          {placed.map((tb) => {
            const w = tb.width ?? DEFAULT_W
            const h = tb.height ?? DEFAULT_H
            const selected = selectedTableId === tb.tableId
            const round = tb.shape === 'Round'
            const x =
              drag?.tableId === tb.tableId
                ? drag.currentX
                : (tb.positionX ?? 0)
            const y =
              drag?.tableId === tb.tableId
                ? drag.currentY
                : (tb.positionY ?? 0)
            const busy = repositionBusyTableId === tb.tableId
            return (
              <button
                key={tb.tableId}
                type="button"
                data-testid={`floor-table-${tb.tableId}`}
                data-x={x}
                data-y={y}
                aria-label={`${tb.tableNumber} ${tb.status}`}
                disabled={busy}
                onClick={() => {
                  if (dragMoved.current) {
                    dragMoved.current = false
                    return
                  }
                  onSelectTable(selected ? null : tb.tableId)
                }}
                onPointerDown={(e) => {
                  if (!repositionEnabled || busy || !onReposition) return
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId)
                  } catch {
                    // happy-dom / some browsers may not support capture
                  }
                  dragMoved.current = false
                  setDrag({
                    tableId: tb.tableId,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    originX: tb.positionX ?? 0,
                    originY: tb.positionY ?? 0,
                    currentX: tb.positionX ?? 0,
                    currentY: tb.positionY ?? 0,
                  })
                }}
                className={`absolute flex flex-col items-center justify-center border-2 shadow-sm transition-shadow ${
                  statusFill[tb.status]
                } ${selected ? 'ring-2 ring-primary ring-offset-2 z-10' : ''} ${
                  round ? 'rounded-full' : 'rounded-lg'
                } ${repositionEnabled ? 'cursor-grab active:cursor-grabbing' : ''} ${
                  busy ? 'opacity-60' : ''
                }`}
                style={{
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  transform:
                    tb.rotation != null && tb.rotation !== 0
                      ? `rotate(${tb.rotation}deg)`
                      : undefined,
                }}
              >
                <span className="text-label-md font-bold leading-none">
                  {tb.tableNumber}
                </span>
                <span className="text-[10px] opacity-80 mt-0.5">
                  <Num>{tb.capacity}</Num>
                </span>
              </button>
            )
          })}

          {placed.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-body-md text-on-surface-variant px-6 text-center">
              {t.floorPlan.noGeometry}
            </p>
          )}
        </div>
      </div>

      {unplaced.length > 0 && (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <p className="text-label-md text-on-surface-variant mb-2">
            {t.floorPlan.unplacedTables}
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((tb) => (
              <button
                key={tb.tableId}
                type="button"
                onClick={() => onSelectTable(tb.tableId)}
                className={`px-3 py-1.5 rounded-lg border text-label-md ${
                  selectedTableId === tb.tableId
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant/30'
                }`}
              >
                {tb.tableNumber} · <Num>{tb.capacity}</Num> ·{' '}
                {t.status[tb.status]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

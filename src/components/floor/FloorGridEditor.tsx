import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto, TableStatusDto } from '@/api/tables'
import { FloorTableQueue } from '@/components/floor/FloorTableQueue'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import {
  areaFill,
  areaRect,
  canPlace,
  isPlaced,
  occupiedRects,
  rectFromCorners,
  tableRect,
  tableSpan,
  type CellRect,
  type CellSpan,
} from '@/lib/floorGrid'
import { tableFloor } from '@/lib/floors'
import { effectiveCapacity } from '@/lib/tableCapacity'
import { cn } from '@/lib/utils'

const MIN_CELL_PX = 44
const MAX_CELL_PX = 96
const DRAG_THRESHOLD_PX = 6

const statusTone: Record<TableStatusDto, string> = {
  Available: 'border-success/60 bg-surface-container-lowest text-on-surface',
  Occupied: 'border-primary bg-primary-container text-on-primary-container',
  Cleaning: 'border-warning/60 bg-warning-light text-warning',
  Disabled: 'border-error/50 bg-error/10 text-error border-dashed',
  Reserved: 'border-info-border bg-info-subtle text-info',
  Merged: 'border-secondary/60 bg-secondary-container text-on-secondary-container',
}

type Drag = {
  tableId: string
  source: 'grid' | 'queue'
  startX: number
  startY: number
  /** Cell inside the table that the pointer grabbed. */
  grab: { col: number; row: number }
  moved: boolean
  pointer: { x: number; y: number }
  target: CellRect | null
}

type Draw = { start: { col: number; row: number }; end: { col: number; row: number } }

export type GridMode = { kind: 'idle' } | { kind: 'drawArea' }

interface FloorGridEditorProps {
  /** Every table of the floor plan; the grid draws the current floor. */
  tables: TableDto[]
  /** Drawn areas of the current floor. */
  areas: FloorPlanAreaDto[]
  currentFloor: number
  bounds: CellSpan
  canManage: boolean
  mode: GridMode
  onAreaDrawn: (rect: CellRect) => void
  onAreaSelect: (area: FloorPlanAreaDto) => void
  onPlace: (table: TableDto, rect: CellRect) => boolean
  onRotate: (table: TableDto) => void
  onEdit: (table: TableDto) => void
  onDelete: (table: TableDto) => void
}

/** Seats drawn around the tabletop: dots on a ring (round) or along the sides. */
function chairDots(round: boolean, seats: number, w: number, h: number, gap: number) {
  const n = Math.min(Math.max(seats, 1), 12)
  if (round) {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return { x: w / 2 + Math.cos(a) * (w / 2 + gap), y: h / 2 + Math.sin(a) * (h / 2 + gap) }
    })
  }
  const longSide = w >= h
  const perSide = Math.ceil(n / 2)
  const dots: { x: number; y: number }[] = []
  for (let i = 0; i < n; i += 1) {
    const side = i < perSide ? 0 : 1
    const index = side === 0 ? i : i - perSide
    const count = side === 0 ? perSide : n - perSide
    const t = (index + 1) / (count + 1)
    dots.push(
      longSide
        ? { x: w * t, y: side === 0 ? -gap : h + gap }
        : { x: side === 0 ? -gap : w + gap, y: h * t },
    )
  }
  return dots
}

/**
 * Fixed square grid that fills the width ("مخطط المكان"). Tables snap to
 * whole squares, sized by seats and shape; areas are coloured rectangles.
 * Dragging (mouse or touch) and tap-then-tap both place a table; a plain tap
 * on a table opens its small menu (rotate · edit · delete).
 */
export function FloorGridEditor({
  tables,
  areas,
  currentFloor,
  bounds,
  canManage,
  mode,
  onAreaDrawn,
  onAreaSelect,
  onPlace,
  onRotate,
  onEdit,
  onDelete,
}: FloorGridEditorProps) {
  const { t, isRTL } = useLocale()
  const wrapRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [wrapWidth, setWrapWidth] = useState(0)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [draw, setDraw] = useState<Draw | null>(null)
  const [menuTableId, setMenuTableId] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)

  const cellPx = Math.min(
    MAX_CELL_PX,
    Math.max(MIN_CELL_PX, Math.floor((wrapWidth || 960) / bounds.cols)),
  )
  // A spare row/column so the plan can grow while dragging toward the edge.
  const cols = Math.max(bounds.cols, Math.floor((wrapWidth || 0) / cellPx))
  const rows = bounds.rows
  const placeBounds = { cols: cols + 1, rows: rows + 1 }

  const floorTables = tables.filter(
    (table) => isPlaced(table) && tableFloor(table) === currentFloor,
  )
  const queue = tables.filter((table) => !isPlaced(table))
  const picked = queue.find((table) => table.tableId === pickedId) ?? null
  const menuTable = floorTables.find((table) => table.tableId === menuTableId) ?? null

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWrapWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cellAt = (clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null
    return { col: Math.floor(x / cellPx), row: Math.floor(y / cellPx) }
  }

  const tableById = (id: string) => tables.find((table) => table.tableId === id)

  const validTarget = (tableId: string, rect: CellRect) =>
    canPlace(rect, occupiedRects(tables, currentFloor, tableId), placeBounds)

  // The live drag sits in a ref so pointer handlers never act inside a state
  // updater; state only mirrors it for rendering.
  const dragRef = useRef<Drag | null>(null)
  const setLiveDrag = (next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  // Window listeners keep a drag alive when the pointer leaves the grid or
  // starts in the side queue.
  const dragging = drag != null
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      const moved =
        current.moved ||
        Math.hypot(e.clientX - current.startX, e.clientY - current.startY) > DRAG_THRESHOLD_PX
      const table = tableById(current.tableId)
      const cell = cellAt(e.clientX, e.clientY)
      const target =
        table && cell
          ? { col: cell.col - current.grab.col, row: cell.row - current.grab.row, ...tableSpan(table) }
          : null
      setLiveDrag({ ...current, moved, target, pointer: { x: e.clientX, y: e.clientY } })
    }
    const up = () => {
      const current = dragRef.current
      setLiveDrag(null)
      if (!current) return
      const table = tableById(current.tableId)
      if (!table) return
      if (current.moved) {
        if (current.target && onPlace(table, current.target)) setPickedId(null)
      } else if (current.source === 'grid') {
        setMenuTableId((open) => (open === table.tableId ? null : table.tableId))
      } else {
        setPickedId((open) => (open === table.tableId ? null : table.tableId))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // Handlers read the drag from the ref; they re-bind when the grid changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, cellPx, tables, currentFloor])

  useEffect(() => {
    if (!menuTableId) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e instanceof PointerEvent && menuRef.current?.contains(e.target as Node)) return
      setMenuTableId(null)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
    }
  }, [menuTableId])

  const startDrag = (
    table: TableDto,
    source: Drag['source'],
    e: ReactPointerEvent,
  ) => {
    if (!canManage || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    let grab = { col: 0, row: 0 }
    if (source === 'grid') {
      const rect = tableRect(table)
      const cell = cellAt(e.clientX, e.clientY)
      if (cell) grab = { col: cell.col - rect.col, row: cell.row - rect.row }
    }
    setLiveDrag({
      tableId: table.tableId,
      source,
      startX: e.clientX,
      startY: e.clientY,
      grab,
      moved: false,
      pointer: { x: e.clientX, y: e.clientY },
      target: null,
    })
  }

  const drawing = mode.kind === 'drawArea' && canManage
  const startDraw = (e: ReactPointerEvent) => {
    if (!drawing || e.button !== 0) return
    const cell = cellAt(e.clientX, e.clientY)
    if (!cell) return
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDraw({ start: cell, end: cell })
  }
  const moveDraw = (e: ReactPointerEvent) => {
    if (!draw) return
    const cell = cellAt(e.clientX, e.clientY)
    if (cell) setDraw({ ...draw, end: cell })
  }
  const endDraw = () => {
    if (!draw) return
    onAreaDrawn(rectFromCorners(draw.start, draw.end))
    setDraw(null)
  }

  /** Tap on an empty square while a queued table is picked places it there. */
  const tapGrid = (e: React.MouseEvent) => {
    if (!picked || drawing) return
    const cell = cellAt(e.clientX, e.clientY)
    if (!cell) return
    if (onPlace(picked, { ...cell, ...tableSpan(picked) })) setPickedId(null)
  }

  const box = (rect: CellRect) => ({
    left: rect.col * cellPx,
    top: rect.row * cellPx,
    width: rect.cols * cellPx,
    height: rect.rows * cellPx,
  })

  const dragTable = drag ? tableById(drag.tableId) : undefined
  const ghost = drag?.moved && drag.target ? drag.target : null
  const ghostValid = ghost && drag ? validTarget(drag.tableId, ghost) : false
  const drawRect = draw ? rectFromCorners(draw.start, draw.end) : null
  const inset = Math.max(8, Math.round(cellPx * 0.2))
  const chairGap = Math.max(4, Math.round(inset * 0.55))

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="min-w-0 space-y-2">
        {picked && (
          <p className="text-label-md text-primary" role="status">
            {t.floorGrid.placeTapHint.replace('{table}', picked.tableNumber)}
          </p>
        )}
        {drawing && (
          <p className="text-label-md text-primary" role="status">
            {t.floorGrid.drawingArea}
          </p>
        )}
        <div
          ref={wrapRef}
          dir="ltr"
          className="min-w-0 overflow-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest pt-6"
        >
          <div
            ref={gridRef}
            dir="ltr"
            role="application"
            aria-label={t.floorGrid.gridLabel}
            className={cn('relative select-none', drawing && 'cursor-crosshair touch-none')}
            style={{
              width: cols * cellPx,
              height: rows * cellPx,
              backgroundImage:
                'linear-gradient(to right, var(--color-outline-variant) 1px, transparent 1px), linear-gradient(to bottom, var(--color-outline-variant) 1px, transparent 1px)',
              backgroundSize: `${cellPx}px ${cellPx}px`,
              backgroundColor: 'var(--color-surface-container-lowest)',
            }}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onClick={tapGrid}
          >
            {areas.map((area) => {
              const rect = areaRect(area)
              if (!rect) return null
              return (
                <div
                  key={area.floorPlanAreaId}
                  className="absolute rounded-md border-2"
                  style={{
                    ...box(rect),
                    borderColor: area.color,
                    backgroundColor: areaFill(area.color),
                  }}
                >
                  <button
                    type="button"
                    disabled={drawing}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAreaSelect(area)
                    }}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className={cn(
                      'absolute -top-6 z-[1] flex h-6 max-w-full items-center gap-1 truncate rounded-t-md px-2 text-label-sm font-semibold text-white',
                      isRTL ? 'right-0' : 'left-0',
                    )}
                    style={{ backgroundColor: area.color }}
                  >
                    <span className="truncate">{area.name}</span>
                    {area.features.length > 0 && (
                      <span className="truncate font-normal opacity-90">
                        · {area.features.map((f) => t.floorGrid.features[f]).join(' · ')}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}

            {floorTables.map((table) => {
              const rect = tableRect(table)
              const seats = effectiveCapacity(table, tables)
              const round = table.shape === 'Round'
              const inner = { w: rect.cols * cellPx - inset * 2, h: rect.rows * cellPx - inset * 2 }
              const lifted = drag?.moved && drag.tableId === table.tableId
              return (
                <div
                  key={table.tableId}
                  className={cn('absolute', lifted && 'opacity-40')}
                  style={box(rect)}
                >
                  <button
                    type="button"
                    aria-label={t.floorGrid.tableMenu.replace('{table}', table.tableNumber)}
                    aria-haspopup="menu"
                    aria-expanded={menuTableId === table.tableId}
                    disabled={drawing}
                    onPointerDown={(e) => startDrag(table, 'grid', e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setMenuTableId((open) => (open === table.tableId ? null : table.tableId))
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'absolute touch-none',
                      canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                    )}
                    style={{ left: inset, top: inset, width: inner.w, height: inner.h }}
                  >
                    {chairDots(round, seats, inner.w, inner.h, chairGap).map((dot, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-outline"
                        style={{ left: dot.x, top: dot.y }}
                      />
                    ))}
                    <span
                      className={cn(
                        'absolute inset-0 flex flex-col items-center justify-center border-2 shadow-sm',
                        statusTone[table.status],
                        round ? 'rounded-full' : 'rounded-lg',
                        menuTableId === table.tableId && 'ring-2 ring-primary ring-offset-2',
                      )}
                    >
                      <span className="text-label-sm font-bold leading-none">{table.tableNumber}</span>
                      <span className="text-[10px] leading-tight opacity-80">
                        <Num>{seats}</Num>
                      </span>
                    </span>
                  </button>
                </div>
              )
            })}

            {ghost && dragTable && (
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute rounded-lg border-2 border-dashed',
                  ghostValid ? 'border-primary bg-primary/15' : 'border-error bg-error/15',
                )}
                style={box(ghost)}
              />
            )}
            {drawRect && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary bg-primary/10"
                style={box(drawRect)}
              />
            )}

            {menuTable && canManage && !drag && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute z-20 flex gap-1 rounded-lg border border-outline-variant/50 bg-surface p-1 shadow-lg"
                style={(() => {
                  const rect = tableRect(menuTable)
                  const below = rect.row === 0
                  return {
                    left: Math.min(Math.max(0, rect.col * cellPx), cols * cellPx - 216),
                    top: below ? (rect.row + rect.rows) * cellPx + 4 : rect.row * cellPx - 48,
                  }
                })()}
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={tableRect(menuTable).cols === tableRect(menuTable).rows}
                  title={
                    tableRect(menuTable).cols === tableRect(menuTable).rows
                      ? t.floorGrid.rotateNotNeeded
                      : undefined
                  }
                  onClick={() => onRotate(menuTable)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md px-2.5 text-label-md hover:bg-surface-container-high disabled:opacity-40"
                >
                  <MaterialIcon name="rotate_right" size={18} />
                  {t.floorGrid.rotate}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuTableId(null)
                    onEdit(menuTable)
                  }}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md px-2.5 text-label-md hover:bg-surface-container-high"
                >
                  <MaterialIcon name="edit" size={18} />
                  {t.common.edit}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuTableId(null)
                    onDelete(menuTable)
                  }}
                  className="inline-flex min-h-10 items-center gap-1 rounded-md px-2.5 text-label-md text-error hover:bg-error/10"
                >
                  <MaterialIcon name="delete" size={18} />
                  {t.common.delete}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloorTableQueue
        tables={queue}
        pickedId={pickedId}
        draggingId={drag?.source === 'queue' && drag.moved ? drag.tableId : null}
        canManage={canManage}
        onPointerDown={(table, e) => startDrag(table, 'queue', e)}
        onPick={(table) =>
          setPickedId((open) => (open === table.tableId ? null : table.tableId))
        }
      />

      {drag?.moved && drag.source === 'queue' && dragTable && !drag.target && (
        <span
          aria-hidden
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-primary bg-surface px-2 py-1 text-label-sm font-bold shadow-lg"
          style={{ left: drag.pointer.x, top: drag.pointer.y }}
        >
          {dragTable.tableNumber}
        </span>
      )}
    </div>
  )
}

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { TableDto } from '@/api/tables'
import { FloorLayoutToolbar } from '@/components/floor/FloorLayoutToolbar'
import { FloorTableGlyph } from '@/components/floor/FloorTableGlyph'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import {
  clampTableSize,
  clampZoom,
  floorWorldSize,
  isTablePlaced,
  overlappingTableIds,
  resolveTableSize,
  snapCoord,
  tableBox,
  ZOOM_STEP,
  type TablePreset,
} from '@/lib/floorGeometry'
import { tableShapeKind } from '@/lib/tableShape'
import { cn } from '@/lib/utils'

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
  onResize?: (tableId: string, width: number, height: number) => void
  snapEnabled?: boolean
  onSnapChange?: (enabled: boolean) => void
  placePreset?: TablePreset | null
  onPlacePreset?: (preset: TablePreset | null) => void
  /** When true, an empty-canvas tap calls onPlaceAt (preset or unplaced table). */
  placeEnabled?: boolean
  placeSize?: { width: number; height: number }
  onPlaceAt?: (x: number, y: number) => void
  placing?: boolean
  onDragActiveChange?: (active: boolean) => void
}

interface DragState {
  kind: 'move' | 'resize'
  tableId: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  originW: number
  originH: number
  currentX: number
  currentY: number
  currentW: number
  currentH: number
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
  onResize,
  snapEnabled: snapProp,
  onSnapChange,
  placePreset = null,
  onPlacePreset,
  placeEnabled = false,
  placeSize,
  onPlaceAt,
  placing = false,
  onDragActiveChange,
}: FloorPlanReadViewProps) {
  const { t } = useLocale()
  const viewportRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [zoom, setZoom] = useState(1)
  const [internalSnap, setInternalSnap] = useState(false)
  const dragMoved = useRef(false)
  const emptyPointer = useRef(false)

  useEffect(() => {
    onDragActiveChange?.(drag !== null)
  }, [drag, onDragActiveChange])

  const snapEnabled = snapProp ?? internalSnap
  const setSnap = (next: boolean) => {
    onSnapChange?.(next)
    if (snapProp === undefined) setInternalSnap(next)
  }

  const placed = tables.filter(isTablePlaced)
  const unplaced = tables.filter((tb) => !isTablePlaced(tb))

  const liveBox = (tb: TableDto) => {
    if (drag?.tableId !== tb.tableId) return tableBox(tb)
    return tableBox(tb, {
      x: drag.currentX,
      y: drag.currentY,
      width: drag.currentW,
      height: drag.currentH,
    })
  }

  const world = floorWorldSize(placed.map(liveBox))
  const overlapping = overlappingTableIds(tables, liveBox)

  const toWorldDelta = (clientDx: number, clientDy: number) => ({
    dx: clientDx / zoom,
    dy: clientDy / zoom,
  })

  const worldPointFromClient = (clientX: number, clientY: number) => {
    const el = worldRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    }
  }

  const commitDrag = (state: DragState) => {
    setDrag(null)
    if (!dragMoved.current) return
    if (state.kind === 'resize') {
      if (
        state.currentW !== state.originW ||
        state.currentH !== state.originH
      ) {
        onResize?.(state.tableId, state.currentW, state.currentH)
      }
      return
    }
    if (
      state.currentX !== state.originX ||
      state.currentY !== state.originY
    ) {
      onReposition?.(state.tableId, state.currentX, state.currentY)
    }
  }

  const applyPointerMove = (e: ReactPointerEvent) => {
    if (!drag) return
    const { dx, dy } = toWorldDelta(
      e.clientX - drag.startClientX,
      e.clientY - drag.startClientY,
    )
    if (Math.abs(e.clientX - drag.startClientX) > 2 ||
      Math.abs(e.clientY - drag.startClientY) > 2) {
      dragMoved.current = true
    }
    if (drag.kind === 'resize') {
      const round =
        tableShapeKind(
          tables.find((tb) => tb.tableId === drag.tableId)?.shape,
        ) === 'round'
      const nextW = clampTableSize(
        snapCoord(drag.originW + dx, snapEnabled),
      )
      const nextH = clampTableSize(
        snapCoord(round ? drag.originW + dx : drag.originH + dy, snapEnabled),
      )
      setDrag({
        ...drag,
        currentW: nextW,
        currentH: round ? nextW : nextH,
      })
      return
    }
    setDrag({
      ...drag,
      currentX: snapCoord(drag.originX + dx, snapEnabled),
      currentY: snapCoord(drag.originY + dy, snapEnabled),
    })
  }

  const handleCanvasPointerUp = (e: ReactPointerEvent) => {
    if (drag) {
      commitDrag(drag)
      emptyPointer.current = false
      return
    }
    const canPlace = Boolean(onPlaceAt) && (placeEnabled || Boolean(placePreset))
    if (
      canPlace &&
      emptyPointer.current &&
      !dragMoved.current &&
      !placing
    ) {
      const size = placeSize ?? placePreset ?? {
        width: 80,
        height: 80,
      }
      const point = worldPointFromClient(e.clientX, e.clientY)
      const x = snapCoord(point.x - size.width / 2, snapEnabled)
      const y = snapCoord(point.y - size.height / 2, snapEnabled)
      onPlaceAt?.(x, y)
    } else if (emptyPointer.current && !dragMoved.current && !placePreset) {
      onSelectTable(null)
    }
    emptyPointer.current = false
  }

  const fitView = () => {
    const el = viewportRef.current
    if (!el) return
    const next = Math.min(
      el.clientWidth / world.width,
      el.clientHeight / world.height,
      1.25,
    )
    setZoom(clampZoom(next))
  }

  const showStudioChrome = repositionEnabled

  return (
    <div className="space-y-3">
      {showStudioChrome && (
        <FloorLayoutToolbar
          canManage={repositionEnabled}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnap(!snapEnabled)}
          zoomPercent={Math.round(zoom * 100)}
          onZoomIn={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          onZoomOut={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          onFit={fitView}
          activePresetId={placePreset?.id ?? null}
          onPreset={(preset) => onPlacePreset?.(preset)}
          onClearPreset={() => onPlacePreset?.(null)}
          placing={placing}
        />
      )}

      {overlapping.size > 0 && (
        <p className="text-label-sm text-warning" role="status">
          {t.floorPlan.overlapWarning}
        </p>
      )}

      {repositionEnabled && (placePreset || placeEnabled) && (
        <p className="text-label-sm text-primary font-medium">
          {t.floorPlan.placeHint}
        </p>
      )}

      <div
        ref={viewportRef}
        className={cn(
          'relative w-full overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container',
          'h-[min(62vh,560px)] lg:h-[min(70vh,720px)]',
          placePreset || placeEnabled ? 'cursor-crosshair' : '',
        )}
        data-testid="floor-plan-canvas"
        dir="ltr"
        onPointerMove={applyPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={() => {
          if (drag) commitDrag(drag)
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget || e.target === worldRef.current) {
            emptyPointer.current = true
            dragMoved.current = false
          }
        }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return
          e.preventDefault()
          setZoom((z) =>
            clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)),
          )
        }}
      >
        <div
          style={{
            width: world.width * zoom,
            height: world.height * zoom,
            minHeight: 280 * zoom,
          }}
        >
          <div
            ref={worldRef}
            className="relative origin-top-left"
            style={{
              width: world.width,
              height: world.height,
              minHeight: 280,
              transform: `scale(${zoom})`,
              backgroundImage: `
                linear-gradient(to right, color-mix(in oklab, var(--color-outline-variant) 35%, transparent) 1px, transparent 1px),
                linear-gradient(to bottom, color-mix(in oklab, var(--color-outline-variant) 35%, transparent) 1px, transparent 1px)
              `,
              backgroundSize: '16px 16px',
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                emptyPointer.current = true
                dragMoved.current = false
              }
            }}
          >
            {placed.map((tb) => {
              const box = liveBox(tb)
              const selected = selectedTableId === tb.tableId
              const busy = repositionBusyTableId === tb.tableId
              const rotation =
                tb.rotation != null && tb.rotation !== 0
                  ? `rotate(${tb.rotation}deg)`
                  : undefined
              return (
                <div key={tb.tableId}>
                  <button
                    type="button"
                    data-testid={`floor-table-${tb.tableId}`}
                    data-x={box.x}
                    data-y={box.y}
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
                      e.stopPropagation()
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId)
                      } catch {
                        // happy-dom / some browsers may not support capture
                      }
                      dragMoved.current = false
                      emptyPointer.current = false
                      const size = resolveTableSize(tb)
                      setDrag({
                        kind: 'move',
                        tableId: tb.tableId,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        originX: tb.positionX ?? 0,
                        originY: tb.positionY ?? 0,
                        originW: size.width,
                        originH: size.height,
                        currentX: tb.positionX ?? 0,
                        currentY: tb.positionY ?? 0,
                        currentW: size.width,
                        currentH: size.height,
                      })
                    }}
                    className={cn(
                      'absolute touch-none',
                      repositionEnabled
                        ? 'cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer',
                      busy ? 'opacity-60' : '',
                    )}
                    style={{
                      left: box.x,
                      top: box.y,
                      width: box.width,
                      height: box.height,
                      transform: rotation,
                      zIndex: selected ? 10 : 1,
                    }}
                  >
                    <FloorTableGlyph
                      table={tb}
                      width={box.width}
                      height={box.height}
                      selected={selected}
                      overlapping={overlapping.has(tb.tableId)}
                    />
                  </button>
                  {selected && repositionEnabled && onResize && !busy && (
                    <button
                      type="button"
                      aria-label={t.floorPlan.resizeHandle}
                      className="absolute z-20 h-6 w-6 rounded-sm border-2 border-primary bg-surface-container-lowest shadow-sm"
                      style={{
                        left: box.x + box.width - 8,
                        top: box.y + box.height - 8,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId)
                        } catch {
                          // ignore
                        }
                        dragMoved.current = false
                        const size = resolveTableSize(tb)
                        setDrag({
                          kind: 'resize',
                          tableId: tb.tableId,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          originX: tb.positionX ?? 0,
                          originY: tb.positionY ?? 0,
                          originW: size.width,
                          originH: size.height,
                          currentX: tb.positionX ?? 0,
                          currentY: tb.positionY ?? 0,
                          currentW: size.width,
                          currentH: size.height,
                        })
                      }}
                    />
                  )}
                </div>
              )
            })}

            {placed.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-body-md text-on-surface-variant px-6 text-center pointer-events-none">
                {tables.length === 0
                  ? t.floorPlan.emptyRoomHint
                  : t.floorPlan.noGeometry}
              </p>
            )}
          </div>
        </div>
      </div>

      {unplaced.length > 0 && (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
          <p className="text-label-md text-on-surface-variant mb-1">
            {t.floorPlan.unplacedTables}
          </p>
          <p className="text-label-sm text-on-surface-variant mb-3">
            {t.floorPlan.unplacedHint}
          </p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((tb) => (
              <button
                key={tb.tableId}
                type="button"
                onClick={() => onSelectTable(tb.tableId)}
                className={cn(
                  'min-h-10 px-3 py-1.5 rounded-lg border text-label-md',
                  selectedTableId === tb.tableId
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant/30',
                )}
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

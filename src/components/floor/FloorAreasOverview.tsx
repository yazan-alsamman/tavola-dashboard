import { useRef, useState } from 'react'
import type { FloorPlanDto } from '@/api/floorPlans'
import type { TableDto } from '@/api/tables'
import { FloorTableGlyph } from '@/components/floor/FloorTableGlyph'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import {
  areaCanvasSize,
  areaTint,
  tablesOnFloorPlan,
} from '@/lib/floorAreas'
import {
  isTablePlaced,
  resolveTableSize,
  snapCoord,
  tableBox,
} from '@/lib/floorGeometry'
import { cn } from '@/lib/utils'

interface AreaDrag {
  tableId: string
  sourceId: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  currentX: number
  currentY: number
  width: number
  height: number
  hoverId: string | null
}

interface FloorAreasOverviewProps {
  floorPlans: FloorPlanDto[]
  tables: TableDto[]
  selectedAreaId: string | null
  selectedTableId: string | null
  repositionEnabled: boolean
  busyTableId: string | null
  snapEnabled: boolean
  onSelectArea: (floorPlanId: string) => void
  onSelectTable: (tableId: string | null) => void
  onReposition: (tableId: string, positionX: number, positionY: number) => void
  onTransfer: (
    tableId: string,
    targetFloorPlanId: string,
    positionX: number,
    positionY: number,
  ) => void
  onDragActiveChange?: (active: boolean) => void
}

function areaAtPoint(
  clientX: number,
  clientY: number,
  ignore: Element | null,
): { id: string; canvas: HTMLElement } | null {
  const stack = document.elementsFromPoint(clientX, clientY)
  for (const el of stack) {
    if (ignore && (el === ignore || ignore.contains(el))) continue
    const canvas = el.closest('[data-floor-plan-id]')
    if (canvas instanceof HTMLElement) {
      const id = canvas.getAttribute('data-floor-plan-id')
      if (id) return { id, canvas }
    }
  }
  return null
}

/**
 * Every floor plan of the branch on one page.
 * Each block is a real FloorPlan. Table membership is `floorPlanId`, not the block's pixels.
 * The frame is derived from the tables. It is not saved as section geometry.
 */
export function FloorAreasOverview({
  floorPlans,
  tables,
  selectedAreaId,
  selectedTableId,
  repositionEnabled,
  busyTableId,
  snapEnabled,
  onSelectArea,
  onSelectTable,
  onReposition,
  onTransfer,
  onDragActiveChange,
}: FloorAreasOverviewProps) {
  const { t } = useLocale()
  const [drag, setDrag] = useState<AreaDrag | null>(null)
  const dragMoved = useRef(false)

  const setDragging = (next: AreaDrag | null) => {
    setDrag(next)
    onDragActiveChange?.(next !== null)
  }

  const liveBox = (table: TableDto) => {
    if (drag?.tableId !== table.tableId) return tableBox(table)
    return tableBox(table, {
      x: drag.currentX,
      y: drag.currentY,
      width: drag.width,
      height: drag.height,
    })
  }

  const commit = (
    state: AreaDrag,
    clientX: number,
    clientY: number,
    sourceEl: Element,
  ) => {
    setDragging(null)
    if (!dragMoved.current) return
    const hit = areaAtPoint(clientX, clientY, sourceEl)
    if (hit && hit.id !== state.sourceId) {
      const rect = hit.canvas.getBoundingClientRect()
      const x = snapCoord(clientX - rect.left - state.width / 2, snapEnabled)
      const y = snapCoord(clientY - rect.top - state.height / 2, snapEnabled)
      onTransfer(state.tableId, hit.id, x, y)
      return
    }
    if (state.currentX !== state.originX || state.currentY !== state.originY) {
      onReposition(
        state.tableId,
        snapCoord(state.currentX, snapEnabled),
        snapCoord(state.currentY, snapEnabled),
      )
    }
  }

  return (
    <div className="space-y-4" data-testid="floor-areas-overview">
      {floorPlans.map((plan, index) => {
        const tint = areaTint(index)
        const areaTables = tablesOnFloorPlan(tables, plan.floorPlanId)
        const placed = areaTables.filter(isTablePlaced)
        const unplaced = areaTables.filter((table) => !isTablePlaced(table))
        const size = areaCanvasSize(placed.map((table) => liveBox(table)))
        const count = areaTables.length
        const selected = plan.floorPlanId === selectedAreaId
        const highlighted = drag?.hoverId === plan.floorPlanId
        return (
          <section
            key={plan.floorPlanId}
            aria-label={plan.name}
            className={cn(
              'overflow-visible rounded-2xl border border-dashed',
              tint.fill,
              tint.border,
              selected && `ring-2 ${tint.selected}`,
              highlighted && 'ring-2 ring-primary',
            )}
          >
            <header className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-start"
                onClick={() => onSelectArea(plan.floorPlanId)}
              >
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', tint.dot)} />
                <span className="truncate text-label-lg font-semibold text-on-surface">
                  {plan.name}
                </span>
                <span className="rounded-full bg-surface-container-lowest/80 px-2 py-0.5 text-label-sm text-on-surface-variant tabular-nums">
                  <Num>{count}</Num>
                </span>
                {plan.isActive && (
                  <span className="text-label-sm font-semibold text-success">
                    {t.floorPlan.guestVisible}
                  </span>
                )}
              </button>
            </header>
            <div
              data-floor-plan-id={plan.floorPlanId}
              dir="ltr"
              className="relative mx-3 mb-3 overflow-visible rounded-xl border border-outline-variant/25 bg-surface-container-lowest/70"
              style={{
                width: size.width,
                maxWidth: '100%',
                height: size.height,
                backgroundImage: `
                  linear-gradient(to right, color-mix(in oklab, var(--color-outline-variant) 28%, transparent) 1px, transparent 1px),
                  linear-gradient(to bottom, color-mix(in oklab, var(--color-outline-variant) 28%, transparent) 1px, transparent 1px)
                `,
                backgroundSize: '16px 16px',
              }}
            >
              {placed.map((table) => {
                const box = liveBox(table)
                const selectedTable = selectedTableId === table.tableId
                const busy = busyTableId === table.tableId
                const rotation =
                  table.rotation != null && table.rotation !== 0
                    ? `rotate(${table.rotation}deg)`
                    : undefined
                return (
                  <button
                    key={table.tableId}
                    type="button"
                    data-testid={`floor-table-${table.tableId}`}
                    aria-label={`${table.tableNumber} ${table.status}`}
                    disabled={busy}
                    className={cn(
                      'absolute touch-none',
                      repositionEnabled
                        ? 'cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer',
                      busy && 'opacity-60',
                    )}
                    style={{
                      left: box.x,
                      top: box.y,
                      width: box.width,
                      height: box.height,
                      transform: rotation,
                      zIndex: drag?.tableId === table.tableId || selectedTable ? 20 : 1,
                    }}
                    onClick={() => {
                      if (dragMoved.current) {
                        dragMoved.current = false
                        return
                      }
                      onSelectArea(plan.floorPlanId)
                      onSelectTable(selectedTable ? null : table.tableId)
                    }}
                    onPointerDown={(e) => {
                      if (!repositionEnabled || busy) return
                      e.stopPropagation()
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId)
                      } catch {
                        // happy-dom
                      }
                      dragMoved.current = false
                      const tableSize = resolveTableSize(table)
                      setDragging({
                        tableId: table.tableId,
                        sourceId: plan.floorPlanId,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        originX: table.positionX ?? 0,
                        originY: table.positionY ?? 0,
                        currentX: table.positionX ?? 0,
                        currentY: table.positionY ?? 0,
                        width: tableSize.width,
                        height: tableSize.height,
                        hoverId: plan.floorPlanId,
                      })
                    }}
                    onPointerMove={(e) => {
                      if (!drag || drag.tableId !== table.tableId) return
                      const dx = e.clientX - drag.startClientX
                      const dy = e.clientY - drag.startClientY
                      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
                      const hit = areaAtPoint(e.clientX, e.clientY, e.currentTarget)
                      setDragging({
                        ...drag,
                        currentX: drag.originX + dx,
                        currentY: drag.originY + dy,
                        hoverId: hit?.id ?? drag.sourceId,
                      })
                    }}
                    onPointerUp={(e) => {
                      if (!drag || drag.tableId !== table.tableId) return
                      commit(drag, e.clientX, e.clientY, e.currentTarget)
                    }}
                    onPointerCancel={() => {
                      if (drag?.tableId === table.tableId) setDragging(null)
                    }}
                  >
                    <FloorTableGlyph
                      table={table}
                      width={box.width}
                      height={box.height}
                      selected={selectedTable}
                    />
                  </button>
                )
              })}
              {placed.length === 0 && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-body-sm text-on-surface-variant">
                  {areaTables.length === 0
                    ? t.floorPlan.emptyAreaHint
                    : t.floorPlan.noGeometry}
                </p>
              )}
            </div>
            {unplaced.length > 0 && (
              <p className="px-3 pb-3 text-label-sm text-on-surface-variant">
                {t.floorPlan.unplacedTables}:{' '}
                {unplaced.map((table) => table.tableNumber).join(', ')}
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}

import { useRef, useCallback, useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { DesignerToolPalette } from './DesignerToolPalette'
import { ResizeHandles } from './ResizeHandles'
import { useDesignerKeyboard } from './useDesignerKeyboard'
import {
  DESIGNER_CANVAS,
  GRID_SIZE,
  SECTION_BORDER_COLORS,
  DECORATIVE_ICONS,
  getSeatPositions,
  getTableSeatCount,
  getElementBounds,
} from '@/lib/floorDesigner'
import { statusRing } from '@/lib/floorLayout'
import { cn } from '@/lib/utils'
import type { Table, TableStatus } from '@/types'

interface DesignerCanvasProps {
  tables: Table[]
  selectedTableId?: string | null
  onSelectTable?: (id: string | null) => void
  getGuestName?: (table: Table) => string | undefined
}

export function DesignerCanvas({ tables, selectedTableId, onSelectTable, getGuestName }: DesignerCanvasProps) {
  const { t } = useLocale()
  const {
    document,
    mode,
    activeTool,
    selectedIds,
    toggleSelect,
    clearSelection,
    selectInRect,
    zoom,
    pan,
    setPan,
    moveElement,
    finalizeDrag,
    showGrid,
    zoomAtPoint,
  } = useFloorDesigner()

  useDesignerKeyboard(mode === 'edit')

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasInnerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null)
  const marqueeRef = useRef<{ startX: number; startY: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)

  const tableMap = new Map(tables.map((tb) => [tb.id, tb]))

  // Space bar temporarily activates pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && mode === 'edit') { e.preventDefault(); setSpaceHeld(true) } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [mode])

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const el = canvasInnerRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    }
  }, [zoom])

  const isPanMode = activeTool === 'pan' || spaceHeld

  const handleWheel = useCallback((e: WheelEvent) => {
    if (mode !== 'edit' && mode !== 'operations') return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    zoomAtPoint(zoom + delta, e.clientX, e.clientY, rect)
  }, [mode, zoom, zoomAtPoint])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || isPanMode) {
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y }
      setIsPanning(true)
      return
    }
    if (mode !== 'edit') {
      if (mode === 'operations') onSelectTable?.(null)
      return
    }
    if (e.target !== e.currentTarget && e.target !== canvasInnerRef.current) return

    if (activeTool === 'marquee') {
      const pt = screenToCanvas(e.clientX, e.clientY)
      marqueeRef.current = { startX: pt.x, startY: pt.y }
      setMarquee({ x: pt.x, y: pt.y, w: 0, h: 0 })
      return
    }

    if (activeTool === 'select') {
      clearSelection()
    }
  }, [mode, pan, isPanMode, activeTool, clearSelection, onSelectTable, screenToCanvas])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      setPan({ x: panRef.current.origPanX + dx, y: panRef.current.origPanY + dy })
      return
    }
    if (marqueeRef.current) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      setMarquee({
        x: marqueeRef.current.startX,
        y: marqueeRef.current.startY,
        w: pt.x - marqueeRef.current.startX,
        h: pt.y - marqueeRef.current.startY,
      })
      return
    }
    const drag = dragRef.current
    if (!drag || mode !== 'edit') return
    const dx = (e.clientX - drag.startX) / zoom
    const dy = (e.clientY - drag.startY) / zoom
    moveElement(drag.id, drag.origX + dx, drag.origY + dy)
  }, [mode, zoom, moveElement, setPan, screenToCanvas])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (marqueeRef.current && marquee) {
      selectInRect(marquee, e.shiftKey || e.ctrlKey || e.metaKey)
      marqueeRef.current = null
      setMarquee(null)
    }
    if (dragRef.current) finalizeDrag()
    dragRef.current = null
    panRef.current = null
    setIsPanning(false)
  }, [marquee, selectInRect, finalizeDrag])

  const startDrag = useCallback((e: React.PointerEvent, id: string, origX: number, origY: number) => {
    if (mode !== 'edit' || isPanMode || activeTool === 'marquee') return
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX, origY }
    if (activeTool === 'select') toggleSelect(id, e.shiftKey || e.ctrlKey || e.metaKey)
  }, [mode, isPanMode, activeTool, toggleSelect])

  const handleTableClick = useCallback((tableId: string, designerId: string, e: React.MouseEvent) => {
    if (mode === 'edit' && activeTool === 'select') {
      toggleSelect(designerId, e.shiftKey || e.ctrlKey || e.metaKey)
    } else if (mode === 'operations') {
      onSelectTable?.(tableId)
    }
  }, [mode, activeTool, toggleSelect, onSelectTable])

  const selectionBounds = selectedIds.length === 1 ? getElementBounds(document, selectedIds) : null
  const singleSelectedId = selectedIds.length === 1 ? selectedIds[0] : null

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex-1 overflow-hidden bg-surface-container-low',
        isPanning && 'cursor-grabbing',
        isPanMode && !isPanning && 'cursor-grab',
        mode === 'edit' && activeTool === 'marquee' && 'cursor-crosshair',
        mode === 'edit' && activeTool === 'select' && 'cursor-default',
      )}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <DesignerToolPalette />

      {/* Mode badge */}
      <div className={cn(
        'absolute top-2 start-14 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-semibold',
        mode === 'edit' ? 'bg-primary-container text-on-primary-container' : 'bg-tertiary-container text-on-tertiary-container',
      )}>
        <MaterialIcon name={mode === 'edit' ? 'edit' : 'visibility'} size={14} />
        {mode === 'edit' ? t.floorDesigner.editMode : t.floorDesigner.operationsMode}
      </div>

      {/* Canvas viewport */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
      >
        <div
          ref={canvasInnerRef}
          className="relative bg-surface-container-lowest shadow-xl border border-outline-variant/20 rounded-lg"
          style={{ width: DESIGNER_CANVAS.w, height: DESIGNER_CANVAS.h }}
        >
          {/* Grid */}
          {mode === 'edit' && showGrid && (
            <svg className="absolute inset-0 pointer-events-none" width={DESIGNER_CANVAS.w} height={DESIGNER_CANVAS.h}>
              <defs>
                <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                  <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant/20" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Decorative elements */}
          {document.decoratives.filter((d) => d.visible).map((dec) => {
            const isSelected = selectedIds.includes(dec.id)
            return (
              <div
                key={dec.id}
                className={cn(
                  'absolute flex flex-col items-center justify-center rounded-md border-2 border-dashed transition-shadow',
                  mode === 'edit' && !dec.locked && activeTool === 'select' && 'cursor-move',
                  isSelected && mode === 'edit' && 'ring-2 ring-primary shadow-lg z-30',
                )}
                style={{
                  left: dec.x, top: dec.y, width: dec.w, height: dec.h,
                  transform: `rotate(${dec.rotation}deg)`,
                  backgroundColor: 'var(--color-surface-container)',
                  borderColor: 'var(--color-outline-variant)',
                }}
                onPointerDown={(e) => !dec.locked && startDrag(e, dec.id, dec.x, dec.y)}
              >
                <MaterialIcon name={DECORATIVE_ICONS[dec.type]} size={20} className="text-on-surface-variant" />
                <span className="text-[10px] font-bold text-on-surface-variant mt-0.5 tracking-wide uppercase">{dec.label}</span>
              </div>
            )
          })}

          {/* Sections */}
          {document.sections.filter((s) => s.visible).map((sec) => {
            const isSelected = selectedIds.includes(sec.id)
            return (
              <div
                key={sec.id}
                className={cn(
                  'absolute rounded-xl border-2 transition-shadow',
                  mode === 'edit' && !sec.locked && activeTool === 'select' && 'cursor-move',
                  isSelected && mode === 'edit' && 'ring-2 ring-primary shadow-lg z-20',
                )}
                style={{
                  left: sec.x, top: sec.y, width: sec.w, height: sec.h,
                  backgroundColor: sec.color + '80',
                  borderColor: SECTION_BORDER_COLORS[sec.sectionType],
                }}
                onPointerDown={(e) => !sec.locked && startDrag(e, sec.id, sec.x, sec.y)}
              >
                <div
                  className="absolute -top-0 start-3 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase"
                  style={{ backgroundColor: SECTION_BORDER_COLORS[sec.sectionType], color: '#fff' }}
                >
                  {sec.name}
                </div>
              </div>
            )
          })}

          {/* Tables */}
          {document.tables.filter((t) => t.visible).map((dt) => {
            const table = tableMap.get(dt.tableId)
            if (!table) return null
            const isSelected = mode === 'edit' ? selectedIds.includes(dt.id) : selectedTableId === table.id
            const guest = getGuestName?.(table)
            const occupied = table.status === 'occupied'
            const seatCount = getTableSeatCount(dt, table.capacity)
            const seats = getSeatPositions(dt.shape, dt.w, dt.h, seatCount)

            return (
              <div
                key={dt.id}
                className="absolute z-10"
                style={{ left: dt.x, top: dt.y, width: dt.w, height: dt.h, transform: `rotate(${dt.rotation}deg)` }}
              >
                {seats.map((pos, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2',
                      mode === 'edit' ? 'bg-primary/40 border border-primary/60' :
                      occupied ? 'bg-primary-container' : 'bg-outline-variant/60 border border-outline-variant',
                    )}
                    style={{ left: pos.x, top: pos.y }}
                  />
                ))}

                <button
                  type="button"
                  disabled={mode === 'operations' && table.status === 'out_of_service'}
                  onClick={(e) => handleTableClick(table.id, dt.id, e)}
                  onPointerDown={(e) => mode === 'edit' && !dt.locked && startDrag(e, dt.id, dt.x, dt.y)}
                  className={cn(
                    'absolute inset-0 flex flex-col items-center justify-center transition-all duration-150',
                    dt.shape === 'round' ? 'rounded-full' : dt.shape === 'square' ? 'rounded-lg' : 'rounded-md',
                    mode === 'operations' && statusRing[table.status],
                    mode === 'edit' && 'border-2 border-primary/30 bg-surface-container-lowest text-primary',
                    isSelected && 'ring-2 ring-primary scale-105 z-20 shadow-md',
                    mode === 'edit' && !dt.locked && activeTool === 'select' && 'cursor-move',
                    mode === 'operations' && table.status !== 'out_of_service' && 'hover:scale-105 cursor-pointer',
                  )}
                  title={table.name}
                >
                  <Num className={cn('font-bold text-xs', occupied && mode === 'operations' ? 'text-on-primary-container' : 'text-primary')}>
                    {table.number}
                  </Num>
                  {mode === 'edit' && (
                    <span className="text-[9px] text-on-surface-variant flex items-center gap-0.5">
                      <MaterialIcon name="event_seat" size={10} />
                      <Num>{seatCount}</Num>
                    </span>
                  )}
                  {occupied && mode === 'operations' && <MaterialIcon name="person" size={12} filled className="text-on-primary-container" />}
                  {guest && mode === 'operations' && (
                    <span className="text-[8px] truncate max-w-full px-1 opacity-80">{guest}</span>
                  )}
                </button>
              </div>
            )
          })}

          {/* Marquee selection box */}
          {marquee && (
            <div
              className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-50"
              style={{
                left: marquee.w < 0 ? marquee.x + marquee.w : marquee.x,
                top: marquee.h < 0 ? marquee.y + marquee.h : marquee.y,
                width: Math.abs(marquee.w),
                height: Math.abs(marquee.h),
              }}
            />
          )}

          {/* Resize handles for single selection */}
          {mode === 'edit' && activeTool === 'select' && selectionBounds && singleSelectedId && (
            <ResizeHandles
              id={singleSelectedId}
              x={selectionBounds.x}
              y={selectionBounds.y}
              w={selectionBounds.w}
              h={selectionBounds.h}
              zoom={zoom}
            />
          )}
        </div>
      </div>

      {/* Zoom indicator + shortcuts hint */}
      {mode === 'edit' && (
        <div className="absolute bottom-3 start-3 z-20 flex flex-col gap-1">
          <div className="text-[10px] text-on-surface-variant bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-1 rounded-md border border-outline-variant/20">
            {t.floorDesigner.shortcutsHint}
          </div>
        </div>
      )}

      {/* Legend (operations) */}
      {mode === 'operations' && (
        <div className="absolute bottom-3 start-3 flex gap-2 z-20">
          {(['available', 'reserved', 'occupied'] as TableStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1 text-[10px] text-on-surface-variant bg-surface-container-lowest/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-outline-variant/20">
              <span className={cn(
                'w-2.5 h-2.5 rounded-full',
                s === 'occupied' ? 'bg-primary-container' : s === 'available' ? 'border border-outline-variant' : 'bg-secondary-container',
              )} />
              {t.status[s]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

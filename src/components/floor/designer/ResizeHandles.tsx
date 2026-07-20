import { useCallback } from 'react'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { GRID_SIZE } from '@/lib/floorDesigner'
import { cn } from '@/lib/utils'

interface ResizeHandlesProps {
  id: string
  x: number
  y: number
  w: number
  h: number
  zoom: number
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: { id: Handle; className: string; cursor: string }[] = [
  { id: 'nw', className: '-top-1.5 -start-1.5', cursor: 'nwse-resize' },
  { id: 'n', className: '-top-1.5 start-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'ne', className: '-top-1.5 -end-1.5', cursor: 'nesw-resize' },
  { id: 'e', className: 'top-1/2 -end-1.5 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'se', className: '-bottom-1.5 -end-1.5', cursor: 'nwse-resize' },
  { id: 's', className: '-bottom-1.5 start-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'sw', className: '-bottom-1.5 -start-1.5', cursor: 'nesw-resize' },
  { id: 'w', className: 'top-1/2 -start-1.5 -translate-y-1/2', cursor: 'ew-resize' },
]

export function ResizeHandles({ id, x, y, w, h, zoom }: ResizeHandlesProps) {
  const { resizeElement } = useFloorDesigner()

  const onPointerDown = useCallback((e: React.PointerEvent, handle: Handle) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const startX = e.clientX
    const startY = e.clientY
    const orig = { x, y, w, h }

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      let nx = orig.x
      let ny = orig.y
      let nw = orig.w
      let nh = orig.h

      if (handle.includes('e')) nw = Math.max(GRID_SIZE, orig.w + dx)
      if (handle.includes('w')) { nw = Math.max(GRID_SIZE, orig.w - dx); nx = orig.x + (orig.w - nw) }
      if (handle.includes('s')) nh = Math.max(GRID_SIZE, orig.h + dy)
      if (handle.includes('n')) { nh = Math.max(GRID_SIZE, orig.h - dy); ny = orig.y + (orig.h - nh) }

      resizeElement(id, { x: nx, y: ny, w: nw, h: nh })
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [id, x, y, w, h, zoom, resizeElement])

  return (
    <div
      className="absolute pointer-events-none z-40 border-2 border-primary"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {HANDLES.map((h) => (
        <div
          key={h.id}
          className={cn('absolute w-3 h-3 bg-primary border-2 border-on-primary rounded-sm pointer-events-auto', h.className)}
          style={{ cursor: h.cursor }}
          onPointerDown={(e) => onPointerDown(e, h.id)}
        />
      ))}
    </div>
  )
}

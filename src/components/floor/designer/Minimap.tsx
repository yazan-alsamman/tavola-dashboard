import { useRef, useCallback } from 'react'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { DESIGNER_CANVAS } from '@/lib/floorDesigner'

export function Minimap() {
  const { document, zoom, pan, setPan } = useFloorDesigner()
  const minimapRef = useRef<HTMLDivElement>(null)

  const scale = 0.12
  const mw = DESIGNER_CANVAS.w * scale
  const mh = DESIGNER_CANVAS.h * scale

  const handleClick = useCallback((e: React.MouseEvent) => {
    const el = minimapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / scale
    const cy = (e.clientY - rect.top) / scale
    setPan({ x: -(cx * zoom - DESIGNER_CANVAS.w / 2), y: -(cy * zoom - DESIGNER_CANVAS.h / 2) })
  }, [zoom, setPan])

  const viewportW = (DESIGNER_CANVAS.w / zoom) * scale
  const viewportH = (DESIGNER_CANVAS.h / zoom) * scale
  const viewportX = (-pan.x / zoom) * scale
  const viewportY = (-pan.y / zoom) * scale

  return (
    <div className="absolute bottom-3 end-3 z-30 bg-surface-container-lowest/95 backdrop-blur-sm border border-outline-variant/40 rounded-lg shadow-lg overflow-hidden">
      <div
        ref={minimapRef}
        className="relative cursor-crosshair"
        style={{ width: mw, height: mh }}
        onClick={handleClick}
      >
        {/* Sections */}
        {document.sections.filter((s) => s.visible).map((sec) => (
          <div
            key={sec.id}
            className="absolute rounded-sm"
            style={{
              left: sec.x * scale,
              top: sec.y * scale,
              width: sec.w * scale,
              height: sec.h * scale,
              backgroundColor: sec.color,
              opacity: 0.6,
            }}
          />
        ))}
        {/* Tables */}
        {document.tables.filter((t) => t.visible).map((tbl) => (
          <div
            key={tbl.id}
            className="absolute bg-primary rounded-full"
            style={{
              left: tbl.x * scale,
              top: tbl.y * scale,
              width: Math.max(3, tbl.w * scale),
              height: Math.max(3, tbl.h * scale),
            }}
          />
        ))}
        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-primary rounded-sm pointer-events-none"
          style={{
            left: viewportX,
            top: viewportY,
            width: viewportW,
            height: viewportH,
          }}
        />
      </div>
    </div>
  )
}

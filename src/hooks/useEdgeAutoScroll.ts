import { useEffect, useRef, type RefObject } from 'react'

/** Distance from an edge, in px, where scrolling starts. */
const EDGE_PX = 64
/** Scroll speed, in px per frame, with the pointer right at the edge. */
const MAX_STEP_PX = 18

export interface PointerPoint {
  x: number
  y: number
}

/** Signed step for a pointer at `pos` inside the band [start, end]. */
function edgeStep(pos: number, start: number, end: number): number {
  if (end - start < EDGE_PX * 2) return 0
  if (pos < start + EDGE_PX) {
    return -Math.ceil(MAX_STEP_PX * Math.min(1, (start + EDGE_PX - pos) / EDGE_PX))
  }
  if (pos > end - EDGE_PX) {
    return Math.ceil(MAX_STEP_PX * Math.min(1, (pos - (end - EDGE_PX)) / EDGE_PX))
  }
  return 0
}

/** Nearest ancestor that scrolls vertically, else the page itself. */
function verticalScroller(from: HTMLElement): HTMLElement {
  for (let el = from.parentElement; el; el = el.parentElement) {
    const overflowY = getComputedStyle(el).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

function viewportBand(scroller: HTMLElement): { top: number; bottom: number } {
  if (scroller === document.scrollingElement || scroller === document.documentElement) {
    return { top: 0, bottom: window.innerHeight }
  }
  const rect = scroller.getBoundingClientRect()
  return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) }
}

/**
 * While `active`, scrolls toward the edge the pointer is held near, so a drag
 * can reach parts of a canvas that are off screen without letting go:
 * vertically in the page (or the nearest scrolling ancestor of `container`),
 * horizontally inside `container` itself. `onScrolled` runs on every frame
 * the pointer is held in an edge band, so the caller can re-hit-test the
 * unchanged pointer against the moved (or grown) content.
 */
export function useEdgeAutoScroll(
  active: boolean,
  container: RefObject<HTMLElement | null>,
  pointer: RefObject<PointerPoint | null>,
  onScrolled: () => void,
): void {
  const onScrolledRef = useRef(onScrolled)
  useEffect(() => {
    onScrolledRef.current = onScrolled
  })

  useEffect(() => {
    const el = container.current
    if (!active || !el) return
    const scroller = verticalScroller(el)
    let frame = 0

    const tick = () => {
      frame = requestAnimationFrame(tick)
      const point = pointer.current
      if (!point) return
      const band = viewportBand(scroller)
      const box = el.getBoundingClientRect()
      const dy = edgeStep(point.y, band.top, band.bottom)
      const dx =
        el.scrollWidth > el.clientWidth && point.y >= box.top && point.y <= box.bottom
          ? edgeStep(point.x, box.left, box.right)
          : 0
      if (dx === 0 && dy === 0) return
      if (dx !== 0) el.scrollLeft += dx
      if (dy !== 0) scroller.scrollTop += dy
      // Also when nothing could scroll: the content under the held pointer
      // may have grown since the last step (a canvas that extends itself).
      onScrolledRef.current()
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, container, pointer])
}

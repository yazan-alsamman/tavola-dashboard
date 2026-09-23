import type { TableDto } from '@/api/tables'
import type { TableBox } from '@/lib/floorGeometry'

/** Presentation-only tints. The API has no area color field, so these are never saved. */
export const AREA_TINTS = [
  {
    fill: 'bg-primary/[0.06]',
    border: 'border-primary/30',
    dot: 'bg-primary',
    selected: 'ring-primary/40',
  },
  {
    fill: 'bg-success/[0.07]',
    border: 'border-success/30',
    dot: 'bg-success',
    selected: 'ring-success/40',
  },
  {
    fill: 'bg-warning/[0.08]',
    border: 'border-warning/35',
    dot: 'bg-warning',
    selected: 'ring-warning/40',
  },
  {
    fill: 'bg-info/[0.07]',
    border: 'border-info/30',
    dot: 'bg-info',
    selected: 'ring-info/40',
  },
  {
    fill: 'bg-secondary/[0.1]',
    border: 'border-secondary/40',
    dot: 'bg-secondary',
    selected: 'ring-secondary/40',
  },
] as const

const AREA_MIN_WIDTH = 520
const AREA_MIN_HEIGHT = 220
const AREA_PAD = 32

export function areaTint(index: number) {
  return AREA_TINTS[index % AREA_TINTS.length]!
}

/** Frame around one floor plan's tables. Size is derived for display; it is not a stored section box. */
export function areaCanvasSize(boxes: TableBox[]): { width: number; height: number } {
  let width = AREA_MIN_WIDTH
  let height = AREA_MIN_HEIGHT
  for (const box of boxes) {
    width = Math.max(width, box.x + box.width + AREA_PAD)
    height = Math.max(height, box.y + box.height + AREA_PAD)
  }
  return { width, height }
}

export function tablesOnFloorPlan(
  tables: TableDto[],
  floorPlanId: string,
): TableDto[] {
  return tables.filter((table) => table.floorPlanId === floorPlanId)
}

/** Next unused "Name 2", "Name 3", … so a copied area gets its own floor-plan name. */
export function nextAreaCopyName(sourceName: string, existingNames: string[]): string {
  const used = new Set(existingNames.map((name) => name.trim().toLowerCase()))
  const base = sourceName.trim() || 'Area'
  let n = 2
  let candidate = `${base} ${n}`
  while (used.has(candidate.toLowerCase())) {
    n += 1
    candidate = `${base} ${n}`
  }
  return candidate
}

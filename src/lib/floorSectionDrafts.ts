import type { TableBox } from '@/lib/floorGeometry'

const STORAGE_KEY = 'tavola.floorSectionRects.v1'

function scopeKey(restaurantId: string, branchId: string, floorPlanId: string): string {
  return `${restaurantId}:${branchId}:${floorPlanId}`
}

function isBox(value: unknown): value is TableBox {
  if (!value || typeof value !== 'object') return false
  const box = value as Partial<TableBox>
  return (
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    (box.width ?? 0) > 0 &&
    (box.height ?? 0) > 0
  )
}

function readAll(): Record<string, Record<string, TableBox>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, Record<string, TableBox>>
  } catch {
    return {}
  }
}

/** Drawn section outlines for one floor plan. The areas API does not store a rectangle. */
export function readSectionDrafts(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
): Record<string, TableBox> {
  const stored = readAll()[scopeKey(restaurantId, branchId, floorPlanId)]
  if (!stored || typeof stored !== 'object') return {}
  const drafts: Record<string, TableBox> = {}
  for (const [areaId, value] of Object.entries(stored)) {
    if (isBox(value)) drafts[areaId] = value
  }
  return drafts
}

export function writeSectionDrafts(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  drafts: Record<string, TableBox>,
): void {
  try {
    const all = readAll()
    all[scopeKey(restaurantId, branchId, floorPlanId)] = drafts
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // a full or blocked store should not stop placing tables
  }
}

/**
 * Floor plan selection priority (ADR-007):
 * 1. Backend active FloorPlan (`isActive`)
 * 2. Persisted ID if still in the accessible list
 * 3. First FloorPlan in the list
 */
import type { FloorPlanDto } from '@/api/floorPlans'

const STORAGE_KEY = 'tavla-selected-floor-plan-id'

export function selectFloorPlanId(
  floorPlans: FloorPlanDto[],
  persistedId: string | null,
): string | null {
  if (floorPlans.length === 0) return null

  const active = floorPlans.find((fp) => fp.isActive)
  if (active) return active.floorPlanId

  if (persistedId && floorPlans.some((fp) => fp.floorPlanId === persistedId)) {
    return persistedId
  }

  return floorPlans[0]!.floorPlanId
}

export const floorPlanPersistence = {
  get(): string | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY)
      return value && value.trim().length > 0 ? value : null
    } catch {
      return null
    }
  },
  set(id: string | null): void {
    try {
      if (id === null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }
  },
  clear(): void {
    this.set(null)
  },
}

export { STORAGE_KEY as FLOOR_PLAN_STORAGE_KEY }

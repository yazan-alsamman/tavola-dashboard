import type { BranchDto } from '@/api/branches'
import type { RestaurantDto } from '@/api/restaurants'

/**
 * Restaurant selection priority (documented in ADR-005):
 * 1. Persisted ID if present in accessible list
 * 2. Auth JWT restaurantId hint if present in accessible list
 * 3. First Active restaurant, else first restaurant
 */
export function selectRestaurantId(
  restaurants: RestaurantDto[],
  persistedId: string | null,
  authHintId: string | null,
): string | null {
  if (restaurants.length === 0) return null

  if (persistedId && restaurants.some((r) => r.restaurantId === persistedId)) {
    return persistedId
  }

  if (authHintId && restaurants.some((r) => r.restaurantId === authHintId)) {
    return authHintId
  }

  const active = restaurants.find((r) => r.status === 'Active')
  return (active ?? restaurants[0]!).restaurantId
}

/**
 * Branch selection priority:
 * 1. Persisted ID if present in this restaurant's branch list
 * 2. First auth JWT branchId hint that appears in the list
 * 3. First branch in the list
 */
export function selectBranchId(
  branches: BranchDto[],
  persistedId: string | null,
  authHintIds: string[],
): string | null {
  if (branches.length === 0) return null

  if (persistedId && branches.some((b) => b.branchId === persistedId)) {
    return persistedId
  }

  for (const hint of authHintIds) {
    if (branches.some((b) => b.branchId === hint)) {
      return hint
    }
  }

  return branches[0]!.branchId
}

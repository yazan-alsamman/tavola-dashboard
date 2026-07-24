/**
 * Centralized TanStack Query keys for floor/table inventory.
 * Always include restaurant + branch (and floor when applicable) for scope isolation.
 */
export const inventoryKeys = {
  all: ['inventory'] as const,
  floorPlans: (restaurantId: string, branchId: string) =>
    [...inventoryKeys.all, 'floorPlans', restaurantId, branchId] as const,
  tablesByBranch: (restaurantId: string, branchId: string) =>
    [...inventoryKeys.all, 'tables', 'branch', restaurantId, branchId] as const,
  tablesByFloorPlan: (
    restaurantId: string,
    branchId: string,
    floorPlanId: string,
  ) =>
    [
      ...inventoryKeys.all,
      'tables',
      'floorPlan',
      restaurantId,
      branchId,
      floorPlanId,
    ] as const,
  table: (tableId: string) => [...inventoryKeys.all, 'table', tableId] as const,
}

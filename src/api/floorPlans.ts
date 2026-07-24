import { apiRequest } from './client'

/** Confirmed `FloorPlanResponseDto` from live OpenAPI. */
export interface FloorPlanDto {
  floorPlanId: string
  branchId: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FloorPlanListData {
  items: FloorPlanDto[]
}

export interface CreateFloorPlanRequest {
  name: string
}

/**
 * Lists floor plans for a branch (unpaginated). Soft-deleted excluded.
 * Owner/Admin organization members only.
 */
export async function listFloorPlans(
  restaurantId: string,
  branchId: string,
  signal?: AbortSignal,
): Promise<FloorPlanDto[]> {
  const data = await apiRequest<FloorPlanListData>(
    `/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
    { signal },
  )
  return data.items
}

/** Creates a FloorPlan. First plan for a branch auto-activates. */
export async function createFloorPlan(
  restaurantId: string,
  branchId: string,
  body: CreateFloorPlanRequest,
): Promise<FloorPlanDto> {
  return apiRequest<FloorPlanDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
    {
      method: 'POST',
      body: { name: body.name.trim() },
    },
  )
}

/** Activates a FloorPlan (no body). Atomically deactivates the previous active plan. */
export async function activateFloorPlan(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
): Promise<FloorPlanDto> {
  return apiRequest<FloorPlanDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/activate`,
    { method: 'PATCH' },
  )
}

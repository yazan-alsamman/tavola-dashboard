import { apiRequest } from './client'

/**
 * Dining area inside one floor plan (ADR-040).
 * Concurrent halls such as Main Hall and Terrace. Not a second floor plan,
 * and not the guest-visible `isActive` flag.
 */
export interface FloorPlanAreaDto {
  floorPlanAreaId: string
  floorPlanId: string
  name: string
  /** Stored and returned uppercase `#RRGGBB`. */
  color: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface FloorPlanAreaListData {
  items: FloorPlanAreaDto[]
}

export interface FloorPlanAreaWriteRequest {
  name: string
  color: string
  sortOrder: number
}

/** `#RRGGBB` only. Shorthand and alpha are rejected by the API. */
export function normalizeAreaColor(input: string): string | null {
  const color = input.trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(color) ? color : null
}

function areaPath(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  areaId?: string,
): string {
  const base = `/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/areas`
  return areaId ? `${base}/${areaId}` : base
}

function writeBody(body: FloorPlanAreaWriteRequest): FloorPlanAreaWriteRequest {
  const color = normalizeAreaColor(body.color)
  if (!color) {
    throw new Error('Floor plan area color must be #RRGGBB.')
  }
  return {
    name: body.name.trim(),
    color,
    sortOrder: body.sortOrder,
  }
}

/** Unpaginated. Ordered by sortOrder, then createdAt. Empty list is valid. */
export async function listFloorPlanAreas(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  signal?: AbortSignal,
): Promise<FloorPlanAreaDto[]> {
  const data = await apiRequest<FloorPlanAreaListData>(
    areaPath(restaurantId, branchId, floorPlanId),
    { signal },
  )
  return data.items
}

export async function getFloorPlanArea(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  areaId: string,
  signal?: AbortSignal,
): Promise<FloorPlanAreaDto> {
  return apiRequest<FloorPlanAreaDto>(
    areaPath(restaurantId, branchId, floorPlanId, areaId),
    { signal },
  )
}

export async function createFloorPlanArea(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  body: FloorPlanAreaWriteRequest,
): Promise<FloorPlanAreaDto> {
  return apiRequest<FloorPlanAreaDto>(
    areaPath(restaurantId, branchId, floorPlanId),
    { method: 'POST', body: writeBody(body) },
  )
}

/** Full replace of name, color, and sortOrder. Does not move the area. */
export async function updateFloorPlanArea(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  areaId: string,
  body: FloorPlanAreaWriteRequest,
): Promise<FloorPlanAreaDto> {
  return apiRequest<FloorPlanAreaDto>(
    areaPath(restaurantId, branchId, floorPlanId, areaId),
    { method: 'PATCH', body: writeBody(body) },
  )
}

/** Soft-delete. 204. 409 while any live table is still assigned. */
export async function deleteFloorPlanArea(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  areaId: string,
): Promise<void> {
  await apiRequest<undefined>(
    areaPath(restaurantId, branchId, floorPlanId, areaId),
    { method: 'DELETE' },
  )
}

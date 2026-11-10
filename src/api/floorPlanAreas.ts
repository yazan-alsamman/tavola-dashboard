import { apiRequest } from './client'

/** Guest-facing traits every table in the area inherits (ADR-044). */
export const FLOOR_PLAN_AREA_FEATURES = [
  'Indoor',
  'Outdoor',
  'Family',
  'Smoking',
  'NonSmoking',
  'Hookah',
  'Quiet',
  'Vip',
] as const

export type FloorPlanAreaFeature = (typeof FLOOR_PLAN_AREA_FEATURES)[number]

/** The area's rectangle on the floor grid, in layout units. All set or all null. */
export interface FloorPlanAreaLayout {
  positionX: number | null
  positionY: number | null
  width: number | null
  height: number | null
}

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
  features: FloorPlanAreaFeature[]
  /** Floor of the venue the area is on. Null means the ground floor. */
  floor: number | null
  positionX: number | null
  positionY: number | null
  width: number | null
  height: number | null
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
  /** Omitted keeps the stored value on update. */
  features?: FloorPlanAreaFeature[]
  floor?: number | null
  layout?: FloorPlanAreaLayout
}

interface FloorPlanAreaWireBody {
  name: string
  color: string
  sortOrder: number
  features?: FloorPlanAreaFeature[]
  floor?: number | null
  positionX?: number | null
  positionY?: number | null
  width?: number | null
  height?: number | null
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

function writeBody(body: FloorPlanAreaWriteRequest): FloorPlanAreaWireBody {
  const color = normalizeAreaColor(body.color)
  if (!color) {
    throw new Error('Floor plan area color must be #RRGGBB.')
  }
  return {
    name: body.name.trim(),
    color,
    sortOrder: body.sortOrder,
    ...(body.features !== undefined ? { features: body.features } : {}),
    ...(body.floor !== undefined ? { floor: body.floor } : {}),
    ...(body.layout ?? {}),
  }
}

/** Write body that repeats an area as stored, with `changes` on top. */
export function areaToWriteRequest(
  area: FloorPlanAreaDto,
  changes: Partial<FloorPlanAreaWriteRequest> = {},
): FloorPlanAreaWriteRequest {
  return {
    name: area.name,
    color: area.color,
    sortOrder: area.sortOrder,
    features: area.features,
    floor: area.floor,
    layout: {
      positionX: area.positionX,
      positionY: area.positionY,
      width: area.width,
      height: area.height,
    },
    ...changes,
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

/** Replaces name, color and sortOrder; features, floor and layout only when sent. */
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

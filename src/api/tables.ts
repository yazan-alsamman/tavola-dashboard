import { apiRequest } from './client'
import type { PaginatedData } from './types'

/**
 * Backend table status as returned by `TableResponseDto` (live OpenAPI).
 * `Reserved` and `Merged` are read-only: they are set by the reservation
 * engine and merge/split, never through `POST /tables/:id/status`.
 */
export type TableStatusDto =
  | 'Available'
  | 'Occupied'
  | 'Cleaning'
  | 'Disabled'
  | 'Reserved'
  | 'Merged'

/** Statuses a staff member can set through `POST /tables/:id/status`. */
export type ManualTableStatusDto = 'Available' | 'Occupied' | 'Cleaning' | 'Disabled'

export type TableShapeDto = 'Rectangle' | 'Round'

/** Confirmed `TableResponseDto` from live OpenAPI. */
export interface TableDto {
  tableId: string
  branchId: string
  floorPlanId: string
  tableNumber: string
  capacity: number
  floor: number | null
  positionX: number | null
  positionY: number | null
  width: number | null
  height: number | null
  rotation: number | null
  shape: TableShapeDto
  layer: number | null
  indoor: boolean
  vip: boolean
  smoking: boolean
  /** Dining area of this table's floor plan. Null sits on the layout itself. */
  floorPlanAreaId: string | null
  /** Per-table `#RRGGBB` override. Null inherits the area color. */
  color: string | null
  status: TableStatusDto
  mergeGroupId: string | null
  /** True only for the primary table of an active merge group. */
  isMergePrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface ListTablesParams {
  page?: number
  limit?: number
  /** Narrows one floor plan's tables to a dining area. Omit for the whole plan. */
  floorPlanAreaId?: string
}

/** Confirmed `CreateTableRequestDto` — status is never client-set (always Available). */
export interface CreateTableRequest {
  floorPlanId: string
  tableNumber: string
  capacity: number
  floor?: number | null
  positionX?: number | null
  positionY?: number | null
  width?: number | null
  height?: number | null
  rotation?: number | null
  shape?: TableShapeDto
  layer?: number | null
  indoor?: boolean
  vip?: boolean
  smoking?: boolean
  /** Live area of the same floor plan, or omit/null for the layout itself. */
  floorPlanAreaId?: string | null
  /** `#RRGGBB` override, or null to inherit the area color. */
  color?: string | null
}

/**
 * Confirmed `UpdateTableRequestDto` — full-replace of profile fields.
 * Does NOT accept `floorPlanId` or `status` (domain actions own those).
 * `floorPlanAreaId` is resolved against this table's current floor plan.
 */
export interface UpdateTableRequest {
  tableNumber: string
  capacity: number
  floor?: number | null
  positionX?: number | null
  positionY?: number | null
  width?: number | null
  height?: number | null
  rotation?: number | null
  shape?: TableShapeDto
  layer?: number | null
  indoor?: boolean
  vip?: boolean
  smoking?: boolean
  floorPlanAreaId?: string | null
  color?: string | null
}

export interface MoveTableRequest {
  targetFloorPlanId: string
  /** Area of the target floor plan. Omit or null to land with no area. */
  targetFloorPlanAreaId?: string | null
}

export interface ChangeTableStatusRequest {
  status: ManualTableStatusDto
}

/** Allowed status transitions (backend Status Management). */
export function allowedTableStatusTransitions(
  current: TableStatusDto,
): ManualTableStatusDto[] {
  if (current === 'Available') {
    return ['Occupied', 'Cleaning', 'Disabled']
  }
  if (current === 'Reserved' || current === 'Merged') {
    return []
  }
  return ['Available']
}

export async function listTablesByBranch(
  restaurantId: string,
  branchId: string,
  params: ListTablesParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<TableDto>> {
  return apiRequest<PaginatedData<TableDto>>(
    `/restaurants/${restaurantId}/branches/${branchId}/tables`,
    {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
      signal,
    },
  )
}

export async function listTablesByFloorPlan(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  params: ListTablesParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<TableDto>> {
  return apiRequest<PaginatedData<TableDto>>(
    `/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/tables`,
    {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.floorPlanAreaId
          ? { floorPlanAreaId: params.floorPlanAreaId }
          : {}),
      },
      signal,
    },
  )
}

export async function getTable(tableId: string, signal?: AbortSignal): Promise<TableDto> {
  return apiRequest<TableDto>(`/tables/${tableId}`, { signal })
}

export async function createTable(
  restaurantId: string,
  branchId: string,
  body: CreateTableRequest,
): Promise<TableDto> {
  return apiRequest<TableDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/tables`,
    {
      method: 'POST',
      body: {
        floorPlanId: body.floorPlanId,
        tableNumber: body.tableNumber.trim(),
        capacity: body.capacity,
        ...(body.floor !== undefined ? { floor: body.floor } : {}),
        ...(body.positionX !== undefined ? { positionX: body.positionX } : {}),
        ...(body.positionY !== undefined ? { positionY: body.positionY } : {}),
        ...(body.width !== undefined ? { width: body.width } : {}),
        ...(body.height !== undefined ? { height: body.height } : {}),
        ...(body.rotation !== undefined ? { rotation: body.rotation } : {}),
        ...(body.shape !== undefined ? { shape: body.shape } : {}),
        ...(body.layer !== undefined ? { layer: body.layer } : {}),
        ...(body.indoor !== undefined ? { indoor: body.indoor } : {}),
        ...(body.vip !== undefined ? { vip: body.vip } : {}),
        ...(body.smoking !== undefined ? { smoking: body.smoking } : {}),
        ...(body.floorPlanAreaId !== undefined
          ? { floorPlanAreaId: body.floorPlanAreaId }
          : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
      },
    },
  )
}

export async function updateTable(
  tableId: string,
  body: UpdateTableRequest,
): Promise<TableDto> {
  return apiRequest<TableDto>(`/tables/${tableId}`, {
    method: 'PATCH',
    body: {
      tableNumber: body.tableNumber.trim(),
      capacity: body.capacity,
      floor: body.floor ?? null,
      positionX: body.positionX ?? null,
      positionY: body.positionY ?? null,
      width: body.width ?? null,
      height: body.height ?? null,
      rotation: body.rotation ?? null,
      shape: body.shape ?? 'Rectangle',
      layer: body.layer ?? null,
      indoor: body.indoor ?? true,
      vip: body.vip ?? false,
      smoking: body.smoking ?? false,
      floorPlanAreaId: body.floorPlanAreaId ?? null,
      color: body.color ?? null,
    },
  })
}

/** Soft-delete. Returns undefined on 204. */
export async function deleteTable(tableId: string): Promise<void> {
  await apiRequest<undefined>(`/tables/${tableId}`, { method: 'DELETE' })
}

export async function moveTable(
  tableId: string,
  body: MoveTableRequest,
): Promise<TableDto> {
  return apiRequest<TableDto>(`/tables/${tableId}/move`, {
    method: 'POST',
    body: {
      targetFloorPlanId: body.targetFloorPlanId,
      ...(body.targetFloorPlanAreaId !== undefined
        ? { targetFloorPlanAreaId: body.targetFloorPlanAreaId }
        : {}),
    },
  })
}

export async function changeTableStatus(
  tableId: string,
  body: ChangeTableStatusRequest,
): Promise<TableDto> {
  return apiRequest<TableDto>(`/tables/${tableId}/status`, {
    method: 'POST',
    body: { status: body.status },
  })
}

export interface MergeTablesRequest {
  tableIds: string[]
  primaryTableId?: string | null
}

/** Merge ≥2 Available tables on the same branch + floor plan. */
export async function mergeTables(body: MergeTablesRequest): Promise<TableDto> {
  return apiRequest<TableDto>('/tables/merge', {
    method: 'POST',
    body: {
      tableIds: body.tableIds,
      ...(body.primaryTableId != null
        ? { primaryTableId: body.primaryTableId }
        : {}),
    },
  })
}

/** Undo a merge group — any member table id works. */
export async function splitTable(tableId: string): Promise<TableDto> {
  return apiRequest<TableDto>(`/tables/${tableId}/split`, {
    method: 'POST',
  })
}

/** Builds a full UpdateTableRequest from an existing table + overrides (never status/floorPlanId). */
export function tableToUpdateRequest(
  table: TableDto,
  overrides: Partial<UpdateTableRequest> = {},
): UpdateTableRequest {
  return {
    tableNumber: overrides.tableNumber ?? table.tableNumber,
    capacity: overrides.capacity ?? table.capacity,
    floor: overrides.floor !== undefined ? overrides.floor : table.floor,
    positionX:
      overrides.positionX !== undefined ? overrides.positionX : table.positionX,
    positionY:
      overrides.positionY !== undefined ? overrides.positionY : table.positionY,
    width: overrides.width !== undefined ? overrides.width : table.width,
    height: overrides.height !== undefined ? overrides.height : table.height,
    rotation:
      overrides.rotation !== undefined ? overrides.rotation : table.rotation,
    shape: overrides.shape ?? table.shape,
    layer: overrides.layer !== undefined ? overrides.layer : table.layer,
    indoor: overrides.indoor ?? table.indoor,
    vip: overrides.vip ?? table.vip,
    smoking: overrides.smoking ?? table.smoking,
    floorPlanAreaId:
      overrides.floorPlanAreaId !== undefined
        ? overrides.floorPlanAreaId
        : (table.floorPlanAreaId ?? null),
    color: overrides.color !== undefined ? overrides.color : (table.color ?? null),
  }
}

/** Fetches all pages for a branch (capped). */
export async function listAllTablesByBranch(
  restaurantId: string,
  branchId: string,
  pageSize = 100,
  signal?: AbortSignal,
): Promise<TableDto[]> {
  const items: TableDto[] = []
  let page = 1
  let total = Infinity
  const maxPages = 50

  while (items.length < total && page <= maxPages) {
    const result = await listTablesByBranch(
      restaurantId,
      branchId,
      { page, limit: pageSize },
      signal,
    )
    items.push(...result.items)
    total = result.total
    if (result.items.length === 0) break
    page += 1
  }

  return items
}

/** Fetches all pages for a floor plan (capped). */
export async function listAllTablesByFloorPlan(
  restaurantId: string,
  branchId: string,
  floorPlanId: string,
  pageSize = 100,
  signal?: AbortSignal,
): Promise<TableDto[]> {
  const items: TableDto[] = []
  let page = 1
  let total = Infinity
  const maxPages = 50

  while (items.length < total && page <= maxPages) {
    const result = await listTablesByFloorPlan(
      restaurantId,
      branchId,
      floorPlanId,
      { page, limit: pageSize },
      signal,
    )
    items.push(...result.items)
    total = result.total
    if (result.items.length === 0) break
    page += 1
  }

  return items
}

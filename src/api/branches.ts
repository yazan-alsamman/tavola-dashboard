import { apiRequest } from './client'
import type { PaginatedData } from './types'
import type { WorkingHoursDto } from './restaurants'

/**
 * Confirmed `BranchResponseDto` from live Swagger / Postman.
 * Branches have no `name` or `status` field — soft-delete is the only inactive signal.
 */
export interface BranchDto {
  branchId: string
  restaurantId: string
  city: string
  district: string | null
  address: string
  latitude: number | null
  longitude: number | null
  countryCode: string
  currency: string | null
  timezone: string
  phone: string | null
  createdAt: string
  updatedAt: string
}

export interface ListBranchesParams {
  page?: number
  limit?: number
}

/** Create / update body from Postman (full-replace on PATCH). */
export interface BranchWriteRequest {
  city: string
  district?: string | null
  address: string
  latitude?: number | null
  longitude?: number | null
  countryCode: string
  currency?: string | null
  timezone: string
  phone?: string | null
}

export async function listBranches(
  restaurantId: string,
  params: ListBranchesParams = {},
): Promise<PaginatedData<BranchDto>> {
  return apiRequest<PaginatedData<BranchDto>>(
    `/restaurants/${restaurantId}/branches`,
    {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  )
}

export async function getBranch(
  restaurantId: string,
  branchId: string,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(
    `/restaurants/${restaurantId}/branches/${branchId}`,
  )
}

export async function createBranch(
  restaurantId: string,
  body: BranchWriteRequest,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(`/restaurants/${restaurantId}/branches`, {
    method: 'POST',
    body,
  })
}

export async function updateBranch(
  restaurantId: string,
  branchId: string,
  body: BranchWriteRequest,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(
    `/restaurants/${restaurantId}/branches/${branchId}`,
    {
      method: 'PATCH',
      body,
    },
  )
}

/** Soft-delete. Not idempotent. */
export async function deleteBranch(
  restaurantId: string,
  branchId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `/restaurants/${restaurantId}/branches/${branchId}`,
    { method: 'DELETE' },
  )
}

export async function getBranchWorkingHours(
  restaurantId: string,
  branchId: string,
): Promise<WorkingHoursDto> {
  return apiRequest<WorkingHoursDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/working-hours`,
  )
}

export async function updateBranchWorkingHours(
  restaurantId: string,
  branchId: string,
  body: WorkingHoursDto,
): Promise<WorkingHoursDto> {
  return apiRequest<WorkingHoursDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/working-hours`,
    {
      method: 'PATCH',
      body,
    },
  )
}

export async function listAllBranches(
  restaurantId: string,
  pageSize = 100,
  signal?: AbortSignal,
): Promise<BranchDto[]> {
  const items: BranchDto[] = []
  let page = 1
  let total = Infinity
  const maxPages = 50

  while (items.length < total && page <= maxPages) {
    const result = await apiRequest<PaginatedData<BranchDto>>(
      `/restaurants/${restaurantId}/branches`,
      {
        query: { page, limit: pageSize },
        signal,
      },
    )
    items.push(...result.items)
    total = result.total
    if (result.items.length === 0) break
    page += 1
  }

  return items
}

/** Presentation label — branches have no dedicated name field. */
export function formatBranchLabel(branch: BranchDto): string {
  if (branch.district && branch.district.trim().length > 0) {
    return `${branch.city} — ${branch.district}`
  }
  return branch.city
}

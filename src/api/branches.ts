import { apiRequest } from './client'
import type { PaginatedData } from './types'

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

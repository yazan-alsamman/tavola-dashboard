import { apiRequest } from './client'
import type { PaginatedData } from './types'

export type RestaurantStatus = 'Active' | 'Suspended'

/** Confirmed `RestaurantResponseDto` from live Swagger / Postman. */
export interface RestaurantDto {
  restaurantId: string
  name: string
  slug: string
  logoId: string | null
  coverImageId: string | null
  description: string | null
  cuisineType: string | null
  averageRating: number | null
  priceLevel: number | null
  status: RestaurantStatus
  createdAt: string
  updatedAt: string
}

export interface ListRestaurantsParams {
  page?: number
  limit?: number
}

export async function listRestaurants(
  params: ListRestaurantsParams = {},
): Promise<PaginatedData<RestaurantDto>> {
  return apiRequest<PaginatedData<RestaurantDto>>('/restaurants', {
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  })
}

export async function getRestaurant(restaurantId: string): Promise<RestaurantDto> {
  return apiRequest<RestaurantDto>(`/restaurants/${restaurantId}`)
}

/**
 * Fetches every page of restaurants available to the authenticated actor.
 * Caps pages defensively to avoid runaway loops on a corrupt total.
 */
export async function listAllRestaurants(
  pageSize = 100,
  signal?: AbortSignal,
): Promise<RestaurantDto[]> {
  const items: RestaurantDto[] = []
  let page = 1
  let total = Infinity
  const maxPages = 50

  while (items.length < total && page <= maxPages) {
    const result = await apiRequest<PaginatedData<RestaurantDto>>('/restaurants', {
      query: { page, limit: pageSize },
      signal,
    })
    items.push(...result.items)
    total = result.total
    if (result.items.length === 0) break
    page += 1
  }

  return items
}

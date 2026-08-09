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

export interface CreateRestaurantRequest {
  name: string
  description?: string | null
  cuisineType?: string | null
  priceLevel?: number | null
}

export interface UpdateRestaurantRequest {
  name: string
  description?: string | null
  cuisineType?: string | null
  priceLevel?: number | null
  status?: RestaurantStatus
}

/** Confirmed restaurant reservation settings (Postman). */
export interface RestaurantSettingsDto {
  reservationIntervalMinutes: number
  maxGuestsPerReservation: number
  cancellationWindowMinutes: number
  pendingReservationTimeoutMinutes: number
  defaultReservationDurationMinutes: number
  autoApproval: boolean
  timezone: string
  defaultCurrency: string
}

export type UpdateRestaurantSettingsRequest = RestaurantSettingsDto

export interface WorkingHoursEntry {
  dayOfWeek: number
  openingTime: string
  closingTime: string
  breakStartTime: string | null
  breakEndTime: string | null
}

export interface WorkingHoursDto {
  entries: WorkingHoursEntry[]
}

export interface GalleryItemDto {
  galleryItemId: string
  sortOrder?: number
  url?: string | null
  fileId?: string | null
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

export async function createRestaurant(
  body: CreateRestaurantRequest,
): Promise<RestaurantDto> {
  return apiRequest<RestaurantDto>('/restaurants', {
    method: 'POST',
    body,
  })
}

export async function updateRestaurant(
  restaurantId: string,
  body: UpdateRestaurantRequest,
): Promise<RestaurantDto> {
  return apiRequest<RestaurantDto>(`/restaurants/${restaurantId}`, {
    method: 'PATCH',
    body,
  })
}

/** Soft-delete. Not idempotent — already-deleted returns 404. */
export async function deleteRestaurant(restaurantId: string): Promise<void> {
  await apiRequest<undefined>(`/restaurants/${restaurantId}`, {
    method: 'DELETE',
  })
}

export async function getRestaurantSettings(
  restaurantId: string,
): Promise<RestaurantSettingsDto> {
  return apiRequest<RestaurantSettingsDto>(`/restaurants/${restaurantId}/settings`)
}

export async function updateRestaurantSettings(
  restaurantId: string,
  body: UpdateRestaurantSettingsRequest,
): Promise<RestaurantSettingsDto> {
  return apiRequest<RestaurantSettingsDto>(`/restaurants/${restaurantId}/settings`, {
    method: 'PATCH',
    body,
  })
}

export async function getRestaurantWorkingHours(
  restaurantId: string,
): Promise<WorkingHoursDto> {
  return apiRequest<WorkingHoursDto>(`/restaurants/${restaurantId}/working-hours`)
}

export async function updateRestaurantWorkingHours(
  restaurantId: string,
  body: WorkingHoursDto,
): Promise<WorkingHoursDto> {
  return apiRequest<WorkingHoursDto>(`/restaurants/${restaurantId}/working-hours`, {
    method: 'PATCH',
    body,
  })
}

export async function listRestaurantGallery(
  restaurantId: string,
): Promise<GalleryItemDto[]> {
  return apiRequest<GalleryItemDto[]>(`/restaurants/${restaurantId}/gallery`)
}

export async function addRestaurantGalleryImage(
  restaurantId: string,
  file: File,
): Promise<GalleryItemDto> {
  const form = new FormData()
  form.append('file', file)
  return apiRequest<GalleryItemDto>(`/restaurants/${restaurantId}/gallery`, {
    method: 'POST',
    body: form,
  })
}

export async function removeRestaurantGalleryImage(
  restaurantId: string,
  galleryItemId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `/restaurants/${restaurantId}/gallery/${galleryItemId}`,
    { method: 'DELETE' },
  )
}

export async function getRestaurantCuisineCategories(
  restaurantId: string,
): Promise<CuisineCategoryAssignment> {
  const data = await apiRequest<unknown>(
    `/restaurants/${restaurantId}/cuisine-categories`,
  )
  return normalizeCuisineAssignment(data)
}

export async function setRestaurantCuisineCategories(
  restaurantId: string,
  cuisineCategoryIds: string[],
): Promise<CuisineCategoryAssignment> {
  const data = await apiRequest<unknown>(
    `/restaurants/${restaurantId}/cuisine-categories`,
    {
      method: 'PATCH',
      body: { cuisineCategoryIds },
    },
  )
  return normalizeCuisineAssignment(data)
}

export async function getRestaurantOccasionCategories(
  restaurantId: string,
): Promise<OccasionCategoryAssignment> {
  const data = await apiRequest<unknown>(
    `/restaurants/${restaurantId}/occasion-categories`,
  )
  return normalizeOccasionAssignment(data)
}

export async function setRestaurantOccasionCategories(
  restaurantId: string,
  occasionCategoryIds: string[],
): Promise<OccasionCategoryAssignment> {
  const data = await apiRequest<unknown>(
    `/restaurants/${restaurantId}/occasion-categories`,
    {
      method: 'PATCH',
      body: { occasionCategoryIds },
    },
  )
  return normalizeOccasionAssignment(data)
}

export interface CuisineCategoryAssignment {
  cuisineCategoryIds: string[]
}

export interface OccasionCategoryAssignment {
  occasionCategoryIds: string[]
}

function collectIds(
  data: unknown,
  idKeys: string[],
  arrayKeys: string[],
): string[] {
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          for (const key of idKeys) {
            const value = record[key]
            if (typeof value === 'string' && value) return value
          }
        }
        return ''
      })
      .filter(Boolean)
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of arrayKeys) {
      const value = record[key]
      if (Array.isArray(value)) return collectIds(value, idKeys, arrayKeys)
    }
    if (Array.isArray(record.items)) {
      return collectIds(record.items, idKeys, arrayKeys)
    }
  }
  return []
}

function normalizeCuisineAssignment(data: unknown): CuisineCategoryAssignment {
  return {
    cuisineCategoryIds: collectIds(
      data,
      ['cuisineCategoryId', 'id'],
      ['cuisineCategoryIds', 'categories'],
    ),
  }
}

function normalizeOccasionAssignment(data: unknown): OccasionCategoryAssignment {
  return {
    occasionCategoryIds: collectIds(
      data,
      ['occasionCategoryId', 'id'],
      ['occasionCategoryIds', 'categories'],
    ),
  }
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

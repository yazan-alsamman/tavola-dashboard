import { apiRequest } from './client'

export interface CuisineCategoryDto {
  cuisineCategoryId: string
  name: string
  slug?: string
  sortOrder?: number
}

export interface OccasionCategoryDto {
  occasionCategoryId: string
  name: string
  slug?: string
  sortOrder?: number
}

/** The API wraps both lists as `{ items: [...] }`; tolerate a bare array too. */
function unwrapItems<T>(data: T[] | { items?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.items) ? data.items : []
}

/** Active cuisine categories sorted by sortOrder. */
export async function listCuisineCategories(
  signal?: AbortSignal,
): Promise<CuisineCategoryDto[]> {
  return unwrapItems(
    await apiRequest<CuisineCategoryDto[] | { items?: CuisineCategoryDto[] }>(
      '/cuisine-categories',
      { signal },
    ),
  )
}

/** Active occasion categories sorted by sortOrder. */
export async function listOccasionCategories(
  signal?: AbortSignal,
): Promise<OccasionCategoryDto[]> {
  return unwrapItems(
    await apiRequest<OccasionCategoryDto[] | { items?: OccasionCategoryDto[] }>(
      '/occasion-categories',
      { signal },
    ),
  )
}

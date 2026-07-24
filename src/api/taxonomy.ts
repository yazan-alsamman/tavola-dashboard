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

/** Active cuisine categories sorted by sortOrder. */
export async function listCuisineCategories(
  signal?: AbortSignal,
): Promise<CuisineCategoryDto[]> {
  return apiRequest<CuisineCategoryDto[]>('/cuisine-categories', { signal })
}

/** Active occasion categories sorted by sortOrder. */
export async function listOccasionCategories(
  signal?: AbortSignal,
): Promise<OccasionCategoryDto[]> {
  return apiRequest<OccasionCategoryDto[]>('/occasion-categories', { signal })
}

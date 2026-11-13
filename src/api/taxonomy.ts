import { apiRequest } from './client'

export interface CuisineCategoryDto {
  cuisineCategoryId: string
  name: string
  /** Arabic label; null when the backend has none (fall back to `name`). */
  nameAr?: string | null
  slug?: string
  sortOrder?: number
}

export interface OccasionCategoryDto {
  occasionCategoryId: string
  name: string
  /** Arabic label; null when the backend has none (fall back to `name`). */
  nameAr?: string | null
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

/** A category's label in the reader's language, falling back to `name`. */
export function taxonomyLabel(
  category: Pick<CuisineCategoryDto, 'name' | 'nameAr'>,
  locale: 'ar' | 'en',
): string {
  return (locale === 'ar' && category.nameAr?.trim()) || category.name
}

export interface CuisineTypeOption {
  /** The value sent as `cuisineType`: the category's canonical `name`. */
  value: string
  label: string
}

export interface CuisineTypeChoices {
  options: CuisineTypeOption[]
  /** The restaurant's current value when it is not in the list (typed by
   * hand before the backend restricted `cuisineType`). The backend still
   * accepts it re-sent unchanged; any new value must come from `options`. */
  legacyValue: string | null
  /** `current` mapped to its option value (case-insensitive name/slug match). */
  selectedValue: string
}

/**
 * `cuisineType` is restricted by the backend to the name (or slug) of an
 * active cuisine category, stored as the category's `name`.
 */
export function cuisineTypeChoices(
  catalog: readonly CuisineCategoryDto[],
  current: string,
  locale: 'ar' | 'en',
): CuisineTypeChoices {
  const options = catalog.map((c) => ({ value: c.name, label: taxonomyLabel(c, locale) }))
  const trimmed = current.trim()
  if (trimmed === '') return { options, legacyValue: null, selectedValue: '' }
  const needle = trimmed.toLowerCase()
  const match = catalog.find(
    (c) => c.name.trim().toLowerCase() === needle || c.slug?.toLowerCase() === needle,
  )
  if (match) return { options, legacyValue: null, selectedValue: match.name }
  // While the catalog is still loading nothing can match yet: don't flag it.
  return {
    options,
    legacyValue: catalog.length > 0 ? current : null,
    selectedValue: current,
  }
}

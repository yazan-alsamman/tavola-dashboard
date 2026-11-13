import type { RestaurantDto } from '@/api/restaurants'

type Named = Pick<RestaurantDto, 'name'> &
  Partial<Pick<RestaurantDto, 'nameAr' | 'nameEn'>>

/**
 * Backend ADR-052: the restaurant name in the selected language, falling back
 * to the other language and then to the single `name` older data carries.
 */
export function restaurantName(restaurant: Named, locale: string): string {
  const preferred = locale === 'ar' ? restaurant.nameAr : restaurant.nameEn
  const other = locale === 'ar' ? restaurant.nameEn : restaurant.nameAr
  return preferred?.trim() || other?.trim() || restaurant.name
}

const ARABIC_SCRIPT = /[؀-ۿ]/

/**
 * The form values for the two languages. Data saved before ADR-052 has only
 * the single text, which is shown in the field of its script.
 */
export function splitByLanguage(
  single: string | null | undefined,
  ar: string | null | undefined,
  en: string | null | undefined,
): { ar: string; en: string } {
  if (ar != null || en != null) return { ar: ar ?? '', en: en ?? '' }
  const text = single ?? ''
  return ARABIC_SCRIPT.test(text) ? { ar: text, en: '' } : { ar: '', en: text }
}

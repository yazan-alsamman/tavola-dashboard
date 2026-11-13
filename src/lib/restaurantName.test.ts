import { describe, expect, it } from 'vitest'
import { restaurantName, splitByLanguage } from './restaurantName'

describe('restaurantName', () => {
  it('follows the selected language and falls back', () => {
    const r = { name: 'نارنج', nameAr: 'نارنج', nameEn: 'Naranj' }
    expect(restaurantName(r, 'en')).toBe('Naranj')
    expect(restaurantName(r, 'ar')).toBe('نارنج')
    expect(restaurantName({ name: 'نارنج', nameAr: 'نارنج', nameEn: null }, 'en')).toBe('نارنج')
    expect(restaurantName({ name: 'Old' }, 'ar')).toBe('Old')
  })

  it('files old single text under its script', () => {
    expect(splitByLanguage('نارنج', null, null)).toEqual({ ar: 'نارنج', en: '' })
    expect(splitByLanguage('Naranj', undefined, undefined)).toEqual({ ar: '', en: 'Naranj' })
    expect(splitByLanguage('x', 'أ', null)).toEqual({ ar: 'أ', en: '' })
  })
})

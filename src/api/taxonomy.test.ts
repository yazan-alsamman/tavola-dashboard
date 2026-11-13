import { describe, expect, it } from 'vitest'
import { cuisineTypeChoices, taxonomyLabel, type CuisineCategoryDto } from './taxonomy'

const catalog: CuisineCategoryDto[] = [
  { cuisineCategoryId: 'c1', slug: 'italian', name: 'Italian', nameAr: 'إيطالي' },
  { cuisineCategoryId: 'c2', slug: 'oriental', name: 'Oriental', nameAr: null },
]

describe('taxonomyLabel', () => {
  it('uses the Arabic name in Arabic and falls back to name', () => {
    expect(taxonomyLabel(catalog[0]!, 'ar')).toBe('إيطالي')
    expect(taxonomyLabel(catalog[0]!, 'en')).toBe('Italian')
    expect(taxonomyLabel(catalog[1]!, 'ar')).toBe('Oriental')
  })
})

describe('cuisineTypeChoices', () => {
  it('offers every category with its canonical name as the value', () => {
    const { options } = cuisineTypeChoices(catalog, '', 'ar')
    expect(options).toEqual([
      { value: 'Italian', label: 'إيطالي' },
      { value: 'Oriental', label: 'Oriental' },
    ])
  })

  it('maps a case-insensitive name or slug match to the option value', () => {
    expect(cuisineTypeChoices(catalog, 'italian', 'en')).toMatchObject({
      selectedValue: 'Italian',
      legacyValue: null,
    })
    expect(cuisineTypeChoices(catalog, 'ORIENTAL ', 'en').selectedValue).toBe('Oriental')
  })

  it('flags a hand-typed value that is not in the list as legacy', () => {
    expect(cuisineTypeChoices(catalog, 'مشاوي', 'ar')).toMatchObject({
      selectedValue: 'مشاوي',
      legacyValue: 'مشاوي',
    })
  })

  it('does not flag anything while the catalog is empty (still loading)', () => {
    expect(cuisineTypeChoices([], 'Italian', 'en').legacyValue).toBeNull()
  })
})

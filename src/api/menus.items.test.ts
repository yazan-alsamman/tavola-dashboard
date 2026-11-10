import { describe, expect, it } from 'vitest'
import {
  menuCurrency,
  menuItemDisplayName,
  menuItemSecondaryName,
  menuItemUpdateBody,
  normalizeMenu,
  type MenuItemDto,
} from './menus'

const item: MenuItemDto = {
  itemId: 'item-1',
  name: 'شاورما',
  nameAr: 'شاورما',
  nameEn: 'Shawarma',
  description: 'Chicken',
  price: 25000,
  currency: null,
  preparationTimeMinutes: 10,
  spicyLevel: 1,
  calories: 600,
  allergens: ['sesame'],
  dietaryLabels: ['Halal'],
  availabilityMode: 'Always',
}

describe('menuItemUpdateBody (full replace, ADR-046)', () => {
  it('keeps every current field and applies the change', () => {
    expect(menuItemUpdateBody(item, { availabilityMode: 'Unavailable' })).toEqual({
      nameAr: 'شاورما',
      nameEn: 'Shawarma',
      description: 'Chicken',
      price: 25000,
      currency: null,
      preparationTimeMinutes: 10,
      spicyLevel: 1,
      calories: 600,
      allergens: ['sesame'],
      dietaryLabels: ['Halal'],
      availabilityMode: 'Unavailable',
    })
  })

  it('carries a legacy single name as the English name', () => {
    const legacy: MenuItemDto = { itemId: 'i', name: 'Pasta', price: 1 }
    expect(menuItemUpdateBody(legacy)).toMatchObject({ nameAr: null, nameEn: 'Pasta' })
  })
})

describe('item names', () => {
  it('shows the reader language first and the other below', () => {
    expect(menuItemDisplayName(item, 'en')).toBe('Shawarma')
    expect(menuItemSecondaryName(item, 'en')).toBe('شاورما')
    expect(menuItemDisplayName(item, 'ar')).toBe('شاورما')
    expect(menuItemSecondaryName(item, 'ar')).toBe('Shawarma')
  })

  it('falls back to the only name there is', () => {
    const arabicOnly = { ...item, nameEn: null }
    expect(menuItemDisplayName(arabicOnly, 'en')).toBe('شاورما')
    expect(menuItemSecondaryName(arabicOnly, 'en')).toBeNull()
  })

  it('normalizes nameAr/nameEn and the menu branch', () => {
    const menu = normalizeMenu({
      id: 'm',
      name: 'Branch',
      branchId: 'b-1',
      categories: [{ id: 'c', name: 'C', items: [{ id: 'i', name: 'x', nameAr: 'س', nameEn: '' }] }],
    })
    expect(menu.branchId).toBe('b-1')
    expect(menu.categories?.[0]?.items?.[0]).toMatchObject({ nameAr: 'س', nameEn: null })
  })
})

describe('menuCurrency', () => {
  const branches = [
    { branchId: 'b-1', currency: 'SYP' },
    { branchId: 'b-2', currency: 'SYP' },
  ]

  it("uses a branch menu's branch currency", () => {
    expect(menuCurrency({ branchId: 'b-2' }, [...branches, { branchId: 'b-3', currency: 'USD' }])).toBe('SYP')
  })

  it('uses the shared currency only when every branch has the same one', () => {
    expect(menuCurrency({ branchId: null }, branches)).toBe('SYP')
    expect(menuCurrency({ branchId: null }, [...branches, { branchId: 'b-3', currency: 'USD' }])).toBeNull()
  })
})

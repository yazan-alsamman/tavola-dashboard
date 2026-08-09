import { describe, expect, it } from 'vitest'
import { normalizeMenu } from './menus'

describe('normalizeMenu', () => {
  it('maps live API id/active array-shaped menus onto dashboard DTOs', () => {
    const menu = normalizeMenu({
      id: 'menu-1',
      restaurantId: 'rest-1',
      name: 'Dinner',
      active: true,
      isDefault: true,
      categories: [
        {
          id: 'cat-1',
          name: 'Mains',
          items: [
            {
              id: 'item-1',
              name: 'Pasta',
              price: 42,
              optionGroups: [
                {
                  id: 'og-1',
                  name: 'Size',
                  options: [{ id: 'opt-1', name: 'Large', priceModifier: 5 }],
                },
              ],
              addOns: [{ id: 'addon-1', name: 'Cheese', price: 3 }],
            },
          ],
        },
      ],
    })

    expect(menu.menuId).toBe('menu-1')
    expect(menu.status).toBe('Active')
    expect(menu.categories?.[0]?.categoryId).toBe('cat-1')
    expect(menu.categories?.[0]?.items?.[0]?.itemId).toBe('item-1')
    expect(
      menu.categories?.[0]?.items?.[0]?.optionGroups?.[0]?.optionGroupId,
    ).toBe('og-1')
    expect(
      menu.categories?.[0]?.items?.[0]?.optionGroups?.[0]?.options?.[0]
        ?.optionId,
    ).toBe('opt-1')
    expect(menu.categories?.[0]?.items?.[0]?.addOns?.[0]?.addOnId).toBe(
      'addon-1',
    )
  })

  it('keeps Postman-style menuId/status fields when already present', () => {
    const menu = normalizeMenu({
      menuId: 'menu-2',
      name: 'Lunch',
      status: 'Inactive',
    })

    expect(menu.menuId).toBe('menu-2')
    expect(menu.status).toBe('Inactive')
  })
})

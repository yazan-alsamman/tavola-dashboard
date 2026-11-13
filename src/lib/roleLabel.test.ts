import { describe, expect, it } from 'vitest'
import { roleDescription, roleLabel } from './roleLabel'

const words = {
  names: {
    manager: 'مدير',
    receptionist: 'موظف حجوزات',
    'front-desk': 'الاستقبال',
    cashier: 'كاشير',
  },
  descriptions: {
    manager: 'm',
    receptionist: 'r',
    'front-desk': 'حجوزات اليوم فقط',
    cashier: 'c',
  },
}

describe('roleLabel', () => {
  it('translates seeded roles by slug', () => {
    expect(roleLabel({ slug: 'front-desk', name: 'Front Desk' }, words)).toBe('الاستقبال')
    expect(roleDescription({ slug: 'front-desk', description: 'x' }, words)).toBe('حجوزات اليوم فقط')
  })

  it('keeps a custom role as the server named it', () => {
    expect(roleLabel({ slug: 'sommelier', name: 'Sommelier' }, words)).toBe('Sommelier')
  })
})

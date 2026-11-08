import { describe, expect, it } from 'vitest'
import type { TableDto } from '@/api/tables'
import { effectiveCapacity } from './tableCapacity'

function table(overrides: Partial<TableDto>): TableDto {
  return {
    tableId: 't',
    tableNumber: 'T1',
    capacity: 4,
    mergeGroupId: null,
    isMergePrimary: false,
    ...overrides,
  } as TableDto
}

describe('effectiveCapacity', () => {
  it('sums every member for the primary of a merge group', () => {
    const a = table({ tableId: 'a', capacity: 4, mergeGroupId: 'g', isMergePrimary: true })
    const b = table({ tableId: 'b', capacity: 4, mergeGroupId: 'g' })
    const c = table({ tableId: 'c', capacity: 2 })
    expect(effectiveCapacity(a, [a, b, c])).toBe(8)
  })

  it('keeps a non-primary member and an unmerged table at their own capacity', () => {
    const a = table({ tableId: 'a', capacity: 4, mergeGroupId: 'g', isMergePrimary: true })
    const b = table({ tableId: 'b', capacity: 4, mergeGroupId: 'g' })
    const c = table({ tableId: 'c', capacity: 2 })
    expect(effectiveCapacity(b, [a, b, c])).toBe(4)
    expect(effectiveCapacity(c, [a, b, c])).toBe(2)
  })
})

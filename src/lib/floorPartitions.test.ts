import { describe, expect, it } from 'vitest'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import { nextHallSortOrder } from '@/lib/floorPartitions'

function area(sortOrder: number): FloorPlanAreaDto {
  return {
    floorPlanAreaId: `area-${sortOrder}`,
    floorPlanId: 'plan',
    name: 'Main Hall',
    color: '#1F6B4A',
    sortOrder,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('floor area order', () => {
  it('places a new area after the current ones', () => {
    expect(nextHallSortOrder([])).toBe(0)
    expect(nextHallSortOrder([area(0), area(2)])).toBe(3)
  })
})

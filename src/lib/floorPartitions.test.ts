import { describe, expect, it } from 'vitest'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import {
  partitionFrames,
  tablesInsidePartition,
} from '@/lib/floorPartitions'

function table(
  partial: Pick<TableDto, 'tableId' | 'positionX' | 'positionY'> &
    Partial<TableDto>,
): TableDto {
  return {
    branchId: 'b',
    floorPlanId: 'plan',
    tableNumber: partial.tableId,
    capacity: 4,
    floor: null,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'Rectangle',
    layer: null,
    indoor: true,
    vip: false,
    smoking: false,
    floorPlanAreaId: null,
    color: null,
    status: 'Available',
    mergeGroupId: null,
    isMergePrimary: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const hall: FloorPlanAreaDto = {
  floorPlanAreaId: 'hall',
  floorPlanId: 'plan',
  name: 'Main Hall',
  color: '#1F6B4A',
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('floor partitions', () => {
  it('draws a padded outline around tables in one hall', () => {
    const frames = partitionFrames(
      [hall],
      [
        table({
          tableId: 't1',
          positionX: 100,
          positionY: 80,
          floorPlanAreaId: 'hall',
        }),
        table({
          tableId: 't2',
          positionX: 40,
          positionY: 40,
          floorPlanAreaId: null,
        }),
      ],
    )
    expect(frames).toHaveLength(1)
    expect(frames[0]?.name).toBe('Main Hall')
    expect(frames[0]?.x).toBe(72)
    expect(frames[0]?.y).toBe(52)
    expect(frames[0]?.width).toBe(136)
    expect(frames[0]?.height).toBe(136)
  })

  it('assigns only placed tables that meet the drawn rectangle', () => {
    const inside = tablesInsidePartition(
      [
        table({ tableId: 'in', positionX: 40, positionY: 40 }),
        table({ tableId: 'out', positionX: 400, positionY: 400 }),
        table({ tableId: 'unplaced', positionX: null, positionY: null }),
      ],
      { x: 20, y: 20, width: 200, height: 160 },
    )
    expect(inside.map((item) => item.tableId)).toEqual(['in'])
  })
})

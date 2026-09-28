import { describe, expect, it } from 'vitest'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import {
  drawAttachesToSelectedArea,
  nextHallSortOrder,
  partitionFrame,
  sectionIdForBox,
  tablesInsidePartition,
  visiblePartitions,
} from '@/lib/floorPartitions'

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

function table(
  partial: Pick<TableDto, 'tableId' | 'tableNumber'> & Partial<TableDto>,
): TableDto {
  return {
    branchId: 'b',
    floorPlanId: 'plan',
    capacity: 4,
    floor: null,
    positionX: 40,
    positionY: 40,
    width: 80,
    height: 80,
    rotation: 0,
    shape: 'Round',
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

describe('floor area order', () => {
  it('places a new area after the current ones', () => {
    expect(nextHallSortOrder([])).toBe(0)
    expect(nextHallSortOrder([area(0), area(2)])).toBe(3)
  })
})

describe('drawn sections', () => {
  it('keeps the rectangle drawn this visit, then the tables saved on the area', () => {
    const hall = area(0)
    const inside = table({
      tableId: '1',
      tableNumber: 'T1',
      floorPlanAreaId: hall.floorPlanAreaId,
      positionX: 100,
      positionY: 80,
    })
    const draft = { x: 10, y: 12, width: 200, height: 160 }
    expect(visiblePartitions([hall], [inside], { [hall.floorPlanAreaId]: draft })).toEqual([
      { ...draft, floorPlanAreaId: hall.floorPlanAreaId, name: hall.name, color: hall.color },
    ])
    const saved = visiblePartitions([hall], [inside])
    expect(saved).toHaveLength(1)
    expect(saved[0]?.x).toBeLessThan(100)
    expect(saved[0]?.y).toBeLessThan(80)
    expect(partitionFrame([])).toBeNull()
  })

  it('finds tables inside a drawn rectangle', () => {
    const inside = table({ tableId: '1', tableNumber: 'T1', positionX: 40, positionY: 40 })
    const outside = table({ tableId: '2', tableNumber: 'T2', positionX: 400, positionY: 400 })
    const region = { x: 0, y: 0, width: 200, height: 200 }
    expect(tablesInsidePartition([inside, outside], region).map((item) => item.tableId)).toEqual([
      '1',
    ])
    const frames = visiblePartitions(
      [area(0)],
      [{ ...inside, floorPlanAreaId: 'area-0' }],
    )
    expect(sectionIdForBox(frames, { x: 40, y: 40, width: 80, height: 80 })).toBe('area-0')
  })

  it('keeps an existing outline when a new area is drawn', () => {
    const box = { x: 8, y: 8, width: 120, height: 80 }
    expect(drawAttachesToSelectedArea(null, {})).toBe(false)
    expect(drawAttachesToSelectedArea('area-0', {})).toBe(true)
    expect(drawAttachesToSelectedArea('area-0', { 'area-0': box })).toBe(false)
  })
})

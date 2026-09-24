import { describe, expect, it } from 'vitest'
import type { TableDto } from '@/api/tables'
import {
  areaCanvasSize,
  nextAreaCopyName,
  tablesOnFloorPlan,
} from '@/lib/floorAreas'
import { tableBox } from '@/lib/floorGeometry'

function table(
  partial: Pick<TableDto, 'tableId' | 'floorPlanId' | 'tableNumber' | 'shape'> &
    Partial<TableDto>,
): TableDto {
  return {
    branchId: 'b',
    capacity: 4,
    floor: null,
    positionX: 40,
    positionY: 40,
    width: 80,
    height: 80,
    rotation: 0,
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

describe('floor area grouping', () => {
  it('assigns tables by floorPlanId, not by coordinates', () => {
    const hall = table({
      tableId: '1',
      floorPlanId: 'hall',
      tableNumber: 'T1',
      shape: 'Round',
      positionX: 400,
      positionY: 400,
    })
    const terrace = table({
      tableId: '2',
      floorPlanId: 'terrace',
      tableNumber: 'T5',
      shape: 'Rectangle',
      positionX: 10,
      positionY: 10,
      width: 180,
      height: 80,
    })
    expect(tablesOnFloorPlan([hall, terrace], 'terrace').map((tb) => tb.tableNumber)).toEqual([
      'T5',
    ])
    expect(tablesOnFloorPlan([hall, terrace], 'hall')[0]?.shape).toBe('Round')
  })

  it('sizes the frame from table boxes and keeps a square rectangle rectangular', () => {
    const square = tableBox(
      table({
        tableId: '1',
        floorPlanId: 'hall',
        tableNumber: 'T2',
        shape: 'Rectangle',
        positionX: 100,
        positionY: 80,
        width: 72,
        height: 72,
      }),
    )
    const wide = tableBox(
      table({
        tableId: '2',
        floorPlanId: 'hall',
        tableNumber: 'T3',
        shape: 'Rectangle',
        positionX: 20,
        positionY: 20,
        width: 180,
        height: 80,
      }),
    )
    expect(square.width).toBe(72)
    expect(square.height).toBe(72)
    const frame = areaCanvasSize([square, wide])
    expect(frame.width).toBeGreaterThanOrEqual(100 + 72)
    expect(frame.height).toBeGreaterThanOrEqual(80 + 72)
  })

  it('picks a new name that does not collide with existing floor plans', () => {
    expect(nextAreaCopyName('Terrace', ['Terrace', 'Main Hall'])).toBe('Terrace 2')
    expect(nextAreaCopyName('Terrace', ['Terrace', 'Terrace 2'])).toBe('Terrace 3')
  })
})

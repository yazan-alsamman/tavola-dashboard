import { describe, expect, it } from 'vitest'
import type { TableDto } from '@/api/tables'
import {
  boxesOverlap,
  chairAnchors,
  layoutUnplaced,
  nextTableNumber,
  overlappingTableIds,
  resolveTableSize,
  snapCoord,
  tableBox,
  withCompleteGeometry,
} from '@/lib/floorGeometry'

const base: TableDto = {
  tableId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  branchId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  floorPlanId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  tableNumber: 'T1',
  capacity: 4,
  floor: null,
  positionX: null,
  positionY: null,
  width: null,
  height: null,
  rotation: null,
  shape: 'Round',
  layer: null,
  indoor: true,
  vip: false,
  smoking: false,
  status: 'Available',
  mergeGroupId: null,
  isMergePrimary: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('floorGeometry', () => {
  it('snaps to the 16px grid when enabled and never goes negative', () => {
    expect(snapCoord(75, true)).toBe(80)
    expect(snapCoord(75, false)).toBe(75)
    expect(snapCoord(-4, true)).toBe(0)
  })

  it('allocates the next free T-number', () => {
    expect(nextTableNumber([{ tableNumber: 'T1' }, { tableNumber: 'T3' }])).toBe(
      'T2',
    )
  })

  it('fills null size/rotation so Update sends complete geometry', () => {
    const body = withCompleteGeometry(base, { positionX: 48, positionY: 64 })
    expect(body.positionX).toBe(48)
    expect(body.positionY).toBe(64)
    expect(body.width).toBe(80)
    expect(body.height).toBe(80)
    expect(body.rotation).toBe(0)
    expect(body.shape).toBe('Round')
  })

  it('packs unplaced tables into free cells', () => {
    const laid = layoutUnplaced(
      [base, { ...base, tableId: '2', tableNumber: 'T2' }],
      [{ x: 48, y: 48, width: 80, height: 80 }],
    )
    expect(laid).toHaveLength(2)
    expect(laid[0].x).not.toBe(48)
    expect(laid.every((item) => item.width > 0 && item.height > 0)).toBe(true)
  })

  it('places chairs around both shapes', () => {
    expect(chairAnchors('Round', 4, 80, 80)).toHaveLength(4)
    expect(chairAnchors('Rectangle', 6, 128, 72).length).toBe(6)
  })

  it('prefers matching preset size for a round four-top', () => {
    expect(resolveTableSize(base)).toEqual({ width: 80, height: 80 })
  })

  it('warns on overlapping boxes without treating a gap as a collision', () => {
    expect(
      boxesOverlap(
        { x: 0, y: 0, width: 80, height: 80 },
        { x: 40, y: 40, width: 80, height: 80 },
      ),
    ).toBe(true)
    const a = { ...base, positionX: 0, positionY: 0, width: 80, height: 80 }
    const b = {
      ...base,
      tableId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc',
      tableNumber: 'T2',
      positionX: 200,
      positionY: 200,
      width: 80,
      height: 80,
    }
    expect(overlappingTableIds([a, b], tableBox).size).toBe(0)
    const stacked = { ...b, positionX: 10, positionY: 10 }
    expect(overlappingTableIds([a, stacked], tableBox).size).toBe(2)
  })
})

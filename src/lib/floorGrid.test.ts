import { describe, expect, it } from 'vitest'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import {
  GRID_CELL,
  areaForRect,
  canPlace,
  firstFreeCell,
  flagsFromFeatures,
  gridSize,
  nextNumberInArea,
  rectFromCorners,
  shapeChoiceOf,
  shapeSpan,
  summarizeFloors,
  tableRect,
  tableSpan,
} from '@/lib/floorGrid'

function table(over: Partial<TableDto>): TableDto {
  return {
    tableId: 't',
    branchId: 'b',
    floorPlanId: 'fp',
    tableNumber: 'T1',
    capacity: 4,
    floor: 0,
    positionX: null,
    positionY: null,
    width: null,
    height: null,
    rotation: 0,
    shape: 'Rectangle',
    layer: 0,
    indoor: true,
    vip: false,
    smoking: false,
    floorPlanAreaId: null,
    color: null,
    status: 'Available',
    mergeGroupId: null,
    isMergePrimary: false,
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

function area(over: Partial<FloorPlanAreaDto>): FloorPlanAreaDto {
  return {
    floorPlanAreaId: 'a',
    floorPlanId: 'fp',
    name: 'Main',
    color: '#1F6B4A',
    sortOrder: 0,
    features: [],
    floor: 0,
    positionX: 0,
    positionY: 0,
    width: 4 * GRID_CELL,
    height: 3 * GRID_CELL,
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

describe('size table', () => {
  it('gives 2–4 seats one square whatever the shape', () => {
    expect(shapeSpan('round', 2)).toEqual({ cols: 1, rows: 1 })
    expect(shapeSpan('square', 4)).toEqual({ cols: 1, rows: 1 })
    expect(shapeSpan('long', 4)).toEqual({ cols: 1, rows: 1 })
  })

  it('gives 6–8 seats two by two, or two in one direction when long', () => {
    expect(shapeSpan('round', 6)).toEqual({ cols: 2, rows: 2 })
    expect(shapeSpan('square', 8)).toEqual({ cols: 2, rows: 2 })
    expect(shapeSpan('long', 8)).toEqual({ cols: 2, rows: 1 })
  })

  it('keeps a turned long table vertical', () => {
    const turned = table({ capacity: 8, width: GRID_CELL, height: 2 * GRID_CELL })
    expect(shapeChoiceOf(turned)).toBe('long')
    expect(tableSpan(turned)).toEqual({ cols: 1, rows: 2 })
  })

  it('snaps stored positions to the nearest square', () => {
    const placed = table({ positionX: 170, positionY: 75 })
    expect(tableRect(placed)).toMatchObject({ col: 2, row: 1 })
  })
})

describe('placement', () => {
  it('refuses a spot that overlaps another table or leaves the grid', () => {
    const occupied = [{ col: 1, row: 1, cols: 2, rows: 2 }]
    expect(canPlace({ col: 2, row: 2, cols: 1, rows: 1 }, occupied)).toBe(false)
    expect(canPlace({ col: 3, row: 1, cols: 1, rows: 1 }, occupied)).toBe(true)
    expect(canPlace({ col: -1, row: 0, cols: 1, rows: 1 }, occupied)).toBe(false)
    expect(canPlace({ col: 11, row: 0, cols: 2, rows: 1 }, [], { cols: 12, rows: 8 })).toBe(false)
  })

  it('finds the first free spot inside an area', () => {
    const within = { col: 0, row: 0, cols: 3, rows: 2 }
    const occupied = [{ col: 0, row: 0, cols: 2, rows: 1 }]
    expect(firstFreeCell({ cols: 1, rows: 1 }, occupied, within)).toEqual({
      col: 2,
      row: 0,
      cols: 1,
      rows: 1,
    })
    expect(firstFreeCell({ cols: 3, rows: 2 }, occupied, within)).toBeNull()
  })

  it('normalises a drag in any direction', () => {
    expect(rectFromCorners({ col: 4, row: 3 }, { col: 1, row: 5 })).toEqual({
      col: 1,
      row: 3,
      cols: 4,
      rows: 3,
    })
  })

  it('always leaves room to grow', () => {
    expect(gridSize([])).toEqual({ cols: 12, rows: 8 })
    expect(gridSize([{ col: 12, row: 9, cols: 2, rows: 1 }])).toEqual({ cols: 15, rows: 11 })
  })
})

describe('areas', () => {
  const main = area({ floorPlanAreaId: 'main' })
  const legacy = area({ floorPlanAreaId: 'old', positionX: null, positionY: null, width: null, height: null })

  it('assigns the drawn area holding the table', () => {
    expect(areaForRect({ col: 1, row: 1, cols: 1, rows: 1 }, [main], null)).toBe('main')
  })

  it('leaves the area when dropped outside it', () => {
    expect(areaForRect({ col: 6, row: 1, cols: 1, rows: 1 }, [main], main)).toBeNull()
  })

  it('keeps an area that is not drawn yet', () => {
    expect(areaForRect({ col: 6, row: 1, cols: 1, rows: 1 }, [main], legacy)).toBe('old')
  })

  it('maps features to the legacy table flags', () => {
    expect(flagsFromFeatures(['Outdoor', 'Hookah', 'Vip'])).toEqual({
      indoor: false,
      vip: true,
      smoking: true,
    })
    expect(flagsFromFeatures([])).toEqual({ indoor: true, vip: false, smoking: false })
  })
})

describe('numbering', () => {
  it('continues the area and never reuses a branch number', () => {
    const tables = [
      table({ tableNumber: 'T1', floorPlanAreaId: 'main' }),
      table({ tableNumber: 'T2', floorPlanAreaId: 'main' }),
      table({ tableNumber: 'T3', floorPlanAreaId: 'terrace' }),
    ]
    expect(nextNumberInArea(tables, 'main')).toBe('T4')
    expect(nextNumberInArea(tables, 'terrace')).toBe('T4')
    expect(nextNumberInArea(tables, 'new')).toBe('T4')
    expect(nextNumberInArea([], null)).toBe('T1')
  })
})

describe('review summary', () => {
  it('counts placed tables and seats per floor and lists the rest', () => {
    const tables = [
      table({ tableId: '1', capacity: 4, positionX: 0, positionY: 0, floor: 0 }),
      table({ tableId: '2', capacity: 6, positionX: 80, positionY: 0, floor: 1 }),
      table({ tableId: '3', capacity: 2 }),
    ]
    const result = summarizeFloors(tables, [area({})], [0, 1])
    expect(result.floors).toEqual([
      { floor: 0, tables: 1, seats: 4, areas: 1 },
      { floor: 1, tables: 1, seats: 6, areas: 0 },
    ])
    expect(result.unplaced.map((tb) => tb.tableId)).toEqual(['3'])
  })
})

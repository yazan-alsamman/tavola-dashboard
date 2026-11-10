import { describe, expect, it } from 'vitest'
import { floorLabel, listFloors, nextFloor, tablesOnFloor } from './floors'

const labels = { ground: 'Ground', ordinals: ['First', 'Second'], numbered: 'Floor {n}' }

describe('floors', () => {
  it('always lists the ground floor and treats a missing floor as ground', () => {
    expect(listFloors([{ floor: null }, { floor: 2 }])).toEqual([0, 2])
  })

  it('keeps floors opened in the session that have no table yet', () => {
    expect(listFloors([{ floor: 0 }], [1])).toEqual([0, 1])
  })

  it('opens the floor above the highest one', () => {
    expect(nextFloor([0, 1, 3])).toBe(4)
  })

  it('filters tables by floor', () => {
    const tables = [{ floor: null, id: 'a' }, { floor: 1, id: 'b' }]
    expect(tablesOnFloor(tables, 0).map((t) => t.id)).toEqual(['a'])
    expect(tablesOnFloor(tables, 1).map((t) => t.id)).toEqual(['b'])
  })

  it('names floors with ordinals, then numbers', () => {
    expect(floorLabel(0, labels)).toBe('Ground')
    expect(floorLabel(2, labels)).toBe('Second')
    expect(floorLabel(5, labels)).toBe('Floor 5')
  })
})

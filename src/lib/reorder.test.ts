import { describe, expect, it } from 'vitest'
import { moveTo } from './reorder'

describe('moveTo', () => {
  it('moves an element forward and backward', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveTo(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns an unchanged copy for out-of-range or equal indexes', () => {
    const list = ['a', 'b']
    expect(moveTo(list, 0, 5)).toEqual(['a', 'b'])
    expect(moveTo(list, 1, 1)).not.toBe(list)
  })
})

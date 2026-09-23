import { describe, expect, it } from 'vitest'
import { normalizeTableShape, tableShapeKind } from '@/lib/tableShape'

describe('table shape contract', () => {
  it('keeps Rectangle as rectangle', () => {
    expect(normalizeTableShape('Rectangle')).toBe('Rectangle')
    expect(tableShapeKind('Rectangle')).toBe('rectangle')
  })

  it('keeps Round as round', () => {
    expect(normalizeTableShape('Round')).toBe('Round')
    expect(tableShapeKind('Round')).toBe('round')
  })

  it('does not flip casing or synonyms into the other shape', () => {
    expect(tableShapeKind('RECTANGLE')).toBe('unknown')
    expect(tableShapeKind('ROUND')).toBe('unknown')
    expect(tableShapeKind('circle')).toBe('unknown')
    expect(tableShapeKind('rect')).toBe('unknown')
    expect(tableShapeKind(undefined)).toBe('unknown')
  })
})

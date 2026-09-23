import type { TableShapeDto } from '@/api/tables'

/**
 * Contract values from `TableShapeDto` / Postman: `Rectangle` | `Round`.
 * Anything else is unknown. Callers must not treat unknown as the other shape.
 */
export function normalizeTableShape(value: unknown): TableShapeDto | null {
  if (value === 'Round' || value === 'Rectangle') return value
  return null
}

/** Explicit renderer kind. Unknown is not Rectangle and not Round. */
export function tableShapeKind(
  value: unknown,
): 'round' | 'rectangle' | 'unknown' {
  const shape = normalizeTableShape(value)
  if (shape === 'Round') return 'round'
  if (shape === 'Rectangle') return 'rectangle'
  return 'unknown'
}

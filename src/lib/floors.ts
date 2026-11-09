import type { TableDto } from '@/api/tables'

/** Ground floor. A table with no `floor` stands on it. */
export const GROUND_FLOOR = 0
export const MAX_FLOOR = 20

export function tableFloor(table: Pick<TableDto, 'floor'>): number {
  return table.floor ?? GROUND_FLOOR
}

/**
 * Floors to show as tabs: the ground floor, every floor a table stands on,
 * and floors the user opened in this session that have no table yet.
 */
export function listFloors(
  tables: Pick<TableDto, 'floor'>[],
  extra: number[] = [],
): number[] {
  const floors = new Set<number>([GROUND_FLOOR, ...extra])
  for (const table of tables) floors.add(tableFloor(table))
  return [...floors].sort((a, b) => a - b)
}

export function nextFloor(floors: number[]): number {
  return floors.length === 0 ? GROUND_FLOOR : Math.max(...floors) + 1
}

export function tablesOnFloor<T extends Pick<TableDto, 'floor'>>(
  tables: T[],
  floor: number,
): T[] {
  return tables.filter((table) => tableFloor(table) === floor)
}

export interface FloorLabels {
  ground: string
  /** Ordinal names for floors 1..n, e.g. ["First floor", "Second floor", ...]. */
  ordinals: readonly string[]
  /** Fallback with a `{n}` placeholder. */
  numbered: string
}

export function floorLabel(floor: number, labels: FloorLabels): string {
  if (floor === GROUND_FLOOR) return labels.ground
  return labels.ordinals[floor - 1] ?? labels.numbered.replace('{n}', String(floor))
}

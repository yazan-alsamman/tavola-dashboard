import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'

/** Saved area colors. The API stores exactly `#RRGGBB`. */
export const HALL_COLOR_PRESETS = [
  '#1F6B4A',
  '#D97706',
  '#15803D',
  '#0369A1',
  '#65A30D',
  '#6D28D9',
  '#9D174D',
  '#92400E',
] as const

export function nextHallSortOrder(areas: FloorPlanAreaDto[]): number {
  return areas.reduce((max, area) => Math.max(max, area.sortOrder), -1) + 1
}

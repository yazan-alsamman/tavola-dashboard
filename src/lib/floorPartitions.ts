import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import { boxesOverlap, isTablePlaced, tableBox, type TableBox } from '@/lib/floorGeometry'

/** Saved hall colors. The API stores exactly `#RRGGBB`. */
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

const PARTITION_PAD = 28

export interface FloorPartition extends TableBox {
  floorPlanAreaId: string
  name: string
  color: string
}

export function areaFill(color: string, alpha = 0.16): string {
  const hex = color.trim().toUpperCase()
  if (!/^#[0-9A-F]{6}$/.test(hex)) return 'transparent'
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Outline around the tables assigned to one hall. The server does not store this box. */
export function partitionFrame(tables: TableDto[]): TableBox | null {
  const placed = tables.filter(isTablePlaced)
  if (placed.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const table of placed) {
    const box = tableBox(table)
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  return {
    x: Math.max(0, minX - PARTITION_PAD),
    y: Math.max(0, minY - PARTITION_PAD),
    width: maxX - minX + PARTITION_PAD * 2,
    height: maxY - minY + PARTITION_PAD * 2,
  }
}

export function partitionFrames(
  areas: FloorPlanAreaDto[],
  tables: TableDto[],
): FloorPartition[] {
  const frames: FloorPartition[] = []
  for (const area of areas) {
    const members = tables.filter(
      (table) => table.floorPlanAreaId === area.floorPlanAreaId,
    )
    const frame = partitionFrame(members)
    if (!frame) continue
    frames.push({
      ...frame,
      floorPlanAreaId: area.floorPlanAreaId,
      name: area.name,
      color: area.color,
    })
  }
  return frames
}

/** Placed tables whose boxes meet the drawn rectangle. */
export function tablesInsidePartition(
  tables: TableDto[],
  region: TableBox,
): TableDto[] {
  return tables.filter(
    (table) => isTablePlaced(table) && boxesOverlap(tableBox(table), region),
  )
}

/** Drawn rectangle wins while it is on screen; otherwise the outline follows the section's tables. */
export function visiblePartitions(
  areas: FloorPlanAreaDto[],
  tables: TableDto[],
  drafts: Record<string, TableBox> = {},
): FloorPartition[] {
  const frames: FloorPartition[] = []
  for (const area of areas) {
    const draft = drafts[area.floorPlanAreaId]
    const frame =
      draft ??
      partitionFrame(
        tables.filter((table) => table.floorPlanAreaId === area.floorPlanAreaId),
      )
    if (!frame) continue
    frames.push({
      ...frame,
      floorPlanAreaId: area.floorPlanAreaId,
      name: area.name,
      color: area.color,
    })
  }
  return frames
}

/** Section whose rectangle contains the new table. Later sections win if they overlap. */
export function sectionIdForBox(
  partitions: FloorPartition[],
  box: TableBox,
): string | null {
  let match: string | null = null
  for (const partition of partitions) {
    if (boxesOverlap(partition, box)) match = partition.floorPlanAreaId
  }
  return match
}

export function nextHallSortOrder(areas: FloorPlanAreaDto[]): number {
  return areas.reduce((max, area) => Math.max(max, area.sortOrder), -1) + 1
}

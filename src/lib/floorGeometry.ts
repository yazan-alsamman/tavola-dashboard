import type { TableDto, TableShapeDto, UpdateTableRequest } from '@/api/tables'
import { tableToUpdateRequest } from '@/api/tables'

/** CSS-pixel grid used by the layout studio. Origin is top-left, never mirrored. */
export const FLOOR_SNAP = 16
export const FLOOR_MIN_WIDTH = 960
export const FLOOR_MIN_HEIGHT = 640
export const FLOOR_PAD = 48
export const DEFAULT_TABLE_WIDTH = 80
export const DEFAULT_TABLE_HEIGHT = 80
export const MIN_TABLE_SIZE = 48
export const MAX_TABLE_SIZE = 240
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2
export const ZOOM_STEP = 0.15

export interface TablePreset {
  id: 'round2' | 'round4' | 'rect4' | 'rect6' | 'rect8'
  shape: TableShapeDto
  capacity: number
  width: number
  height: number
}

/** Guest-app-friendly sizes: complete width/height, not null. */
export const TABLE_PRESETS: TablePreset[] = [
  { id: 'round2', shape: 'Round', capacity: 2, width: 64, height: 64 },
  { id: 'round4', shape: 'Round', capacity: 4, width: 80, height: 80 },
  { id: 'rect4', shape: 'Rectangle', capacity: 4, width: 96, height: 64 },
  { id: 'rect6', shape: 'Rectangle', capacity: 6, width: 128, height: 72 },
  { id: 'rect8', shape: 'Rectangle', capacity: 8, width: 160, height: 80 },
]

export interface TableBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ChairAnchor {
  x: number
  y: number
  rotate: number
}

export function snapCoord(value: number, enabled: boolean, grid = FLOOR_SNAP): number {
  if (!enabled) return Math.max(0, Math.round(value))
  return Math.max(0, Math.round(value / grid) * grid)
}

export function clampTableSize(value: number): number {
  return Math.min(MAX_TABLE_SIZE, Math.max(MIN_TABLE_SIZE, Math.round(value)))
}

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
}

export function resolveTableSize(
  table: Pick<TableDto, 'width' | 'height' | 'shape' | 'capacity'>,
): { width: number; height: number } {
  if (table.width != null && table.height != null) {
    return { width: table.width, height: table.height }
  }
  const preset = TABLE_PRESETS.find(
    (p) => p.shape === table.shape && p.capacity === table.capacity,
  )
  const width = table.width ?? preset?.width ?? DEFAULT_TABLE_WIDTH
  const height =
    table.height ??
    preset?.height ??
    (table.shape === 'Round' ? width : DEFAULT_TABLE_HEIGHT)
  return { width, height }
}

export function isTablePlaced(
  table: Pick<TableDto, 'positionX' | 'positionY'>,
): boolean {
  return table.positionX != null && table.positionY != null
}

export function tableBox(
  table: TableDto,
  live?: { x: number; y: number; width?: number; height?: number },
): TableBox {
  const size = resolveTableSize(table)
  return {
    x: live?.x ?? table.positionX ?? 0,
    y: live?.y ?? table.positionY ?? 0,
    width: live?.width ?? size.width,
    height: live?.height ?? size.height,
  }
}

export function floorWorldSize(boxes: TableBox[]): { width: number; height: number } {
  let maxX = FLOOR_MIN_WIDTH
  let maxY = FLOOR_MIN_HEIGHT
  for (const box of boxes) {
    maxX = Math.max(maxX, box.x + box.width + FLOOR_PAD)
    maxY = Math.max(maxY, box.y + box.height + FLOOR_PAD)
  }
  return { width: maxX, height: maxY }
}

export function nextTableNumber(tables: Pick<TableDto, 'tableNumber'>[]): string {
  const used = new Set(tables.map((tb) => tb.tableNumber.trim().toLowerCase()))
  let n = 1
  while (used.has(`t${n}`)) n += 1
  return `T${n}`
}

/** True when two boxes intersect. `gap` expands each box (auto-place uses 8). */
export function boxesOverlap(a: TableBox, b: TableBox, gap = 0): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  )
}

/** Table ids whose live boxes intersect. Warning only — placement is still allowed. */
export function overlappingTableIds(
  tables: TableDto[],
  live: (table: TableDto) => TableBox,
): Set<string> {
  const placed = tables.filter(isTablePlaced)
  const ids = new Set<string>()
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (boxesOverlap(live(placed[i]), live(placed[j]))) {
        ids.add(placed[i].tableId)
        ids.add(placed[j].tableId)
      }
    }
  }
  return ids
}

/** Packs unplaced tables into free cells so a guest client receives real coordinates. */
export function layoutUnplaced(
  unplaced: TableDto[],
  occupied: TableBox[],
): { tableId: string; x: number; y: number; width: number; height: number }[] {
  const taken = occupied.map((box) => ({ ...box }))
  const result: {
    tableId: string
    x: number
    y: number
    width: number
    height: number
  }[] = []
  const cell = 112
  const cols = 6
  const origin = 48

  for (const table of unplaced) {
    const size = resolveTableSize(table)
    let placed = false
    for (let i = 0; i < 200 && !placed; i += 1) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const candidate: TableBox = {
        x: origin + col * cell,
        y: origin + row * cell,
        width: size.width,
        height: size.height,
      }
      if (taken.some((box) => boxesOverlap(box, candidate, 8))) continue
      taken.push(candidate)
      result.push({
        tableId: table.tableId,
        x: candidate.x,
        y: candidate.y,
        width: size.width,
        height: size.height,
      })
      placed = true
    }
  }

  return result
}

/**
 * Full-replace Update payload with complete geometry.
 * Fills null width/height/rotation so mobile clients can render the table.
 */
export function withCompleteGeometry(
  table: TableDto,
  overrides: Partial<
    Pick<
      UpdateTableRequest,
      | 'positionX'
      | 'positionY'
      | 'width'
      | 'height'
      | 'rotation'
      | 'shape'
      | 'floorPlanAreaId'
      | 'color'
    >
  > = {},
): UpdateTableRequest {
  const size = resolveTableSize(table)
  return tableToUpdateRequest(table, {
    positionX:
      overrides.positionX !== undefined ? overrides.positionX : table.positionX,
    positionY:
      overrides.positionY !== undefined ? overrides.positionY : table.positionY,
    width: overrides.width ?? table.width ?? size.width,
    height: overrides.height ?? table.height ?? size.height,
    rotation: overrides.rotation ?? table.rotation ?? 0,
    shape: overrides.shape ?? table.shape,
    ...(overrides.floorPlanAreaId !== undefined
      ? { floorPlanAreaId: overrides.floorPlanAreaId }
      : {}),
    ...(overrides.color !== undefined ? { color: overrides.color } : {}),
  })
}

export function chairAnchors(
  shape: TableShapeDto,
  capacity: number,
  width: number,
  height: number,
): ChairAnchor[] {
  const n = Math.min(Math.max(capacity, 2), 12)
  const chairW = 12
  const chairH = 8
  const gap = 7

  if (shape === 'Round') {
    const rx = width / 2 + gap + chairH / 2
    const ry = height / 2 + gap + chairH / 2
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return {
        x: width / 2 + Math.cos(a) * rx - chairW / 2,
        y: height / 2 + Math.sin(a) * ry - chairH / 2,
        rotate: (a * 180) / Math.PI + 90,
      }
    })
  }

  const top = Math.ceil(n / 2)
  const bottom = n - top
  const sides = [top, 0, bottom, 0]
  if (n >= 8) {
    sides[0] = Math.ceil((n - 2) / 2)
    sides[2] = n - 2 - sides[0]
    sides[1] = 1
    sides[3] = 1
  }

  const anchors: ChairAnchor[] = []
  const place = (count: number, edge: 'top' | 'right' | 'bottom' | 'left') => {
    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / (count + 1)
      if (edge === 'top') {
        anchors.push({
          x: width * t - chairW / 2,
          y: -gap - chairH,
          rotate: 0,
        })
      } else if (edge === 'bottom') {
        anchors.push({
          x: width * t - chairW / 2,
          y: height + gap,
          rotate: 180,
        })
      } else if (edge === 'right') {
        anchors.push({
          x: width + gap,
          y: height * t - chairW / 2,
          rotate: 90,
        })
      } else {
        anchors.push({
          x: -gap - chairH,
          y: height * t - chairW / 2,
          rotate: 270,
        })
      }
    }
  }

  place(sides[0], 'top')
  place(sides[1], 'right')
  place(sides[2], 'bottom')
  place(sides[3], 'left')
  return anchors
}

import type { FloorPlanAreaDto, FloorPlanAreaFeature } from '@/api/floorPlanAreas'
import type { TableDto, TableShapeDto } from '@/api/tables'
import { GROUND_FLOOR, tableFloor } from '@/lib/floors'

/**
 * Fixed-grid floor plan ("مخطط المكان", CR WJ-R-2026-002 p.04–05).
 *
 * Positions and sizes are still stored in the backend's layout units so the
 * guest app keeps rendering real boxes: one grid cell is `GRID_CELL` units,
 * a table at cell (col,row) is saved at (col*GRID_CELL, row*GRID_CELL) and its
 * width/height are its cell span times GRID_CELL. Rotation is always saved as
 * 0: turning a long table swaps its span instead, so no client rotates twice.
 */
export const GRID_CELL = 80
export const MIN_GRID_COLS = 12
export const MIN_GRID_ROWS = 8
export const MAX_GRID_COLS = 40
export const MAX_GRID_ROWS = 40

/** What the staff picks. Square and long are both the backend `Rectangle`. */
export type TableShapeChoice = 'round' | 'square' | 'long'

export interface CellSpan {
  cols: number
  rows: number
}

export interface CellRect {
  col: number
  row: number
  cols: number
  rows: number
}

/**
 * Size table: 2–4 seats take one cell whatever the shape; 5–8 seats take two
 * cells by two cells (round/square) or two cells in one direction (long).
 * Larger tables grow by one more step.
 */
export function shapeSpan(choice: TableShapeChoice, capacity: number): CellSpan {
  const step = capacity <= 4 ? 1 : capacity <= 8 ? 2 : 3
  if (choice === 'long') return { cols: step, rows: step === 1 ? 1 : step - 1 }
  return { cols: step, rows: step }
}

export function shapeChoiceOf(
  table: Pick<TableDto, 'shape' | 'width' | 'height'>,
): TableShapeChoice {
  if (table.shape === 'Round') return 'round'
  if (table.width != null && table.height != null && table.width !== table.height) {
    return 'long'
  }
  return 'square'
}

export function shapeDtoOf(choice: TableShapeChoice): TableShapeDto {
  return choice === 'round' ? 'Round' : 'Rectangle'
}

/** True when the stored box is taller than wide (a long table turned 90°). */
function isVertical(table: Pick<TableDto, 'width' | 'height'>): boolean {
  return table.width != null && table.height != null && table.height > table.width
}

/** Cell span of a table, from its seats and shape (never from a free size). */
export function tableSpan(
  table: Pick<TableDto, 'shape' | 'width' | 'height' | 'capacity'>,
): CellSpan {
  const span = shapeSpan(shapeChoiceOf(table), table.capacity)
  return isVertical(table) && span.cols !== span.rows
    ? { cols: span.rows, rows: span.cols }
    : span
}

export function isPlaced(table: Pick<TableDto, 'positionX' | 'positionY'>): boolean {
  return table.positionX != null && table.positionY != null
}

export function toCell(value: number | null): number {
  return Math.max(0, Math.round((value ?? 0) / GRID_CELL))
}

export function tableRect(
  table: Pick<TableDto, 'shape' | 'width' | 'height' | 'capacity' | 'positionX' | 'positionY'>,
): CellRect {
  const span = tableSpan(table)
  return { col: toCell(table.positionX), row: toCell(table.positionY), ...span }
}

export function rectsOverlap(a: CellRect, b: CellRect): boolean {
  return (
    a.col < b.col + b.cols &&
    a.col + a.cols > b.col &&
    a.row < b.row + b.rows &&
    a.row + a.rows > b.row
  )
}

export function rectContains(outer: CellRect, inner: CellRect): boolean {
  return (
    inner.col >= outer.col &&
    inner.row >= outer.row &&
    inner.col + inner.cols <= outer.col + outer.cols &&
    inner.row + inner.rows <= outer.row + outer.rows
  )
}

/** Rectangle spanned by two corner cells, in any drag direction. */
export function rectFromCorners(
  a: { col: number; row: number },
  b: { col: number; row: number },
): CellRect {
  const col = Math.min(a.col, b.col)
  const row = Math.min(a.row, b.row)
  return {
    col,
    row,
    cols: Math.abs(a.col - b.col) + 1,
    rows: Math.abs(a.row - b.row) + 1,
  }
}

/** Layout-unit geometry to save for a table standing at `rect`. */
export function rectToTableGeometry(rect: CellRect) {
  return {
    positionX: rect.col * GRID_CELL,
    positionY: rect.row * GRID_CELL,
    width: rect.cols * GRID_CELL,
    height: rect.rows * GRID_CELL,
    rotation: 0,
  }
}

export function areaFloor(area: Pick<FloorPlanAreaDto, 'floor'>): number {
  return area.floor ?? GROUND_FLOOR
}

/** The area's rectangle on the grid, or null for an area not drawn yet. */
export function areaRect(area: FloorPlanAreaDto): CellRect | null {
  if (
    area.positionX == null ||
    area.positionY == null ||
    area.width == null ||
    area.height == null
  ) {
    return null
  }
  return {
    col: toCell(area.positionX),
    row: toCell(area.positionY),
    cols: Math.max(1, toCell(area.width)),
    rows: Math.max(1, toCell(area.height)),
  }
}

export function rectToAreaLayout(rect: CellRect) {
  return {
    positionX: rect.col * GRID_CELL,
    positionY: rect.row * GRID_CELL,
    width: rect.cols * GRID_CELL,
    height: rect.rows * GRID_CELL,
  }
}

/** Drawn areas of one floor. */
export function areasOnFloor(areas: FloorPlanAreaDto[], floor: number) {
  return areas.filter((area) => areaFloor(area) === floor && areaRect(area) != null)
}

/**
 * Area a table belongs to after it lands at `rect`: the drawn area of that
 * floor that holds its top-left cell. Outside every drawn area it keeps an
 * area that has no rectangle yet (nothing to leave), otherwise it has none.
 */
export function areaForRect(
  rect: CellRect,
  floorAreas: FloorPlanAreaDto[],
  current: FloorPlanAreaDto | null,
): string | null {
  const corner = { col: rect.col, row: rect.row, cols: 1, rows: 1 }
  const hit = floorAreas.find((area) => {
    const box = areaRect(area)
    return box != null && rectContains(box, corner)
  })
  if (hit) return hit.floorPlanAreaId
  if (current && areaRect(current) == null) return current.floorPlanAreaId
  return null
}

/** Rects already taken on a floor, excluding one table (the one moving). */
export function occupiedRects(
  tables: TableDto[],
  floor: number,
  exceptTableId?: string,
): CellRect[] {
  return tables
    .filter(
      (table) =>
        table.tableId !== exceptTableId &&
        isPlaced(table) &&
        tableFloor(table) === floor,
    )
    .map(tableRect)
}

export function canPlace(
  rect: CellRect,
  occupied: CellRect[],
  bounds: CellSpan = { cols: MAX_GRID_COLS, rows: MAX_GRID_ROWS },
): boolean {
  if (rect.col < 0 || rect.row < 0) return false
  if (rect.col + rect.cols > bounds.cols || rect.row + rect.rows > bounds.rows) {
    return false
  }
  return !occupied.some((other) => rectsOverlap(other, rect))
}

/** First free spot for `span`, reading row by row inside `within`. */
export function firstFreeCell(
  span: CellSpan,
  occupied: CellRect[],
  within: CellRect,
): CellRect | null {
  for (let row = within.row; row + span.rows <= within.row + within.rows; row += 1) {
    for (let col = within.col; col + span.cols <= within.col + within.cols; col += 1) {
      const rect = { col, row, ...span }
      if (!occupied.some((other) => rectsOverlap(other, rect))) return rect
    }
  }
  return null
}

/** Grid size: never below the minimum, always one free row/column to grow into. */
export function gridSize(rects: CellRect[]): CellSpan {
  let cols = MIN_GRID_COLS
  let rows = MIN_GRID_ROWS
  for (const rect of rects) {
    cols = Math.max(cols, rect.col + rect.cols + 1)
    rows = Math.max(rows, rect.row + rect.rows + 1)
  }
  return { cols: Math.min(cols, MAX_GRID_COLS), rows: Math.min(rows, MAX_GRID_ROWS) }
}

const TABLE_NUMBER = /^t(\d+)$/i

function numberOf(tableNumber: string): number | null {
  const match = TABLE_NUMBER.exec(tableNumber.trim())
  return match ? Number(match[1]) : null
}

/** Natural T1, T2, … T10 order. */
export function compareTableNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Next number for a table added to an area: right after the area's highest
 * T-number, skipping any number already used anywhere in the branch, so an
 * area's tables stay consecutive and a number is never reused.
 */
export function nextNumberInArea(
  branchTables: Pick<TableDto, 'tableNumber' | 'floorPlanAreaId'>[],
  areaId: string | null,
): string {
  const used = new Set(
    branchTables.map((table) => table.tableNumber.trim().toLowerCase()),
  )
  const areaNumbers = branchTables
    .filter((table) => areaId != null && table.floorPlanAreaId === areaId)
    .map((table) => numberOf(table.tableNumber))
    .filter((n): n is number => n != null)
  let n = areaNumbers.length > 0 ? Math.max(...areaNumbers) + 1 : 1
  while (used.has(`t${n}`)) n += 1
  return `T${n}`
}

export function isNumberTaken(
  branchTables: Pick<TableDto, 'tableId' | 'tableNumber'>[],
  tableNumber: string,
  exceptTableId?: string,
): boolean {
  const wanted = tableNumber.trim().toLowerCase()
  return branchTables.some(
    (table) =>
      table.tableId !== exceptTableId && table.tableNumber.trim().toLowerCase() === wanted,
  )
}

/**
 * Legacy per-table flags kept in step with the area's features, because
 * guest app 1.0.2 reads indoor/vip/smoking straight from the table.
 */
export function flagsFromFeatures(features: readonly FloorPlanAreaFeature[]) {
  return {
    indoor: !features.includes('Outdoor'),
    vip: features.includes('Vip'),
    smoking: features.includes('Smoking') || features.includes('Hookah'),
  }
}

export interface FloorSummary {
  floor: number
  tables: number
  seats: number
  areas: number
}

/** Tables and seats per floor, counting placed tables only, plus what is left over. */
export function summarizeFloors(
  tables: TableDto[],
  areas: FloorPlanAreaDto[],
  floors: number[],
): { floors: FloorSummary[]; unplaced: TableDto[] } {
  const summaries = floors.map((floor) => {
    const placed = tables.filter((table) => isPlaced(table) && tableFloor(table) === floor)
    return {
      floor,
      tables: placed.length,
      seats: placed.reduce((sum, table) => sum + table.capacity, 0),
      areas: areas.filter((area) => areaFloor(area) === floor).length,
    }
  })
  return { floors: summaries, unplaced: tables.filter((table) => !isPlaced(table)) }
}

/** Area colors offered when drawing an area. The API stores exactly `#RRGGBB`. */
export const AREA_COLOR_PRESETS = [
  '#1F6B4A',
  '#D97706',
  '#15803D',
  '#0369A1',
  '#65A30D',
  '#6D28D9',
  '#9D174D',
  '#92400E',
] as const

/** Translucent fill for an area rectangle. */
export function areaFill(color: string, alpha = 0.14): string {
  const hex = color.trim().toUpperCase()
  if (!/^#[0-9A-F]{6}$/.test(hex)) return 'transparent'
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

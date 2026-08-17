/**
 * Domain data for the landing page's 3D restaurant. Shapes and statuses are the real
 * `TableShapeDto` / `TableStatusDto` values from `src/api/tables.ts` — the landing page's 3D
 * vocabulary is literally the product's own table model, not invented geometry.
 *
 * `STORY` is the single normalized (0→1) timeline every scroll-driven visual reads from:
 * the camera's shot list, the table scatter→grid transform, and the architecture's door/wall/
 * light behavior all key off the same named beats so nothing can drift out of sync.
 */

export type TableShape = 'Round' | 'Rectangle'
export type TableStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Disabled'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface TableDef {
  id: string
  /** Restaurant-style label (zone + number), e.g. "M2" — the default centrally-placed hero table. */
  tableNumber: string
  shape: TableShape
  capacity: number
  status: TableStatus
  /** Organic "walking through a real room" composition shown during the entrance/hall acts. Sits at floor height — nothing floats. */
  scatterPosition: Vec3
  scatterRotationY: number
  /** Aligned floor-plan composition the tables settle into as the camera rises. */
  gridPosition: Vec3
}

const t = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

const FLOOR_Y = -0.3

/**
 * Thirteen tables across three zones of one continuous hall: a window row (west wall), a central
 * row (the walking path the camera tracks through), and an east row (near the columns). Mostly
 * available, with a realistic scatter of occupied/cleaning/disabled for operational texture.
 */
export const DESKTOP_TABLES: readonly TableDef[] = [
  // Window row — x ≈ -2.8 (grid) / -3.6..-3.9 (scatter)
  {
    id: 'W1',
    tableNumber: 'W1',
    shape: 'Round',
    capacity: 2,
    status: 'Available',
    scatterPosition: t(-3.9, FLOOR_Y, 4.4),
    scatterRotationY: 0.3,
    gridPosition: t(-2.8, FLOOR_Y, 4.2),
  },
  {
    id: 'W2',
    tableNumber: 'W2',
    shape: 'Rectangle',
    capacity: 4,
    status: 'Occupied',
    scatterPosition: t(-3.3, FLOOR_Y, 1.7),
    scatterRotationY: -0.4,
    gridPosition: t(-2.8, FLOOR_Y, 1.4),
  },
  {
    id: 'W3',
    tableNumber: 'W3',
    shape: 'Round',
    capacity: 2,
    status: 'Available',
    scatterPosition: t(-3.8, FLOOR_Y, -1.1),
    scatterRotationY: 0.6,
    gridPosition: t(-2.8, FLOOR_Y, -1.4),
  },
  {
    id: 'W4',
    tableNumber: 'W4',
    shape: 'Rectangle',
    capacity: 6,
    status: 'Available',
    scatterPosition: t(-3.4, FLOOR_Y, -3.9),
    scatterRotationY: -0.2,
    gridPosition: t(-2.8, FLOOR_Y, -4.2),
  },
  {
    id: 'W5',
    tableNumber: 'W5',
    shape: 'Round',
    capacity: 4,
    status: 'Cleaning',
    scatterPosition: t(-3.9, FLOOR_Y, -6.7),
    scatterRotationY: 0.5,
    gridPosition: t(-2.8, FLOOR_Y, -7),
  },
  // Central row — the camera's walking path. M2 is the default hero table.
  {
    id: 'M1',
    tableNumber: 'M1',
    shape: 'Rectangle',
    capacity: 4,
    status: 'Available',
    scatterPosition: t(0.4, FLOOR_Y, 1.1),
    scatterRotationY: -0.15,
    gridPosition: t(0, FLOOR_Y, 1.4),
  },
  {
    id: 'M2',
    tableNumber: 'M2',
    shape: 'Rectangle',
    capacity: 4,
    status: 'Available',
    scatterPosition: t(-0.2, FLOOR_Y, -1.7),
    scatterRotationY: 0.1,
    gridPosition: t(0, FLOOR_Y, -1.4),
  },
  {
    id: 'M3',
    tableNumber: 'M3',
    shape: 'Round',
    capacity: 8,
    status: 'Available',
    scatterPosition: t(0.3, FLOOR_Y, -4.5),
    scatterRotationY: -0.3,
    gridPosition: t(0, FLOOR_Y, -4.2),
  },
  {
    id: 'M4',
    tableNumber: 'M4',
    shape: 'Round',
    capacity: 4,
    status: 'Disabled',
    scatterPosition: t(-0.4, FLOOR_Y, -7.3),
    scatterRotationY: 0.4,
    gridPosition: t(0, FLOOR_Y, -7),
  },
  // East row — x ≈ 2.8 (grid) / 3.4..3.9 (scatter), near the columns.
  {
    id: 'E1',
    tableNumber: 'E1',
    shape: 'Round',
    capacity: 2,
    status: 'Available',
    scatterPosition: t(3.4, FLOOR_Y, 4.7),
    scatterRotationY: -0.5,
    gridPosition: t(2.8, FLOOR_Y, 4.2),
  },
  {
    id: 'E2',
    tableNumber: 'E2',
    shape: 'Rectangle',
    capacity: 6,
    status: 'Occupied',
    scatterPosition: t(3.9, FLOOR_Y, 1.0),
    scatterRotationY: 0.25,
    gridPosition: t(2.8, FLOOR_Y, 1.4),
  },
  {
    id: 'E3',
    tableNumber: 'E3',
    shape: 'Round',
    capacity: 2,
    status: 'Available',
    scatterPosition: t(3.5, FLOOR_Y, -1.8),
    scatterRotationY: -0.6,
    gridPosition: t(2.8, FLOOR_Y, -1.4),
  },
  {
    id: 'E4',
    tableNumber: 'E4',
    shape: 'Rectangle',
    capacity: 4,
    status: 'Available',
    scatterPosition: t(3.8, FLOOR_Y, -4.6),
    scatterRotationY: 0.35,
    gridPosition: t(2.8, FLOOR_Y, -4.2),
  },
] as const

/** Mobile keeps the hero table plus a spread of zones/shapes/statuses, at under half the count. */
export const MOBILE_TABLES: readonly TableDef[] = [
  DESKTOP_TABLES[6], // M2 — hero
  DESKTOP_TABLES[0], // W1 — round, available
  DESKTOP_TABLES[3], // W4 — rectangle, available
  DESKTOP_TABLES[10], // E2 — occupied
  DESKTOP_TABLES[7], // M3 — round 8-top, available
  DESKTOP_TABLES[12], // E4 — rectangle, available
] as const

export const DEFAULT_SELECTED_TABLE_ID = 'M2'

/** Status → visual language, mirroring the real FloorPlanReadView status colors (see components/floor). */
export const STATUS_COLOR: Record<TableStatus, { light: string; dark: string; glow: number }> = {
  Available: { light: '#00b39f', dark: '#4db6ac', glow: 1 },
  Occupied: { light: '#8b8398', dark: '#6b5f7e', glow: 0.25 },
  Cleaning: { light: '#f9a825', dark: '#ffca28', glow: 0.55 },
  Disabled: { light: '#b9b2be', dark: '#4e445c', glow: 0.1 },
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export interface ChairOffset {
  x: number
  z: number
  /** Facing angle so the chair points toward the table center. */
  rotationY: number
}

const TABLE_DIMENSIONS: Record<TableShape, { width: number; depth: number; radius: number }> = {
  Round: { width: 1.1, depth: 1.1, radius: 0.55 },
  Rectangle: { width: 1.5, depth: 0.85, radius: 0 },
}

export function getTableDimensions(shape: TableShape) {
  return TABLE_DIMENSIONS[shape]
}

/** Chairs are capped at 4 for visual restraint regardless of capacity (capacity is shown via the label). */
export const DISPLAY_CHAIR_COUNT = 4

/** Deterministic chair placement derived from the table's real shape — not arbitrary scatter. */
export function computeChairOffsets(shape: TableShape, count: number): ChairOffset[] {
  const dims = TABLE_DIMENSIONS[shape]
  const offsets: ChairOffset[] = []

  if (shape === 'Round') {
    const radius = dims.radius + 0.42
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.PI / count
      offsets.push({
        x: Math.sin(angle) * radius,
        z: Math.cos(angle) * radius,
        rotationY: angle + Math.PI,
      })
    }
    return offsets
  }

  // Rectangle: distribute along the two long (width) sides, front-facing the table.
  const sideOffset = dims.depth / 2 + 0.38
  const perSide = Math.ceil(count / 2)
  const spacing = dims.width / (perSide + 1)
  let placed = 0
  for (let side = 0; side < 2 && placed < count; side += 1) {
    const z = side === 0 ? sideOffset : -sideOffset
    const rotationY = side === 0 ? Math.PI : 0
    for (let i = 0; i < perSide && placed < count; i += 1) {
      const x = -dims.width / 2 + spacing * (i + 1)
      offsets.push({ x, z, rotationY })
      placed += 1
    }
  }
  return offsets
}

export interface CameraKeyframe {
  position: Vec3
  lookAt: Vec3
}

/**
 * Named beats on the single normalized (0→1) story timeline. Every scroll-driven visual —
 * camera cuts, table scatter→grid, door swing, wall opacity, pendant lights — reads its
 * transition windows from these same fractions so nothing can drift out of sync.
 */
export const STORY = {
  entrance: 0,
  doorsOpen: 0.1,
  reception: 0.2,
  hallReveal: 0.3,
  weaveTables: 0.42,
  approachHero: 0.52,
  riseBegin: 0.62,
  floorPlan: 0.78,
  descend: 0.88,
  reserve: 1,
} as const

/**
 * The first eight shots (entrance → floorPlan) are fixed — they establish the room before the
 * guest has chosen anything. GSAP scrubs a plain target object through these; CameraRig damps the
 * real Three.js camera toward that target every frame so the motion always has inertia.
 */
const BASE_CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  // entrance — wide establishing shot at the closed doors.
  { position: t(0, 2.4, 17), lookAt: t(0, 1.6, 11) },
  // doorsOpen — dolly through the threshold as the doors swing open.
  { position: t(0, 2.1, 9), lookAt: t(0, 1.3, 3) },
  // reception — lateral pass by the reception desk.
  { position: t(2, 1.8, 5.5), lookAt: t(0.6, 1.1, 1) },
  // hallReveal — wide reveal of the full dining hall.
  { position: t(0, 3.4, 3.2), lookAt: t(0, 0.6, -2) },
  // weaveTables — tracking shot threading between the window-row tables.
  { position: t(-2.6, 1.3, 0.4), lookAt: t(0.8, 0.2, -2.4) },
  // approachHero — the camera slows and closes in on the default hero table.
  { position: t(1.5, 1.05, -0.2), lookAt: t(0, 0.15, -1.4) },
  // riseBegin — crane shot lifting off above the hall.
  { position: t(0.5, 5.8, -1.4), lookAt: t(0, 0, -1.6) },
  // floorPlan — near-overhead; the whole floor plan reads clearly.
  { position: t(0.2, 12.5, -1.6), lookAt: t(0, 0, -1.6) },
] as const

/**
 * Offsets (from a table's grid position) for the closing "descend" and "reserve" shots, tuned
 * against the default hero table (M2, grid {0, -0.3, -1.4}). Re-applied to whichever table is
 * currently selected so the camera dives back toward the table the guest actually chose.
 */
const DESCEND_OFFSET = { position: t(1.3, 3.3, 0.8), lookAt: t(0, 0.4, 0) }
const RESERVE_OFFSET = { position: t(1.35, 1.2, 1.1), lookAt: t(0, 0.25, -0.15) }

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return t(a.x + b.x, a.y + b.y, a.z + b.z)
}

/**
 * Ten shots total (nine transitions), one per STORY beat, in order. The last two re-target the
 * "descend" and "reserve" acts onto whichever table is selected — see DESCEND_OFFSET/RESERVE_OFFSET.
 */
export function buildCameraKeyframes(selectedTable: TableDef): readonly CameraKeyframe[] {
  return [
    ...BASE_CAMERA_KEYFRAMES,
    {
      position: addVec3(selectedTable.gridPosition, DESCEND_OFFSET.position),
      lookAt: addVec3(selectedTable.gridPosition, DESCEND_OFFSET.lookAt),
    },
    {
      position: addVec3(selectedTable.gridPosition, RESERVE_OFFSET.position),
      lookAt: addVec3(selectedTable.gridPosition, RESERVE_OFFSET.lookAt),
    },
  ] as const
}

/** Column pairs flanking the hall, aligned with the table rows. Instanced in Architecture.tsx. */
export const COLUMN_POSITIONS: readonly Vec3[] = [
  t(-4.6, 0, 4.2),
  t(4.6, 0, 4.2),
  t(-4.6, 0, 1.4),
  t(4.6, 0, 1.4),
  t(-4.6, 0, -1.4),
  t(4.6, 0, -1.4),
  t(-4.6, 0, -4.2),
  t(4.6, 0, -4.2),
  t(-4.6, 0, -7),
  t(4.6, 0, -7),
] as const

/** One pendant light above every table's floor-plan position, plus two warm ones over reception. */
export const PENDANT_LIGHT_POSITIONS: readonly Vec3[] = [
  ...DESKTOP_TABLES.map((table) => t(table.gridPosition.x, 3.3, table.gridPosition.z)),
  t(1.6, 3, 6),
  t(-1.2, 3, 8.5),
]

/** A handful of plants softening the columns and the entrance approach. */
export const PLANT_POSITIONS: readonly Vec3[] = [
  t(-4.4, 0, 9.5),
  t(4.4, 0, 9.5),
  t(-4.8, 0, -2.8),
  t(4.8, 0, -2.8),
  t(-4.8, 0, -8.4),
  t(4.8, 0, -8.4),
] as const

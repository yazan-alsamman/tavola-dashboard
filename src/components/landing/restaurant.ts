/**
 * Domain data for the landing page's 3D restaurant floor. Shapes and statuses are the real
 * `TableShapeDto` / `TableStatusDto` values from `src/api/tables.ts` — the landing page's 3D
 * vocabulary is literally the product's own table model, not invented geometry.
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
  /** Restaurant-style label (row + seat), e.g. "B2" — the centrally-placed selected table. */
  tableNumber: string
  shape: TableShape
  capacity: number
  status: TableStatus
  /** Loose "restaurant space" composition shown in the hero. */
  scatterPosition: Vec3
  scatterRotationY: number
  /** Aligned floor-plan composition the tables settle into as the user scrolls. */
  gridPosition: Vec3
  /** This is the table the whole scroll story centers on ("Choose your place"). */
  selected?: boolean
}

const t = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/** Nine tables: a realistic operational mix — mostly available, a couple occupied, one cleaning, one disabled. */
export const DESKTOP_TABLES: readonly TableDef[] = [
  {
    id: 'A1',
    tableNumber: 'A1',
    shape: 'Round',
    capacity: 2,
    status: 'Available',
    scatterPosition: t(-3.6, 0.7, -2.2),
    scatterRotationY: 0.4,
    gridPosition: t(-2.6, -0.3, -2.6),
  },
  {
    id: 'A2',
    tableNumber: 'A2',
    shape: 'Round',
    capacity: 2,
    status: 'Occupied',
    scatterPosition: t(-1.4, 1.5, -0.6),
    scatterRotationY: 0.8,
    gridPosition: t(0, -0.3, -2.6),
  },
  {
    id: 'A3',
    tableNumber: 'A3',
    shape: 'Rectangle',
    capacity: 6,
    status: 'Available',
    scatterPosition: t(2.4, 1.1, -2.6),
    scatterRotationY: 0.25,
    gridPosition: t(2.6, -0.3, -2.6),
  },
  {
    id: 'B1',
    tableNumber: 'B1',
    shape: 'Round',
    capacity: 4,
    status: 'Cleaning',
    scatterPosition: t(-4.6, -1.1, -4.6),
    scatterRotationY: -0.5,
    gridPosition: t(-2.6, -0.3, 0),
  },
  {
    id: 'B2',
    tableNumber: 'B2',
    shape: 'Rectangle',
    capacity: 4,
    status: 'Available',
    scatterPosition: t(0.5, 0.15, -1.2),
    scatterRotationY: -0.15,
    gridPosition: t(0, -0.3, 0),
    selected: true,
  },
  {
    id: 'B3',
    tableNumber: 'B3',
    shape: 'Rectangle',
    capacity: 4,
    status: 'Occupied',
    scatterPosition: t(4.4, -0.3, -5.2),
    scatterRotationY: 0.6,
    gridPosition: t(2.6, -0.3, 0),
  },
  {
    id: 'C1',
    tableNumber: 'C1',
    shape: 'Round',
    capacity: 2,
    status: 'Available',
    scatterPosition: t(-2.2, -1.9, -1.6),
    scatterRotationY: -0.7,
    gridPosition: t(-2.6, -0.3, 2.6),
  },
  {
    id: 'C2',
    tableNumber: 'C2',
    shape: 'Rectangle',
    capacity: 8,
    status: 'Available',
    scatterPosition: t(1.6, -1.6, -3.4),
    scatterRotationY: -0.35,
    gridPosition: t(0, -0.3, 2.6),
  },
  {
    id: 'C3',
    tableNumber: 'C3',
    shape: 'Round',
    capacity: 4,
    status: 'Disabled',
    scatterPosition: t(3.2, -1.9, -6.4),
    scatterRotationY: 0.15,
    gridPosition: t(2.6, -0.3, 2.6),
  },
] as const

/** Mobile keeps the selected table plus a spread of shapes/statuses, at a third of the count. */
export const MOBILE_TABLES: readonly TableDef[] = [
  DESKTOP_TABLES[4], // B2 — selected
  DESKTOP_TABLES[0], // A1 — round, available
  DESKTOP_TABLES[2], // A3 — rectangle, available
  DESKTOP_TABLES[5], // B3 — occupied
  DESKTOP_TABLES[7], // C2 — rectangle, available
] as const

export const SELECTED_TABLE = DESKTOP_TABLES.find((table) => table.selected)!

/** Status → visual language, mirroring the real FloorPlanReadView status colors (see components/floor). */
export const STATUS_COLOR: Record<TableStatus, { light: string; dark: string; glow: number }> = {
  Available: { light: '#00b39f', dark: '#4db6ac', glow: 1 },
  Occupied: { light: '#8b8398', dark: '#6b5f7e', glow: 0.25 },
  Cleaning: { light: '#f9a825', dark: '#ffca28', glow: 0.55 },
  Disabled: { light: '#b9b2be', dark: '#4e445c', glow: 0.1 },
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
 * Four cinematographer-designed shots, one per scroll act. GSAP scrubs a plain target object
 * through these; CameraRig damps the real Three.js camera toward that target every frame.
 */
export const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  // Act 1 — "The Room": wide establishing shot over the scattered restaurant.
  { position: t(0, 2.4, 12), lookAt: t(0, 0.2, -2) },
  // Act 2 — "Choose": camera moves in as tables begin aligning.
  { position: t(2.6, 1.3, 6.5), lookAt: t(0.3, -0.1, -1) },
  // Act 3 — "The Floor": near-overhead, the floor plan reads clearly.
  { position: t(0.4, 9.5, 1.4), lookAt: t(0, -0.3, 0) },
  // Act 4 — "Reserve": close, warm focus on the chosen table.
  { position: t(1.7, 0.95, 2.6), lookAt: t(0, -0.3, 0) },
]

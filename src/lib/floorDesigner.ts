import type { TableSection } from '@/types'
import { defaultFloorBlueprint, type FloorTableLayout, type FloorZone } from './floorLayout'

export const DESIGNER_CANVAS = { w: 1200, h: 800 }
export const GRID_SIZE = 20

export type SectionType = TableSection | 'custom'
export type DecorativeType =
  | 'kitchen'
  | 'bar'
  | 'reception'
  | 'entrance'
  | 'exit'
  | 'restroom'
  | 'stage'
  | 'garden'
export type TableShape = 'round' | 'square' | 'rect' | 'custom'
export type DesignerMode = 'operations' | 'edit'
export type EditTool = 'select' | 'pan' | 'marquee'

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 3
export const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const

export interface DesignerSection {
  id: string
  name: string
  sectionType: SectionType
  x: number
  y: number
  w: number
  h: number
  color: string
  visible: boolean
  locked: boolean
  zIndex: number
}

export interface DesignerTable {
  id: string
  tableId: string
  sectionId: string
  x: number
  y: number
  w: number
  h: number
  shape: TableShape
  rotation: number
  visible: boolean
  locked: boolean
  zIndex: number
  groupId?: string
  seatCount?: number
}

export interface DesignerDecorative {
  id: string
  type: DecorativeType
  label: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  visible: boolean
  locked: boolean
  zIndex: number
}

export interface FloorDesignerDocument {
  version: 2
  gridSize: number
  canvasWidth: number
  canvasHeight: number
  sections: DesignerSection[]
  tables: DesignerTable[]
  decoratives: DesignerDecorative[]
}

export const SECTION_COLORS: Record<SectionType, string> = {
  indoor: '#e8dff0',
  outdoor: '#dcfce7',
  terrace: '#fef3c7',
  vip: '#f3e8ff',
  family: '#dbeafe',
  private: '#fce7f3',
  custom: '#f3f4f6',
}

export const SECTION_BORDER_COLORS: Record<SectionType, string> = {
  indoor: '#7d5f9a',
  outdoor: '#16a34a',
  terrace: '#d97706',
  vip: '#7c3aed',
  family: '#2563eb',
  private: '#db2777',
  custom: '#6b7280',
}

export const DECORATIVE_ICONS: Record<DecorativeType, string> = {
  kitchen: 'skillet',
  bar: 'local_bar',
  reception: 'desk',
  entrance: 'door_front',
  exit: 'exit_to_app',
  restroom: 'wc',
  stage: 'theater_comedy',
  garden: 'yard',
}

export function snap(value: number, grid = GRID_SIZE) {
  return Math.round(value / grid) * grid
}

export function clampPos(x: number, y: number, w: number, h: number) {
  return {
    x: Math.max(0, Math.min(DESIGNER_CANVAS.w - w, x)),
    y: Math.max(0, Math.min(DESIGNER_CANVAS.h - h, y)),
  }
}

export function createDefaultDocument(): FloorDesignerDocument {
  const sections: DesignerSection[] = [
    { id: 'sec-indoor', name: 'Indoor Dining', sectionType: 'indoor', x: 40, y: 100, w: 520, h: 420, color: SECTION_COLORS.indoor, visible: true, locked: false, zIndex: 1 },
    { id: 'sec-vip', name: 'VIP Lounge', sectionType: 'vip', x: 600, y: 100, w: 280, h: 280, color: SECTION_COLORS.vip, visible: true, locked: false, zIndex: 2 },
    { id: 'sec-terrace', name: 'Terrace', sectionType: 'terrace', x: 40, y: 560, w: 840, h: 180, color: SECTION_COLORS.terrace, visible: true, locked: false, zIndex: 3 },
  ]

  const decoratives: DesignerDecorative[] = [
    { id: 'dec-kitchen', type: 'kitchen', label: 'Kitchen', x: 40, y: 20, w: 400, h: 60, rotation: 0, visible: true, locked: false, zIndex: 0 },
    { id: 'dec-bar', type: 'bar', label: 'Bar', x: 480, y: 20, w: 200, h: 60, rotation: 0, visible: true, locked: false, zIndex: 0 },
    { id: 'dec-reception', type: 'reception', label: 'Reception', x: 720, y: 20, w: 160, h: 60, rotation: 0, visible: true, locked: false, zIndex: 0 },
    { id: 'dec-entrance', type: 'entrance', label: 'Entrance', x: 400, y: 760, w: 200, h: 30, rotation: 0, visible: true, locked: false, zIndex: 0 },
    { id: 'dec-restroom', type: 'restroom', label: 'Restrooms', x: 920, y: 100, w: 80, h: 120, rotation: 0, visible: true, locked: false, zIndex: 0 },
    { id: 'dec-garden', type: 'garden', label: 'Garden', x: 920, y: 560, w: 120, h: 180, rotation: 0, visible: true, locked: false, zIndex: 0 },
  ]

  const sectionMap: Record<string, string> = {
    t1: 'sec-indoor', t2: 'sec-indoor', t3: 'sec-indoor', t4: 'sec-indoor',
    t5: 'sec-indoor', t6: 'sec-indoor', t7: 'sec-indoor', t8: 'sec-indoor',
    t10: 'sec-terrace', t12: 'sec-vip', t15: 'sec-vip', t16: 'sec-vip',
  }

  const tables: DesignerTable[] = defaultFloorBlueprint.map((layout, i) => ({
    id: `dt-${layout.id}`,
    tableId: layout.id,
    sectionId: sectionMap[layout.id] ?? 'sec-indoor',
    x: snap(layout.x * 1.4),
    y: snap(layout.y * 1.5 + 60),
    w: layout.shape === 'rect' ? 100 : 72,
    h: layout.shape === 'rect' ? 72 : 72,
    shape: layout.shape === 'rect' ? 'rect' : 'round',
    rotation: 0,
    visible: true,
    locked: false,
    zIndex: 10 + i,
  }))

  return {
    version: 2,
    gridSize: GRID_SIZE,
    canvasWidth: DESIGNER_CANVAS.w,
    canvasHeight: DESIGNER_CANVAS.h,
    sections,
    tables,
    decoratives,
  }
}

export function migrateLegacyLayout(blueprint: FloorTableLayout[], zones: FloorZone[]): FloorDesignerDocument {
  const doc = createDefaultDocument()
  const sectionByType = new Map(doc.sections.map((s) => [s.sectionType, s.id]))

  blueprint.forEach((layout) => {
    const existing = doc.tables.find((t) => t.tableId === layout.id)
    if (existing) {
      existing.x = snap(layout.x * 1.4)
      existing.y = snap(layout.y * 1.5 + 60)
      existing.w = layout.w
      existing.h = layout.h
      existing.shape = layout.shape === 'rect' ? 'rect' : 'round'
    }
  })

  zones.filter((z) => z.type === 'lounge' && z.section).forEach((zone) => {
    const secId = sectionByType.get(zone.section!)
    const sec = doc.sections.find((s) => s.id === secId)
    if (sec) {
      sec.x = snap((zone.x / 100) * DESIGNER_CANVAS.w)
      sec.y = snap((zone.y / 100) * DESIGNER_CANVAS.h)
      sec.w = snap((zone.w / 100) * DESIGNER_CANVAS.w)
      sec.h = snap((zone.h / 100) * DESIGNER_CANVAS.h)
    }
  })

  return doc
}

export function loadFloorDocument(branchId: string): FloorDesignerDocument {
  try {
    const raw = localStorage.getItem(`tavola-floor-designer-${branchId}`)
    if (raw) {
      const parsed = JSON.parse(raw) as FloorDesignerDocument
      if (parsed.version === 2) return parsed
    }
    const legacy = localStorage.getItem(`tavola-floor-layout-${branchId}`)
    if (legacy) {
      const { blueprint, zones } = JSON.parse(legacy) as { blueprint: FloorTableLayout[]; zones: FloorZone[] }
      return migrateLegacyLayout(blueprint, zones)
    }
  } catch { /* fall through */ }
  return createDefaultDocument()
}

export function saveFloorDocument(branchId: string, doc: FloorDesignerDocument) {
  localStorage.setItem(`tavola-floor-designer-${branchId}`, JSON.stringify(doc))
}

export function getSeatPositions(shape: TableShape, w: number, h: number, count: number): { x: number; y: number }[] {
  const seats: { x: number; y: number }[] = []
  const n = Math.min(count, 12)
  if (shape === 'round') {
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) / 2 + 6
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      seats.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
    }
  } else {
    const perSide = Math.ceil(n / 4)
    let placed = 0
    for (let i = 0; i < perSide && placed < n; i++, placed++) seats.push({ x: (w / (perSide + 1)) * (i + 1), y: -6 })
    for (let i = 0; i < perSide && placed < n; i++, placed++) seats.push({ x: w + 6, y: (h / (perSide + 1)) * (i + 1) })
    for (let i = 0; i < perSide && placed < n; i++, placed++) seats.push({ x: (w / (perSide + 1)) * (perSide - i), y: h + 6 })
    for (let i = 0; i < perSide && placed < n; i++, placed++) seats.push({ x: -6, y: (h / (perSide + 1)) * (perSide - i) })
  }
  return seats
}

export function alignElements(
  ids: string[],
  tables: DesignerTable[],
  decoratives: DesignerDecorative[],
  sections: DesignerSection[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v',
) {
  const items = [
    ...tables.filter((t) => ids.includes(t.id)).map((t) => ({ id: t.id, type: 'table' as const, x: t.x, y: t.y, w: t.w, h: t.h })),
    ...decoratives.filter((d) => ids.includes(d.id)).map((d) => ({ id: d.id, type: 'decorative' as const, x: d.x, y: d.y, w: d.w, h: d.h })),
    ...sections.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, type: 'section' as const, x: s.x, y: s.y, w: s.w, h: s.h })),
  ]
  if (items.length < 2) return null

  const updates: Record<string, { x?: number; y?: number }> = {}

  if (alignment === 'left') {
    const minX = Math.min(...items.map((i) => i.x))
    items.forEach((i) => { updates[i.id] = { x: minX } })
  } else if (alignment === 'right') {
    const maxX = Math.max(...items.map((i) => i.x + i.w))
    items.forEach((i) => { updates[i.id] = { x: maxX - i.w } })
  } else if (alignment === 'center') {
    const cx = items.reduce((s, i) => s + i.x + i.w / 2, 0) / items.length
    items.forEach((i) => { updates[i.id] = { x: cx - i.w / 2 } })
  } else if (alignment === 'top') {
    const minY = Math.min(...items.map((i) => i.y))
    items.forEach((i) => { updates[i.id] = { y: minY } })
  } else if (alignment === 'bottom') {
    const maxY = Math.max(...items.map((i) => i.y + i.h))
    items.forEach((i) => { updates[i.id] = { y: maxY - i.h } })
  } else if (alignment === 'middle') {
    const cy = items.reduce((s, i) => s + i.y + i.h / 2, 0) / items.length
    items.forEach((i) => { updates[i.id] = { y: cy - i.h / 2 } })
  } else if (alignment === 'distribute-h') {
    const sorted = [...items].sort((a, b) => a.x - b.x)
    const totalW = sorted.reduce((s, i) => s + i.w, 0)
    const gap = (sorted[sorted.length - 1].x + sorted[sorted.length - 1].w - sorted[0].x - totalW) / (sorted.length - 1)
    let x = sorted[0].x
    sorted.forEach((i) => { updates[i.id] = { x }; x += i.w + gap })
  } else if (alignment === 'distribute-v') {
    const sorted = [...items].sort((a, b) => a.y - b.y)
    const totalH = sorted.reduce((s, i) => s + i.h, 0)
    const gap = (sorted[sorted.length - 1].y + sorted[sorted.length - 1].h - sorted[0].y - totalH) / (sorted.length - 1)
    let y = sorted[0].y
    sorted.forEach((i) => { updates[i.id] = { y }; y += i.h + gap })
  }

  return updates
}

export function getTableSeatCount(dt: DesignerTable, fallback = 4) {
  return dt.seatCount ?? fallback
}

export function getElementBounds(
  doc: FloorDesignerDocument,
  ids: string[],
): { x: number; y: number; w: number; h: number } | null {
  const items: { x: number; y: number; w: number; h: number }[] = []
  ids.forEach((id) => {
    const sec = doc.sections.find((s) => s.id === id)
    if (sec) items.push({ x: sec.x, y: sec.y, w: sec.w, h: sec.h })
    const tbl = doc.tables.find((t) => t.id === id)
    if (tbl) items.push({ x: tbl.x, y: tbl.y, w: tbl.w, h: tbl.h })
    const dec = doc.decoratives.find((d) => d.id === id)
    if (dec) items.push({ x: dec.x, y: dec.y, w: dec.w, h: dec.h })
  })
  if (!items.length) return null
  const minX = Math.min(...items.map((i) => i.x))
  const minY = Math.min(...items.map((i) => i.y))
  const maxX = Math.max(...items.map((i) => i.x + i.w))
  const maxY = Math.max(...items.map((i) => i.y + i.h))
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function getElementsInRect(
  doc: FloorDesignerDocument,
  rect: { x: number; y: number; w: number; h: number },
): string[] {
  const rx2 = rect.x + rect.w
  const ry2 = rect.y + rect.h
  const intersects = (x: number, y: number, w: number, h: number) =>
    x < rx2 && x + w > rect.x && y < ry2 && y + h > rect.y

  const ids: string[] = []
  doc.sections.forEach((s) => { if (intersects(s.x, s.y, s.w, s.h)) ids.push(s.id) })
  doc.tables.forEach((t) => { if (t.visible && intersects(t.x, t.y, t.w, t.h)) ids.push(t.id) })
  doc.decoratives.forEach((d) => { if (d.visible && intersects(d.x, d.y, d.w, d.h)) ids.push(d.id) })
  return ids
}

export function mergeTables(tables: DesignerTable[], ids: string[]): DesignerTable[] {
  if (ids.length < 2) return tables
  const selected = tables.filter((t) => ids.includes(t.id))
  const groupId = `grp-${Date.now()}`
  const minX = Math.min(...selected.map((t) => t.x))
  const minY = Math.min(...selected.map((t) => t.y))
  const maxX = Math.max(...selected.map((t) => t.x + t.w))
  const maxY = Math.max(...selected.map((t) => t.y + t.h))

  return tables.map((t) => {
    if (!ids.includes(t.id)) return t
    if (t.id === ids[0]) {
      return { ...t, x: minX, y: minY, w: maxX - minX, h: maxY - minY, shape: 'rect' as TableShape, groupId }
    }
    return { ...t, visible: false, groupId }
  })
}

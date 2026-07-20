import type { TableSection, TableStatus } from '@/types'

export const FLOOR_CANVAS = { w: 720, h: 380 }

export interface FloorTableLayout {
  id: string
  x: number
  y: number
  shape: 'round' | 'rect'
  w: number
  h: number
}

export interface FloorZone {
  id: string
  /** i18n key under floorPlan */
  labelKey: 'kitchen' | 'indoor' | 'vip' | 'terrace' | 'entrance' | 'bar'
  x: number
  y: number
  w: number
  h: number
  /** kitchen & entrance are layout strips; vip/terrace/indoor are lounge sections */
  type: 'strip' | 'lounge'
  section?: TableSection
}

export const defaultFloorBlueprint: FloorTableLayout[] = [
  { id: 't1', x: 48, y: 56, shape: 'round', w: 52, h: 52 },
  { id: 't2', x: 120, y: 52, shape: 'round', w: 44, h: 44 },
  { id: 't3', x: 188, y: 56, shape: 'round', w: 52, h: 52 },
  { id: 't4', x: 48, y: 128, shape: 'round', w: 60, h: 52 },
  { id: 't5', x: 132, y: 132, shape: 'round', w: 44, h: 44 },
  { id: 't6', x: 48, y: 200, shape: 'round', w: 52, h: 52 },
  { id: 't7', x: 120, y: 204, shape: 'round', w: 44, h: 44 },
  { id: 't8', x: 188, y: 200, shape: 'round', w: 52, h: 52 },
  { id: 't10', x: 280, y: 200, shape: 'round', w: 56, h: 52 },
  { id: 't12', x: 520, y: 56, shape: 'rect', w: 68, h: 48 },
  { id: 't15', x: 508, y: 128, shape: 'rect', w: 84, h: 52 },
  { id: 't16', x: 508, y: 200, shape: 'rect', w: 84, h: 56 },
]

export const defaultFloorZones: FloorZone[] = [
  { id: 'zone-kitchen', labelKey: 'kitchen', x: 0, y: 0, w: 100, h: 12, type: 'strip' },
  { id: 'zone-indoor', labelKey: 'indoor', x: 3, y: 14, w: 35, h: 55, type: 'lounge', section: 'indoor' },
  { id: 'zone-vip', labelKey: 'vip', x: 70, y: 14, w: 28, h: 58, type: 'lounge', section: 'vip' },
  { id: 'zone-terrace', labelKey: 'terrace', x: 4, y: 72, w: 92, h: 8, type: 'lounge', section: 'terrace' },
  { id: 'zone-entrance', labelKey: 'entrance', x: 0, y: 90, w: 100, h: 10, type: 'strip' },
  { id: 'zone-bar', labelKey: 'bar', x: 45, y: 14, w: 20, h: 8, type: 'strip' },
]

/** @deprecated use defaultFloorBlueprint */
export const floorBlueprint = defaultFloorBlueprint

export const statusDot: Record<TableStatus, string> = {
  available: 'bg-outline',
  reserved: 'bg-primary-container',
  occupied: 'bg-primary-fixed',
  out_of_service: 'bg-error',
}

export const statusRing: Record<TableStatus, string> = {
  available: 'border-outline-variant bg-surface-container-lowest text-on-surface-variant',
  reserved: 'border-primary-container bg-secondary-container text-primary',
  occupied: 'border-primary bg-primary-container text-on-primary-container',
  out_of_service: 'border-error border-dashed opacity-60',
}

export function clampFloorPosition(x: number, y: number, w: number, h: number) {
  return {
    x: Math.max(0, Math.min(FLOOR_CANVAS.w - w, x)),
    y: Math.max(0, Math.min(FLOOR_CANVAS.h - h, y)),
  }
}

export function loadFloorLayout(branchId: string) {
  try {
    const raw = localStorage.getItem(`tavola-floor-layout-${branchId}`)
    if (!raw) return { blueprint: defaultFloorBlueprint, zones: defaultFloorZones }
    const parsed = JSON.parse(raw) as { blueprint: FloorTableLayout[]; zones: FloorZone[] }
    return {
      blueprint: parsed.blueprint?.length ? parsed.blueprint : defaultFloorBlueprint,
      zones: parsed.zones?.length ? parsed.zones : defaultFloorZones,
    }
  } catch {
    return { blueprint: defaultFloorBlueprint, zones: defaultFloorZones }
  }
}

export function saveFloorLayout(branchId: string, blueprint: FloorTableLayout[], zones: FloorZone[]) {
  localStorage.setItem(`tavola-floor-layout-${branchId}`, JSON.stringify({ blueprint, zones }))
}

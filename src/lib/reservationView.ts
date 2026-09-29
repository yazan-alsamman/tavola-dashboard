import type {
  ReservationDto,
  ReservationSourceDto,
  ReservationStatusDto,
} from '@/api/reservations'

const STATUSES = new Set<ReservationStatusDto>([
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
  'Expired',
  'NoShow',
])

const SOURCES = new Set<ReservationSourceDto>([
  'Online',
  'Phone',
  'WalkIn',
  'Staff',
  'WaitlistConversion',
])

/** Flat ownership row plus the branch calendar's guest and table joins. */
export interface ReservationView extends ReservationDto {
  tableNumber: string | null
  customerName: string | null
  customerPhone: string | null
  customerKind: 'User' | 'Guest' | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function amount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Branch rows use `partySize`, `reservationSource`, nested `table`, and `customer`.
 * Ownership rows use `guests`, `source`, and `tableId`. Both become one view.
 */
export function toReservationView(raw: unknown): ReservationView | null {
  if (!isRecord(raw)) return null

  const reservationId = text(raw.reservationId)
  const restaurantId = text(raw.restaurantId)
  const branchId = text(raw.branchId)
  const reservationDate = text(raw.reservationDate)
  const reservationStartTime = text(raw.reservationStartTime)
  const reservationEndTime = text(raw.reservationEndTime)
  const status = text(raw.status)
  const createdAt = text(raw.createdAt)
  const updatedAt = text(raw.updatedAt)
  if (
    !reservationId ||
    !restaurantId ||
    !branchId ||
    !reservationDate ||
    !reservationStartTime ||
    !reservationEndTime ||
    !status ||
    !STATUSES.has(status as ReservationStatusDto) ||
    !createdAt ||
    !updatedAt
  ) {
    return null
  }

  const table = isRecord(raw.table) ? raw.table : null
  const customer = isRecord(raw.customer) ? raw.customer : null
  const sourceRaw = text(raw.source) ?? text(raw.reservationSource) ?? 'Online'
  const customerKindRaw = customer ? text(customer.type) : null

  return {
    reservationId,
    userId: text(raw.userId),
    restaurantId,
    branchId,
    tableId: text(raw.tableId) ?? (table ? text(table.tableId) : null) ?? '',
    tableNumber: text(raw.tableNumber) ?? (table ? text(table.tableNumber) : null),
    reservationDate: reservationDate.slice(0, 10),
    reservationStartTime,
    reservationEndTime,
    guests: amount(raw.guests) ?? amount(raw.partySize) ?? 0,
    status: status as ReservationStatusDto,
    source: (SOURCES.has(sourceRaw as ReservationSourceDto)
      ? sourceRaw
      : 'Online') as ReservationSourceDto,
    notes: text(raw.notes) ?? text(raw.specialRequest),
    createdAt,
    updatedAt,
    customerName: customer ? text(customer.name) : null,
    customerPhone: customer ? text(customer.phone) : null,
    customerKind:
      customerKindRaw === 'User' || customerKindRaw === 'Guest' ? customerKindRaw : null,
  }
}

export function toReservationViews(rawItems: unknown): ReservationView[] {
  if (!Array.isArray(rawItems)) return []
  const views: ReservationView[] = []
  for (const item of rawItems) {
    const view = toReservationView(item)
    if (view) views.push(view)
  }
  return views
}

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
  /** The offer the customer booked from (branch rows only), or null. */
  offer: { offerId: string; title: string } | null
  /** `user:<id>` or `guest:<phone>` — opens the customer page (branch rows only). */
  customerKey: string | null
  /** Completed visits at this restaurant, all branches (branch rows only). */
  visitCount: number
  noShowCount: number
  /** Staff-only note, never shown to the customer. */
  internalNote: string | null
  /** When a Pending booking expires unanswered; null otherwise. */
  approvalDeadlineAt: string | null
  /** Who moved the booking to its final status, and why. */
  statusChange: ReservationStatusChange | null
}

export type ReservationActorKind = 'Customer' | 'Restaurant' | 'System'

export interface ReservationStatusChange {
  status: ReservationStatusDto
  changedBy: ReservationActorKind
  reason: string | null
  changedAt: string
}

const ACTOR_KINDS = new Set<ReservationActorKind>(['Customer', 'Restaurant', 'System'])

function toStatusChange(raw: unknown): ReservationStatusChange | null {
  if (!isRecord(raw)) return null
  const status = text(raw.status)
  const changedBy = text(raw.changedBy)
  const changedAt = text(raw.changedAt)
  if (
    !status ||
    !STATUSES.has(status as ReservationStatusDto) ||
    !changedBy ||
    !ACTOR_KINDS.has(changedBy as ReservationActorKind) ||
    !changedAt
  ) {
    return null
  }
  return {
    status: status as ReservationStatusDto,
    changedBy: changedBy as ReservationActorKind,
    reason: text(raw.reason),
    changedAt,
  }
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
  const offerRaw = isRecord(raw.offer) ? raw.offer : null
  const offerId = offerRaw ? text(offerRaw.offerId) : null
  const offerTitle = offerRaw ? text(offerRaw.title) : null

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
    offer: offerId && offerTitle ? { offerId, title: offerTitle } : null,
    customerKey: customer ? text(customer.key) : null,
    visitCount: (customer ? amount(customer.visitCount) : null) ?? 0,
    noShowCount: (customer ? amount(customer.noShowCount) : null) ?? 0,
    internalNote: text(raw.internalNote),
    approvalDeadlineAt: text(raw.approvalDeadlineAt),
    statusChange: toStatusChange(raw.statusChange),
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

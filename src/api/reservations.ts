import { apiRequest, createIdempotencyKey } from './client'
import type { PaginatedData } from './types'

/**
 * Backend reservation status enum (OpenAPI / DOMAIN_MODEL).
 * Create returns `Pending`. Lifecycle Domain Actions are wired from Postman.
 */
export type ReservationStatusDto =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed'
  | 'Expired'
  | 'NoShow'

export type ReservationSourceDto =
  | 'Online'
  | 'Phone'
  | 'WalkIn'
  | 'Staff'
  | 'WaitlistConversion'

export type TableShapeDto = 'Rectangle' | 'Round'

/** Confirmed `TableAvailabilityResponseDto` from live OpenAPI. */
export interface TableAvailabilityDto {
  tableId: string
  tableNumber: string
  capacity: number
  shape: TableShapeDto
  /** Informational only — create remains the authoritative conflict check. */
  isAvailable: boolean
}

export interface SearchAvailabilityParams {
  branchId: string
  reservationStartTime: string
  partySize: number
  /** When omitted, backend derives end from restaurant default duration. */
  reservationEndTime?: string | null
}

/** Confirmed `CreateReservationRequestDto` from live OpenAPI / Postman. */
export interface CreateReservationRequest {
  branchId: string
  tableId: string
  reservationStartTime: string
  guests: number
  reservationEndTime?: string | null
  /** OpenAPI types this oddly as object|null; Postman uses a string. */
  notes?: string | null
}

export interface ReservationGuestDto {
  countryCode: string
  phoneNumber: string
  fullName: string
  email?: string | null
}

/** Staff Phone / WalkIn create — requires `source` + `reservationGuest`. */
export interface CreateStaffReservationRequest extends CreateReservationRequest {
  source: 'Phone' | 'WalkIn'
  reservationGuest: ReservationGuestDto
}

export interface ListReservationsParams {
  page?: number
  limit?: number
}

/** Confirmed `ReservationResponseDto` from live OpenAPI. */
export interface ReservationDto {
  reservationId: string
  userId: string | null
  restaurantId: string
  branchId: string
  tableId: string
  reservationDate: string
  reservationStartTime: string
  reservationEndTime: string
  guests: number
  status: ReservationStatusDto
  source: ReservationSourceDto
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Informational table availability for a branch + time window.
 * Does not reserve anything. Never send organizationId / tenant headers.
 */
export async function searchAvailability(
  params: SearchAvailabilityParams,
  signal?: AbortSignal,
): Promise<TableAvailabilityDto[]> {
  return apiRequest<TableAvailabilityDto[]>('/reservations/availability', {
    query: {
      branchId: params.branchId,
      reservationStartTime: params.reservationStartTime,
      partySize: params.partySize,
      reservationEndTime: params.reservationEndTime ?? undefined,
    },
    signal,
  })
}

/**
 * Creates a reservation for the authenticated user (`source=Online`, `status=Pending`).
 *
 * `idempotencyKey` must be stable for one logical submit (retries / double-click).
 * Prefer {@link createReservationWithIdempotency} when the caller does not already hold a key.
 */
export async function createReservation(
  body: CreateReservationRequest,
  idempotencyKey: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>('/reservations', {
    method: 'POST',
    body: {
      branchId: body.branchId,
      tableId: body.tableId,
      reservationStartTime: body.reservationStartTime,
      guests: body.guests,
      ...(body.reservationEndTime != null
        ? { reservationEndTime: body.reservationEndTime }
        : {}),
      ...(body.notes != null && body.notes !== '' ? { notes: body.notes } : {}),
    },
    idempotencyKey,
  })
}

/**
 * Staff Phone / Walk-In create (`reservations:create`).
 * Requires `source` + `reservationGuest` per Postman.
 */
export async function createStaffReservation(
  body: CreateStaffReservationRequest,
  idempotencyKey: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>('/reservations', {
    method: 'POST',
    body: {
      branchId: body.branchId,
      tableId: body.tableId,
      reservationStartTime: body.reservationStartTime,
      guests: body.guests,
      source: body.source,
      reservationGuest: body.reservationGuest,
      ...(body.reservationEndTime != null
        ? { reservationEndTime: body.reservationEndTime }
        : {}),
      ...(body.notes != null && body.notes !== '' ? { notes: body.notes } : {}),
    },
    idempotencyKey,
  })
}

/** Convenience wrapper that generates a single Idempotency-Key for one submission. */
export async function createReservationWithIdempotency(
  body: CreateReservationRequest,
): Promise<{ reservation: ReservationDto; idempotencyKey: string }> {
  const idempotencyKey = createIdempotencyKey()
  const reservation = await createReservation(body, idempotencyKey)
  return { reservation, idempotencyKey }
}

export async function createStaffReservationWithIdempotency(
  body: CreateStaffReservationRequest,
): Promise<{ reservation: ReservationDto; idempotencyKey: string }> {
  const idempotencyKey = createIdempotencyKey()
  const reservation = await createStaffReservation(body, idempotencyKey)
  return { reservation, idempotencyKey }
}

/**
 * List reservations for the authenticated JWT subject (ownership-based).
 * Guest Phone/WalkIn bookings are not returned on this path.
 */
export async function listMyReservations(
  params: ListReservationsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<ReservationDto>> {
  return apiRequest<PaginatedData<ReservationDto>>('/reservations', {
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    signal,
  })
}

/** Ownership-based detail. Foreign / guest bookings → 404. */
export async function getMyReservation(
  reservationId: string,
  signal?: AbortSignal,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}`, { signal })
}

/** Staff `reservations:approve` — Pending only. */
export async function approveReservation(
  reservationId: string,
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/approve`, {
    method: 'POST',
    idempotencyKey,
  })
}

/** Staff `reservations:approve` — Pending only; no table hold. */
export async function rejectReservation(
  reservationId: string,
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/reject`, {
    method: 'POST',
    idempotencyKey,
  })
}

export interface CancelReservationRequest {
  reason?: string | null
}

export interface RescheduleReservationRequest {
  tableId: string
  reservationStartTime: string
  guests: number
  reservationEndTime?: string | null
}

/** Staff or owning customer — cancels a reservation. */
export async function cancelReservation(
  reservationId: string,
  body: CancelReservationRequest = {},
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/cancel`, {
    method: 'POST',
    body: {
      ...(body.reason != null && body.reason !== '' ? { reason: body.reason } : {}),
    },
    idempotencyKey,
  })
}

/** Staff or owning customer — reschedules table/time/party size. */
export async function rescheduleReservation(
  reservationId: string,
  body: RescheduleReservationRequest,
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/reschedule`, {
    method: 'POST',
    body: {
      tableId: body.tableId,
      reservationStartTime: body.reservationStartTime,
      guests: body.guests,
      ...(body.reservationEndTime != null
        ? { reservationEndTime: body.reservationEndTime }
        : {}),
    },
    idempotencyKey,
  })
}

/** Staff-only — Approved → Completed. */
export async function completeReservation(
  reservationId: string,
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/complete`, {
    method: 'POST',
    idempotencyKey,
  })
}

/** Staff-only — mark NoShow (`reservations:noshow`). */
export async function markReservationNoShow(
  reservationId: string,
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/no-show`, {
    method: 'POST',
    idempotencyKey,
  })
}

/**
 * Staff `reservations:tableready` — operational signal; status stays Approved.
 */
export async function markReservationTableReady(
  reservationId: string,
  idempotencyKey?: string,
): Promise<ReservationDto> {
  return apiRequest<ReservationDto>(`/reservations/${reservationId}/table-ready`, {
    method: 'POST',
    idempotencyKey,
  })
}

export { createIdempotencyKey }

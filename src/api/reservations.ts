import { apiRequest, createIdempotencyKey } from './client'

/**
 * Backend reservation status enum (OpenAPI / DOMAIN_MODEL).
 * Phase 7.1 create always returns `Pending`. Staff transitions are not live yet.
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
 * Staff phone/walk-in guest payloads are not live (backend Phase 7.4).
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

/** Convenience wrapper that generates a single Idempotency-Key for one submission. */
export async function createReservationWithIdempotency(
  body: CreateReservationRequest,
): Promise<{ reservation: ReservationDto; idempotencyKey: string }> {
  const idempotencyKey = createIdempotencyKey()
  const reservation = await createReservation(body, idempotencyKey)
  return { reservation, idempotencyKey }
}

export { createIdempotencyKey }

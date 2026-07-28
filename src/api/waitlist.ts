import { apiRequest } from './client'

export interface ReservationGuestDto {
  countryCode: string
  phoneNumber: string
  fullName: string
  email?: string | null
}

export interface JoinWaitlistRequest {
  branchId: string
  partySize: number
  /** YYYY-MM-DD — required with preferredTimeFrom (authoritative on promote). */
  preferredDate: string
  preferredTimeFrom: string
  preferredTimeTo?: string | null
  notes?: string | null
  /** Staff-only guest payload. */
  reservationGuest?: ReservationGuestDto | null
}

export type WaitlistStatusDto =
  | 'Waiting'
  | 'Notified'
  | 'Converted'
  | 'Cancelled'
  | 'Expired'
  | (string & {})

export interface WaitlistEntryDto {
  entryId: string
  branchId?: string
  partySize?: number
  status?: WaitlistStatusDto
  preferredDate?: string | null
  preferredTimeFrom?: string | null
  preferredTimeTo?: string | null
  notes?: string | null
  convertedReservationId?: string | null
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

/** Join waitlist — Postman captures `data.entryId`. */
export async function joinWaitlist(
  body: JoinWaitlistRequest,
): Promise<WaitlistEntryDto> {
  return apiRequest<WaitlistEntryDto>('/waitlist', {
    method: 'POST',
    body: {
      branchId: body.branchId,
      partySize: body.partySize,
      preferredDate: body.preferredDate,
      preferredTimeFrom: body.preferredTimeFrom,
      ...(body.preferredTimeTo != null
        ? { preferredTimeTo: body.preferredTimeTo }
        : {}),
      ...(body.notes != null && body.notes !== '' ? { notes: body.notes } : {}),
      ...(body.reservationGuest != null
        ? { reservationGuest: body.reservationGuest }
        : {}),
    },
  })
}

/** Customer owner or staff `reservations:waitlist`. */
export async function cancelWaitlistEntry(
  entryId: string,
): Promise<WaitlistEntryDto> {
  return apiRequest<WaitlistEntryDto>(`/waitlist/${entryId}/cancel`, {
    method: 'POST',
  })
}

/**
 * Staff `reservations:waitlist`.
 * Success → status Converted with `convertedReservationId`.
 */
export async function promoteWaitlistEntry(
  entryId: string,
): Promise<WaitlistEntryDto> {
  return apiRequest<WaitlistEntryDto>(`/waitlist/${entryId}/promote`, {
    method: 'POST',
  })
}

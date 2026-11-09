import type { ReservationView } from '@/lib/reservationView'

/**
 * Minutes after a confirmed booking's end time before the server's
 * auto-close sweep closes it (backend ADR-043). The dashboard counts down
 * inside this window so reception can close the table first.
 */
export const AUTO_CLOSE_GRACE_MINUTES = 30

const MS_PER_MINUTE = 60_000

/** Visits before this one: a completed booking already counts itself. */
export function previousVisits(reservation: ReservationView): number {
  const own = reservation.status === 'Completed' ? 1 : 0
  return Math.max(0, reservation.visitCount - own)
}

export function isReturningCustomer(reservation: ReservationView): boolean {
  return previousVisits(reservation) >= 1
}

/** Whole minutes from `now` until `iso`, rounded up; negative once it has passed. */
export function minutesUntil(iso: string, now: number): number {
  return Math.ceil((Date.parse(iso) - now) / MS_PER_MINUTE)
}

/** Minutes left to answer a Pending booking, or null when nothing is pending. */
export function approvalMinutesLeft(reservation: ReservationView, now: number): number | null {
  if (reservation.status !== 'Pending' || !reservation.approvalDeadlineAt) return null
  return minutesUntil(reservation.approvalDeadlineAt, now)
}

/**
 * Minutes before the system closes a confirmed booking whose time is over,
 * or null while the booking is still running (or not confirmed).
 */
export function autoCloseMinutesLeft(reservation: ReservationView, now: number): number | null {
  if (reservation.status !== 'Approved') return null
  const end = Date.parse(reservation.reservationEndTime)
  if (Number.isNaN(end) || end > now) return null
  return Math.max(0, Math.ceil((end + AUTO_CLOSE_GRACE_MINUTES * MS_PER_MINUTE - now) / MS_PER_MINUTE))
}

/** A booking the system closed because nobody at reception did. */
export function isAutoClosed(reservation: ReservationView): boolean {
  return reservation.status === 'Completed' && reservation.statusChange?.changedBy === 'System'
}

/** Path of the customer page for a list row's `customerKey`. */
export function customerPagePath(customerKey: string): string {
  return `/app/customers/${encodeURIComponent(customerKey)}`
}

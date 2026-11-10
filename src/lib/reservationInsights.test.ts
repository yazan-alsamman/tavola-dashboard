import { describe, expect, it } from 'vitest'
import {
  approvalMinutesLeft,
  autoCloseMinutesLeft,
  isAutoClosed,
  isReturningCustomer,
  previousVisits,
} from '@/lib/reservationInsights'
import type { ReservationView } from '@/lib/reservationView'

function view(overrides: Partial<ReservationView>): ReservationView {
  return {
    reservationId: 'r1',
    userId: null,
    restaurantId: 'rest',
    branchId: 'b1',
    tableId: 't1',
    tableNumber: 'T1',
    reservationDate: '2026-11-10',
    reservationStartTime: '2026-11-10T18:00:00.000Z',
    reservationEndTime: '2026-11-10T19:30:00.000Z',
    guests: 2,
    status: 'Approved',
    source: 'Phone',
    notes: null,
    createdAt: '2026-11-09T10:00:00.000Z',
    updatedAt: '2026-11-09T10:00:00.000Z',
    customerName: 'Rana',
    customerPhone: '+963991234567',
    customerKind: 'Guest',
    offer: null,
    customerKey: 'guest:+963991234567',
    visitCount: 0,
    noShowCount: 0,
    internalNote: null,
    approvalDeadlineAt: null,
    statusChange: null,
    ...overrides,
  }
}

const at = (iso: string) => Date.parse(iso)

describe('reservation insights', () => {
  it('does not count a completed booking as a previous visit to itself', () => {
    expect(previousVisits(view({ status: 'Completed', visitCount: 1 }))).toBe(0)
    expect(isReturningCustomer(view({ status: 'Completed', visitCount: 1 }))).toBe(false)
    expect(isReturningCustomer(view({ status: 'Approved', visitCount: 1 }))).toBe(true)
  })

  it('counts down the approval window only while pending', () => {
    const pending = view({ status: 'Pending', approvalDeadlineAt: '2026-11-10T18:15:00.000Z' })
    expect(approvalMinutesLeft(pending, at('2026-11-10T18:00:30.000Z'))).toBe(15)
    expect(approvalMinutesLeft(view({ status: 'Approved' }), at('2026-11-10T18:00:00.000Z'))).toBeNull()
  })

  it('warns about auto-close only after the booking time is over', () => {
    const booking = view({ status: 'Approved' })
    expect(autoCloseMinutesLeft(booking, at('2026-11-10T19:00:00.000Z'))).toBeNull()
    expect(autoCloseMinutesLeft(booking, at('2026-11-10T19:40:00.000Z'))).toBe(20)
    expect(autoCloseMinutesLeft(booking, at('2026-11-10T20:30:00.000Z'))).toBe(0)
  })

  it('recognises bookings the system closed', () => {
    const change = {
      status: 'Completed' as const,
      reason: null,
      changedAt: '2026-11-10T20:01:00.000Z',
    }
    expect(isAutoClosed(view({ status: 'Completed', statusChange: { ...change, changedBy: 'System' } }))).toBe(true)
    expect(isAutoClosed(view({ status: 'Completed', statusChange: { ...change, changedBy: 'Restaurant' } }))).toBe(false)
  })
})

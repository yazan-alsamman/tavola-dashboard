import { describe, expect, it } from 'vitest'
import { toReservationView, toReservationViews } from '@/lib/reservationView'

describe('toReservationView', () => {
  it('maps a branch calendar row onto guest, table, and party size', () => {
    const view = toReservationView({
      reservationId: '6f1c9f1e-6b1a-4b0a-8b0e-2c9f1e6b1a4b',
      restaurantId: 'restaurant-1',
      branchId: 'branch-1',
      reservationDate: '2026-09-28',
      reservationStartTime: '2026-09-28T18:00:00.000Z',
      reservationEndTime: '2026-09-28T19:30:00.000Z',
      partySize: 2,
      status: 'Approved',
      reservationSource: 'Online',
      createdAt: '2026-09-01T09:15:00.000Z',
      updatedAt: '2026-09-01T09:15:05.000Z',
      specialRequest: 'Window seat please',
      table: { tableId: 'table-1', tableNumber: 'T12', capacity: 4 },
      customer: { type: 'User', name: 'Jane Doe', phone: '+963991234567' },
    })

    expect(view).toMatchObject({
      guests: 2,
      source: 'Online',
      tableId: 'table-1',
      tableNumber: 'T12',
      customerName: 'Jane Doe',
      customerPhone: '+963991234567',
      customerKind: 'User',
      notes: 'Window seat please',
    })
  })

  it('keeps an ownership row that already uses guests and tableId', () => {
    const view = toReservationView({
      reservationId: 'res-1',
      userId: 'user-1',
      restaurantId: 'restaurant-1',
      branchId: 'branch-1',
      tableId: 'table-9',
      reservationDate: '2026-09-28',
      reservationStartTime: '2026-09-28T18:00:00.000Z',
      reservationEndTime: '2026-09-28T19:30:00.000Z',
      guests: 4,
      status: 'Pending',
      source: 'Phone',
      notes: null,
      createdAt: '2026-09-01T09:15:00.000Z',
      updatedAt: '2026-09-01T09:15:05.000Z',
    })

    expect(view?.guests).toBe(4)
    expect(view?.tableId).toBe('table-9')
    expect(view?.tableNumber).toBeNull()
    expect(view?.customerName).toBeNull()
  })

  it('drops rows that are not reservations', () => {
    expect(toReservationViews([{ reservationId: 'nope' }, null, 'x'])).toEqual([])
  })
})

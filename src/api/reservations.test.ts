import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { __resetApiClientForTests } from './client'
import { tokenStore } from './tokenStore'
import {
  createReservation,
  searchAvailability,
  type CreateReservationRequest,
} from './reservations'
import { isApiError } from './errors'
import { branchLocalDateTimeToUtcIso } from '@/lib/branchDateTime'

const BASE = 'http://127.0.0.1:3999/api/v1'
const server = setupServer()

const branchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const tableId = 'tttttttt-tttt-tttt-tttt-tttttttttttt'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  tokenStore.clear()
  __resetApiClientForTests()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  tokenStore.setAccessToken('access-token')
  __resetApiClientForTests()
})

describe('searchAvailability', () => {
  it('serializes query params and returns table availability DTOs', async () => {
    const restaurantId = 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr'
    server.use(
      http.get(`${BASE}/reservations/availability`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('restaurantId')).toBe(restaurantId)
        expect(url.searchParams.get('branchId')).toBe(branchId)
        expect(url.searchParams.get('date')).toBe('2026-08-01')
        expect(url.searchParams.get('partySize')).toBe('4')
        expect(url.searchParams.get('page')).toBe('1')
        expect(url.searchParams.get('limit')).toBe('20')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: [
            {
              tableId,
              tableNumber: 'T1',
              capacity: 4,
              shape: 'Round',
              isAvailable: true,
            },
          ],
          meta: {},
        })
      }),
    )

    const tables = await searchAvailability({
      restaurantId,
      branchId,
      date: '2026-08-01',
      partySize: 4,
    })

    expect(tables).toHaveLength(1)
    expect(tables[0]?.tableNumber).toBe('T1')
    expect(tables[0]?.isAvailable).toBe(true)
  })

  it('throws typed ApiError on forbidden', async () => {
    server.use(
      http.get(`${BASE}/reservations/availability`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Forbidden',
            code: 'FORBIDDEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/reservations/availability',
          },
          { status: 403 },
        ),
      ),
    )

    try {
      await searchAvailability({
        restaurantId: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
        branchId,
        date: '2026-08-01',
        partySize: 2,
      })
      expect.unreachable()
    } catch (err) {
      expect(isApiError(err)).toBe(true)
      if (isApiError(err)) {
        expect(err.code).toBe('FORBIDDEN')
        expect(err.status).toBe(403)
      }
    }
  })
})

describe('createReservation', () => {
  const body: CreateReservationRequest = {
    branchId,
    tableId,
    reservationStartTime: '2026-08-01T18:00:00.000Z',
    guests: 2,
    notes: 'Window seat',
  }

  it('posts the create DTO with Idempotency-Key and returns ReservationDto', async () => {
    server.use(
      http.post(`${BASE}/reservations`, async ({ request }) => {
        expect(request.headers.get('Idempotency-Key')).toBe(
          '11111111-1111-1111-1111-111111111111',
        )
        const json = (await request.json()) as Record<string, unknown>
        expect(json.branchId).toBe(branchId)
        expect(json.tableId).toBe(tableId)
        expect(json.guests).toBe(2)
        expect(json.notes).toBe('Window seat')
        expect(json).not.toHaveProperty('organizationId')
        expect(json).not.toHaveProperty('userId')
        expect(json).not.toHaveProperty('source')

        return HttpResponse.json(
          {
            success: true,
            message: 'Created',
            data: {
              reservationId: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
              userId: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu',
              restaurantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              branchId,
              tableId,
              reservationDate: '2026-08-01',
              reservationStartTime: '2026-08-01T18:00:00.000Z',
              reservationEndTime: '2026-08-01T19:30:00.000Z',
              guests: 2,
              status: 'Pending',
              source: 'Online',
              notes: 'Window seat',
              createdAt: '2026-07-23T12:00:00.000Z',
              updatedAt: '2026-07-23T12:00:00.000Z',
            },
            meta: {},
          },
          { status: 201 },
        )
      }),
    )

    const reservation = await createReservation(
      body,
      '11111111-1111-1111-1111-111111111111',
    )

    expect(reservation.status).toBe('Pending')
    expect(reservation.source).toBe('Online')
    expect(reservation.reservationId).toBe('rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr')
  })

  it('maps CONFLICT on create', async () => {
    server.use(
      http.post(`${BASE}/reservations`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Conflict',
            code: 'CONFLICT',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/reservations',
          },
          { status: 409 },
        ),
      ),
    )

    await expect(
      createReservation(body, '22222222-2222-2222-2222-222222222222'),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 })
  })

  it('maps VALIDATION_ERROR on create', async () => {
    server.use(
      http.post(`${BASE}/reservations`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Validation failed.',
            code: 'VALIDATION_ERROR',
            errors: [{ field: 'guests', message: 'too large' }],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/reservations',
          },
          { status: 400 },
        ),
      ),
    )

    await expect(
      createReservation(body, '33333333-3333-3333-3333-333333333333'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })
  })

  it('reuses the same idempotency key across caller retries (caller responsibility)', async () => {
    const keys: string[] = []
    server.use(
      http.post(`${BASE}/reservations`, async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key') ?? '')
        return HttpResponse.json(
          {
            success: false,
            message: 'Conflict',
            code: 'CONFLICT',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/reservations',
          },
          { status: 409 },
        )
      }),
    )

    const key = '44444444-4444-4444-4444-444444444444'
    await expect(createReservation(body, key)).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    await expect(createReservation(body, key)).rejects.toMatchObject({
      code: 'CONFLICT',
    })
    expect(keys).toEqual([key, key])
  })
})

describe('branchLocalDateTimeToUtcIso', () => {
  it('converts branch wall time to a UTC ISO instant that round-trips', () => {
    const iso = branchLocalDateTimeToUtcIso('2026-01-15T18:00', 'Asia/Damascus')
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Damascus',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso))
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
    let hour = Number(map.hour)
    if (hour === 24) hour = 0
    expect(map.year).toBe('2026')
    expect(map.month).toBe('01')
    expect(map.day).toBe('15')
    expect(hour).toBe(18)
    expect(map.minute).toBe('00')
  })
})

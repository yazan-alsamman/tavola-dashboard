import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { formatBranchLabel, listAllBranches, listBranches } from './branches'
import { listAllRestaurants, listRestaurants } from './restaurants'
import { __resetApiClientForTests } from './client'
import { ApiError } from './errors'
import { tokenStore } from './tokenStore'

const BASE = 'http://127.0.0.1:3999/api/v1'

const restaurant = {
  restaurantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Naranj',
  slug: 'naranj',
  logoId: null,
  coverImageId: null,
  description: null,
  cuisineType: null,
  averageRating: null,
  priceLevel: null,
  status: 'Active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const branch = {
  branchId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  restaurantId: restaurant.restaurantId,
  city: 'Damascus',
  district: 'Old City',
  address: 'Straight Street',
  latitude: null,
  longitude: null,
  countryCode: 'SY',
  currency: 'SYP',
  timezone: 'Asia/Damascus',
  phone: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const server = setupServer()

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

describe('restaurants API', () => {
  it('lists restaurants with pagination payload', async () => {
    server.use(
      http.get(`${BASE}/restaurants`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('page')).toBe('1')
        expect(url.searchParams.get('limit')).toBe('20')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [restaurant], page: 1, limit: 20, total: 1 },
          meta: {},
        })
      }),
    )

    const data = await listRestaurants()
    expect(data.items).toHaveLength(1)
    expect(data.items[0]?.restaurantId).toBe(restaurant.restaurantId)
    expect(data.total).toBe(1)
  })

  it('fetches all restaurant pages', async () => {
    server.use(
      http.get(`${BASE}/restaurants`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        if (page === 1) {
          return HttpResponse.json({
            success: true,
            message: 'OK',
            data: {
              items: [restaurant],
              page: 1,
              limit: 1,
              total: 2,
            },
            meta: {},
          })
        }
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [{ ...restaurant, restaurantId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Second' }],
            page: 2,
            limit: 1,
            total: 2,
          },
          meta: {},
        })
      }),
    )

    const all = await listAllRestaurants(1)
    expect(all).toHaveLength(2)
  })

  it('maps forbidden restaurant list to ApiError', async () => {
    server.use(
      http.get(`${BASE}/restaurants`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Forbidden',
            code: 'FORBIDDEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/restaurants',
          },
          { status: 403 },
        ),
      ),
    )

    await expect(listRestaurants()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })
})

describe('branches API', () => {
  it('lists branches under the restaurant path', async () => {
    let path = ''
    server.use(
      http.get(`${BASE}/restaurants/:restaurantId/branches`, ({ request }) => {
        path = new URL(request.url).pathname
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [branch], page: 1, limit: 20, total: 1 },
          meta: {},
        })
      }),
    )

    const data = await listBranches(restaurant.restaurantId)
    expect(path).toContain(`/restaurants/${restaurant.restaurantId}/branches`)
    expect(data.items[0]?.branchId).toBe(branch.branchId)
  })

  it('fetches all branch pages for a restaurant', async () => {
    server.use(
      http.get(`${BASE}/restaurants/:restaurantId/branches`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        if (page === 1) {
          return HttpResponse.json({
            success: true,
            message: 'OK',
            data: { items: [branch], page: 1, limit: 1, total: 2 },
            meta: {},
          })
        }
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [{ ...branch, branchId: 'dddddddd-dddd-dddd-dddd-dddddddddddd', district: 'Malki' }],
            page: 2,
            limit: 1,
            total: 2,
          },
          meta: {},
        })
      }),
    )

    const all = await listAllBranches(restaurant.restaurantId, 1)
    expect(all).toHaveLength(2)
  })

  it('formats branch labels without inventing a name field', () => {
    expect(formatBranchLabel(branch)).toBe('Damascus — Old City')
    expect(formatBranchLabel({ ...branch, district: null })).toBe('Damascus')
  })

  it('maps branch list errors to ApiError', async () => {
    server.use(
      http.get(`${BASE}/restaurants/:restaurantId/branches`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Not found',
            code: 'NOT_FOUND',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/restaurants/x/branches',
          },
          { status: 404 },
        ),
      ),
    )

    await expect(listBranches(restaurant.restaurantId)).rejects.toBeInstanceOf(ApiError)
  })
})

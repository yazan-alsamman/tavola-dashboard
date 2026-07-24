import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { __resetApiClientForTests } from './client'
import { tokenStore } from './tokenStore'
import {
  activateFloorPlan,
  createFloorPlan,
  listFloorPlans,
} from './floorPlans'
import {
  allowedTableStatusTransitions,
  changeTableStatus,
  createTable,
  deleteTable,
  getTable,
  listAllTablesByBranch,
  listTablesByFloorPlan,
  moveTable,
  tableToUpdateRequest,
  updateTable,
} from './tables'
import { isApiError } from './errors'
import { selectFloorPlanId } from '@/lib/floorPlanSelection'

const BASE = 'http://127.0.0.1:3999/api/v1'
const restaurantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const branchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const floorPlanId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const floorPlanId2 = 'ffffffff-ffff-ffff-ffff-ffffffffff02'
const tableId = 'tttttttt-tttt-tttt-tttt-tttttttttttt'

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

const floorPlan = {
  floorPlanId,
  branchId,
  name: 'Main Floor',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const table = {
  tableId,
  branchId,
  floorPlanId,
  tableNumber: 'T1',
  capacity: 4,
  floor: 1,
  positionX: 40,
  positionY: 80,
  width: 72,
  height: 72,
  rotation: 0,
  shape: 'Round' as const,
  layer: 0,
  indoor: true,
  vip: false,
  smoking: false,
  status: 'Available' as const,
  mergeGroupId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('listFloorPlans', () => {
  it('loads floor plans for restaurant/branch path', async () => {
    server.use(
      http.get(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
        () =>
          HttpResponse.json({
            success: true,
            message: 'OK',
            data: { items: [floorPlan] },
            meta: {},
          }),
      ),
    )

    const items = await listFloorPlans(restaurantId, branchId)
    expect(items).toHaveLength(1)
    expect(items[0]?.isActive).toBe(true)
    expect(items[0]?.name).toBe('Main Floor')
  })

  it('maps FORBIDDEN', async () => {
    server.use(
      http.get(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: 'Forbidden',
              code: 'FORBIDDEN',
              errors: [],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/api/v1/restaurants/.../floor-plans',
            },
            { status: 403 },
          ),
      ),
    )

    await expect(listFloorPlans(restaurantId, branchId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('floor plan mutations', () => {
  it('creates a floor plan with trimmed name only', async () => {
    server.use(
      http.post(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          expect(body).toEqual({ name: 'Patio' })
          expect(request.headers.get('Idempotency-Key')).toBeNull()
          return HttpResponse.json(
            {
              success: true,
              message: 'Created',
              data: {
                ...floorPlan,
                floorPlanId: floorPlanId2,
                name: 'Patio',
                isActive: true,
              },
              meta: {},
            },
            { status: 201 },
          )
        },
      ),
    )

    const created = await createFloorPlan(restaurantId, branchId, {
      name: '  Patio  ',
    })
    expect(created.name).toBe('Patio')
    expect(created.isActive).toBe(true)
  })

  it('maps validation error on create floor plan', async () => {
    server.use(
      http.post(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              errors: [{ path: 'name', message: 'required' }],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/floor-plans',
            },
            { status: 400 },
          ),
      ),
    )

    await expect(
      createFloorPlan(restaurantId, branchId, { name: '' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('activates a floor plan with PATCH and no body', async () => {
    server.use(
      http.patch(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/activate`,
        async ({ request }) => {
          const text = await request.text()
          expect(text === '' || text === 'null').toBe(true)
          return HttpResponse.json({
            success: true,
            message: 'OK',
            data: { ...floorPlan, isActive: true },
            meta: {},
          })
        },
      ),
    )

    const result = await activateFloorPlan(restaurantId, branchId, floorPlanId)
    expect(result.isActive).toBe(true)
  })

  it('maps FORBIDDEN on activate', async () => {
    server.use(
      http.patch(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/activate`,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: 'Forbidden',
              code: 'FORBIDDEN',
              errors: [],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/activate',
            },
            { status: 403 },
          ),
      ),
    )

    await expect(
      activateFloorPlan(restaurantId, branchId, floorPlanId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('tables API', () => {
  it('lists tables by floor plan with geometry DTO', async () => {
    server.use(
      http.get(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/tables`,
        ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('page')).toBe('1')
          return HttpResponse.json({
            success: true,
            message: 'OK',
            data: { items: [table], page: 1, limit: 20, total: 1 },
            meta: {},
          })
        },
      ),
    )

    const page = await listTablesByFloorPlan(restaurantId, branchId, floorPlanId)
    expect(page.items[0]?.positionX).toBe(40)
    expect(page.items[0]?.shape).toBe('Round')
    expect(page.items[0]?.status).toBe('Available')
  })

  it('paginates listAllTablesByBranch', async () => {
    server.use(
      http.get(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/tables`,
        ({ request }) => {
          const page = Number(new URL(request.url).searchParams.get('page'))
          if (page === 1) {
            return HttpResponse.json({
              success: true,
              message: 'OK',
              data: {
                items: [table],
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
              items: [
                {
                  ...table,
                  tableId: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu',
                  tableNumber: 'T2',
                },
              ],
              page: 2,
              limit: 1,
              total: 2,
            },
            meta: {},
          })
        },
      ),
    )

    const all = await listAllTablesByBranch(restaurantId, branchId, 1)
    expect(all).toHaveLength(2)
    expect(all.map((t) => t.tableNumber)).toEqual(['T1', 'T2'])
  })

  it('gets a table by id', async () => {
    server.use(
      http.get(`${BASE}/tables/${tableId}`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: table,
          meta: {},
        }),
      ),
    )

    const result = await getTable(tableId)
    expect(result.tableNumber).toBe('T1')
  })

  it('maps empty floor-plan table list', async () => {
    server.use(
      http.get(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/tables`,
        () =>
          HttpResponse.json({
            success: true,
            message: 'OK',
            data: { items: [], page: 1, limit: 20, total: 0 },
            meta: {},
          }),
      ),
    )

    const page = await listTablesByFloorPlan(restaurantId, branchId, floorPlanId)
    expect(page.total).toBe(0)
  })

  it('maps FORBIDDEN on branch tables', async () => {
    server.use(
      http.get(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/tables`,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: 'Forbidden',
              code: 'FORBIDDEN',
              errors: [],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/tables',
            },
            { status: 403 },
          ),
      ),
    )

    try {
      await listAllTablesByBranch(restaurantId, branchId)
      expect.unreachable()
    } catch (err) {
      expect(isApiError(err)).toBe(true)
      if (isApiError(err)) expect(err.code).toBe('FORBIDDEN')
    }
  })
})

describe('table mutations', () => {
  it('creates a table with exact DTO and no status', async () => {
    server.use(
      http.post(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/tables`,
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          expect(body.floorPlanId).toBe(floorPlanId)
          expect(body.tableNumber).toBe('T9')
          expect(body.capacity).toBe(2)
          expect(body.shape).toBe('Rectangle')
          expect(body).not.toHaveProperty('status')
          expect(request.headers.get('Idempotency-Key')).toBeNull()
          return HttpResponse.json(
            {
              success: true,
              message: 'Created',
              data: {
                ...table,
                tableNumber: 'T9',
                capacity: 2,
                shape: 'Rectangle',
              },
              meta: {},
            },
            { status: 201 },
          )
        },
      ),
    )

    const created = await createTable(restaurantId, branchId, {
      floorPlanId,
      tableNumber: '  T9  ',
      capacity: 2,
      shape: 'Rectangle',
      positionX: 10,
      positionY: 20,
    })
    expect(created.tableNumber).toBe('T9')
  })

  it('updates profile fields without floorPlanId or status', async () => {
    server.use(
      http.patch(`${BASE}/tables/${tableId}`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).not.toHaveProperty('floorPlanId')
        expect(body).not.toHaveProperty('status')
        expect(body.tableNumber).toBe('T1')
        expect(body.capacity).toBe(6)
        expect(body.positionX).toBe(15)
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...table, capacity: 6, positionX: 15 },
          meta: {},
        })
      }),
    )

    const updated = await updateTable(
      tableId,
      tableToUpdateRequest(table, { capacity: 6, positionX: 15 }),
    )
    expect(updated.capacity).toBe(6)
    expect(updated.positionX).toBe(15)
  })

  it('deletes a table and accepts 204', async () => {
    server.use(
      http.delete(
        `${BASE}/tables/${tableId}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(deleteTable(tableId)).resolves.toBeUndefined()
  })

  it('moves a table with only targetFloorPlanId', async () => {
    server.use(
      http.post(`${BASE}/tables/${tableId}/move`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({ targetFloorPlanId: floorPlanId2 })
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...table, floorPlanId: floorPlanId2 },
          meta: {},
        })
      }),
    )

    const moved = await moveTable(tableId, { targetFloorPlanId: floorPlanId2 })
    expect(moved.floorPlanId).toBe(floorPlanId2)
  })

  it('changes status with only status field', async () => {
    server.use(
      http.post(`${BASE}/tables/${tableId}/status`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({ status: 'Occupied' })
        expect(body).not.toHaveProperty('positionX')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...table, status: 'Occupied' },
          meta: {},
        })
      }),
    )

    const result = await changeTableStatus(tableId, { status: 'Occupied' })
    expect(result.status).toBe('Occupied')
  })

  it('exposes Allowed status transitions only', () => {
    expect(allowedTableStatusTransitions('Available')).toEqual([
      'Occupied',
      'Cleaning',
      'Disabled',
    ])
    expect(allowedTableStatusTransitions('Occupied')).toEqual(['Available'])
    expect(allowedTableStatusTransitions('Cleaning')).toEqual(['Available'])
    expect(allowedTableStatusTransitions('Disabled')).toEqual(['Available'])
  })

  it('maps CONFLICT on duplicate table number', async () => {
    server.use(
      http.post(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/tables`,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: 'Conflict',
              code: 'CONFLICT',
              errors: [],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/tables',
            },
            { status: 409 },
          ),
      ),
    )

    await expect(
      createTable(restaurantId, branchId, {
        floorPlanId,
        tableNumber: 'T1',
        capacity: 4,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

describe('domain-action boundaries', () => {
  it('tableToUpdateRequest never includes floorPlanId or status', () => {
    const body = tableToUpdateRequest(table, {
      capacity: 8,
      positionX: 99,
    })
    expect(body).not.toHaveProperty('floorPlanId')
    expect(body).not.toHaveProperty('status')
    expect(body.capacity).toBe(8)
    expect(body.positionX).toBe(99)
    expect(body.tableNumber).toBe('T1')
  })
})

describe('selectFloorPlanId', () => {
  it('prefers the active floor plan over persisted id', () => {
    const inactive = {
      ...floorPlan,
      floorPlanId: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
      isActive: false,
      name: 'Patio',
    }
    const chosen = selectFloorPlanId([inactive, floorPlan], inactive.floorPlanId)
    expect(chosen).toBe(floorPlan.floorPlanId)
  })

  it('uses persisted id when no active plan', () => {
    const a = {
      ...floorPlan,
      isActive: false,
      floorPlanId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
    }
    const b = {
      ...floorPlan,
      isActive: false,
      floorPlanId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
      name: 'B',
    }
    expect(selectFloorPlanId([a, b], b.floorPlanId)).toBe(b.floorPlanId)
  })

  it('rejects stale persisted ids', () => {
    const a = { ...floorPlan, isActive: false }
    expect(selectFloorPlanId([a], 'stale')).toBe(a.floorPlanId)
  })
})

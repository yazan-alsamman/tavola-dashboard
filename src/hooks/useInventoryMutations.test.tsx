/** @vitest-environment happy-dom */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { ReactNode } from 'react'
import { __resetApiClientForTests } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'
import {
  useActivateFloorPlanMutation,
  useChangeTableStatusMutation,
  useCreateFloorPlanMutation,
  useCreateTableMutation,
  useDeleteTableMutation,
  useMoveTableMutation,
  useUpdateTableMutation,
} from '@/hooks/useInventoryMutations'
import { inventoryKeys } from '@/lib/inventoryQueryKeys'

const BASE = 'http://127.0.0.1:3999/api/v1'
const restaurantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const branchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const otherBranchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb99'
const floorPlanId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const floorPlanId2 = 'ffffffff-ffff-ffff-ffff-ffffffffff02'
const tableId = 'tttttttt-tttt-tttt-tttt-tttttttttttt'

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

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('inventory mutation invalidation', () => {
  it('create floor plan invalidates only the captured branch floor-plan list', async () => {
    server.use(
      http.post(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans`,
        () =>
          HttpResponse.json(
            {
              success: true,
              message: 'Created',
              data: { ...floorPlan, name: 'New', isActive: true },
              meta: {},
            },
            { status: 201 },
          ),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateFloorPlanMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        restaurantId,
        branchId,
        name: 'New',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.floorPlans(restaurantId, branchId),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: inventoryKeys.floorPlans(restaurantId, otherBranchId),
    })
  })

  it('activate invalidates captured branch floor plans', async () => {
    server.use(
      http.patch(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/floor-plans/${floorPlanId}/activate`,
        () =>
          HttpResponse.json({
            success: true,
            message: 'OK',
            data: floorPlan,
            meta: {},
          }),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useActivateFloorPlanMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        restaurantId,
        branchId,
        floorPlanId,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.floorPlans(restaurantId, branchId),
    })
  })

  it('create table invalidates branch + target floor tables', async () => {
    server.use(
      http.post(
        `${BASE}/restaurants/${restaurantId}/branches/${branchId}/tables`,
        () =>
          HttpResponse.json(
            {
              success: true,
              message: 'Created',
              data: table,
              meta: {},
            },
            { status: 201 },
          ),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateTableMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        restaurantId,
        branchId,
        body: {
          floorPlanId,
          tableNumber: 'T1',
          capacity: 4,
        },
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByBranch(restaurantId, branchId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByFloorPlan(
        restaurantId,
        branchId,
        floorPlanId,
      ),
    })
  })

  it('update table invalidates detail + branch + floor using captured scope', async () => {
    server.use(
      http.patch(`${BASE}/tables/${tableId}`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...table, capacity: 8 },
          meta: {},
        }),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateTableMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        tableId,
        body: {
          tableNumber: 'T1',
          capacity: 8,
          indoor: true,
          vip: false,
          smoking: false,
          shape: 'Round',
        },
        scope: { restaurantId, branchId },
        floorPlanId,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.table(tableId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByBranch(restaurantId, branchId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByFloorPlan(
        restaurantId,
        branchId,
        floorPlanId,
      ),
    })
  })

  it('move invalidates source and target floors from captured ids', async () => {
    server.use(
      http.post(`${BASE}/tables/${tableId}/move`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...table, floorPlanId: floorPlanId2 },
          meta: {},
        }),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useMoveTableMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        tableId,
        body: { targetFloorPlanId: floorPlanId2 },
        scope: { restaurantId, branchId },
        sourceFloorPlanId: floorPlanId,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByFloorPlan(
        restaurantId,
        branchId,
        floorPlanId,
      ),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByFloorPlan(
        restaurantId,
        branchId,
        floorPlanId2,
      ),
    })
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByBranch(restaurantId, otherBranchId),
    })
  })

  it('status change invalidates detail + branch + floor', async () => {
    server.use(
      http.post(`${BASE}/tables/${tableId}/status`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...table, status: 'Occupied' },
          meta: {},
        }),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useChangeTableStatusMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        tableId,
        body: { status: 'Occupied' },
        scope: { restaurantId, branchId },
        floorPlanId,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.table(tableId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByBranch(restaurantId, branchId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByFloorPlan(
        restaurantId,
        branchId,
        floorPlanId,
      ),
    })
  })

  it('delete removes detail query and invalidates lists for captured scope', async () => {
    server.use(
      http.delete(
        `${BASE}/tables/${tableId}`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(inventoryKeys.table(tableId), table)
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteTableMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        tableId,
        scope: { restaurantId, branchId },
        floorPlanId,
      })
    })

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.table(tableId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByBranch(restaurantId, branchId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: inventoryKeys.tablesByFloorPlan(
        restaurantId,
        branchId,
        floorPlanId,
      ),
    })
  })
})

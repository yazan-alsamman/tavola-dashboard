import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createFloorPlanArea,
  deleteFloorPlanArea,
  updateFloorPlanArea,
  type FloorPlanAreaWriteRequest,
} from '@/api/floorPlanAreas'
import {
  activateFloorPlan,
  createFloorPlan,
} from '@/api/floorPlans'
import {
  changeTableStatus,
  createTable,
  deleteTable,
  mergeTables,
  moveTable,
  splitTable,
  updateTable,
  type ChangeTableStatusRequest,
  type CreateTableRequest,
  type MergeTablesRequest,
  type MoveTableRequest,
  type TableDto,
  type UpdateTableRequest,
} from '@/api/tables'
import { inventoryKeys } from '@/lib/inventoryQueryKeys'

/** Captured at mutation invoke — never re-read from live UI scope in onSuccess. */
export interface InventoryMutationScope {
  restaurantId: string
  branchId: string
}

async function invalidateFloorPlanList(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: InventoryMutationScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: inventoryKeys.floorPlans(scope.restaurantId, scope.branchId),
  })
}

async function invalidateBranchTables(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: InventoryMutationScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: inventoryKeys.tablesByBranch(scope.restaurantId, scope.branchId),
  })
}

async function invalidateFloorTables(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: InventoryMutationScope,
  floorPlanId: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: inventoryKeys.tablesByFloorPlan(
      scope.restaurantId,
      scope.branchId,
      floorPlanId,
    ),
  })
}

async function invalidateTableDetail(
  queryClient: ReturnType<typeof useQueryClient>,
  tableId: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: inventoryKeys.table(tableId),
  })
}

export function useCreateFloorPlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: InventoryMutationScope & { name: string }) =>
      createFloorPlan(input.restaurantId, input.branchId, { name: input.name }),
    onSuccess: async (_data, vars) => {
      await invalidateFloorPlanList(queryClient, vars)
    },
  })
}

export function useActivateFloorPlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: InventoryMutationScope & { floorPlanId: string },
    ) =>
      activateFloorPlan(
        input.restaurantId,
        input.branchId,
        input.floorPlanId,
      ),
    onSuccess: async (_data, vars) => {
      await invalidateFloorPlanList(queryClient, vars)
    },
  })
}

async function invalidateFloorPlanAreas(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: InventoryMutationScope,
  floorPlanId: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: inventoryKeys.floorPlanAreas(
      scope.restaurantId,
      scope.branchId,
      floorPlanId,
    ),
  })
}

export function useCreateFloorPlanAreaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: InventoryMutationScope & {
        floorPlanId: string
        body: FloorPlanAreaWriteRequest
      },
    ) =>
      createFloorPlanArea(
        input.restaurantId,
        input.branchId,
        input.floorPlanId,
        input.body,
      ),
    onSuccess: async (_area, vars) => {
      await invalidateFloorPlanAreas(queryClient, vars, vars.floorPlanId)
    },
  })
}

export function useUpdateFloorPlanAreaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: InventoryMutationScope & {
        floorPlanId: string
        areaId: string
        body: FloorPlanAreaWriteRequest
      },
    ) =>
      updateFloorPlanArea(
        input.restaurantId,
        input.branchId,
        input.floorPlanId,
        input.areaId,
        input.body,
      ),
    onSuccess: async (_area, vars) => {
      await invalidateFloorPlanAreas(queryClient, vars, vars.floorPlanId)
    },
  })
}

export function useDeleteFloorPlanAreaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: InventoryMutationScope & { floorPlanId: string; areaId: string },
    ) =>
      deleteFloorPlanArea(
        input.restaurantId,
        input.branchId,
        input.floorPlanId,
        input.areaId,
      ),
    onSuccess: async (_void, vars) => {
      await Promise.all([
        invalidateFloorPlanAreas(queryClient, vars, vars.floorPlanId),
        invalidateFloorTables(queryClient, vars, vars.floorPlanId),
        invalidateBranchTables(queryClient, vars),
      ])
    },
  })
}

export function useCreateTableMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: InventoryMutationScope & { body: CreateTableRequest },
    ) => createTable(input.restaurantId, input.branchId, input.body),
    onSuccess: async (table, vars) => {
      await Promise.all([
        invalidateBranchTables(queryClient, vars),
        invalidateFloorTables(queryClient, vars, table.floorPlanId),
        invalidateTableDetail(queryClient, table.tableId),
      ])
    },
  })
}

type TablesSnapshot = [readonly unknown[], TableDto[] | undefined][]

/**
 * Patches every cached table list holding `tableId` so the floor plan shows
 * the change at once (save in the background); returns what to roll back.
 */
function patchCachedTable(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: InventoryMutationScope,
  tableId: string,
  body: UpdateTableRequest,
): TablesSnapshot {
  const lists = queryClient.getQueriesData<TableDto[]>({
    queryKey: [...inventoryKeys.all, 'tables'],
  })
  const snapshot: TablesSnapshot = []
  for (const [key, data] of lists) {
    if (!data?.some((table) => table.tableId === tableId)) continue
    if (!key.includes(scope.restaurantId) || !key.includes(scope.branchId)) continue
    snapshot.push([key, data])
    queryClient.setQueryData<TableDto[]>(
      key,
      data.map((table) =>
        table.tableId === tableId ? { ...table, ...body } : table,
      ),
    )
  }
  return snapshot
}

const UPDATE_TABLE_KEY = [...inventoryKeys.all, 'updateTable'] as const

export function useUpdateTableMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: UPDATE_TABLE_KEY,
    mutationFn: (input: {
      tableId: string
      body: UpdateTableRequest
      scope: InventoryMutationScope
      /** Floor plan before update — for list invalidation. */
      floorPlanId: string
    }) => updateTable(input.tableId, input.body),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: [...inventoryKeys.all, 'tables'] })
      return { snapshot: patchCachedTable(queryClient, vars.scope, vars.tableId, vars.body) }
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: async (table, _err, vars) => {
      // Refetch only once the last queued save lands, so a later optimistic
      // move is never overwritten by an older server answer.
      if (queryClient.isMutating({ mutationKey: UPDATE_TABLE_KEY }) > 1) return
      await Promise.all([
        invalidateTableDetail(queryClient, vars.tableId),
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.floorPlanId),
        table && vars.floorPlanId !== table.floorPlanId
          ? invalidateFloorTables(queryClient, vars.scope, table.floorPlanId)
          : Promise.resolve(),
      ])
    },
  })
}

export function useDeleteTableMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      tableId: string
      scope: InventoryMutationScope
      floorPlanId: string
    }) => deleteTable(input.tableId),
    onSuccess: async (_void, vars) => {
      queryClient.removeQueries({
        queryKey: inventoryKeys.table(vars.tableId),
      })
      await Promise.all([
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.floorPlanId),
      ])
    },
  })
}

export function useMoveTableMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      tableId: string
      body: MoveTableRequest
      scope: InventoryMutationScope
      sourceFloorPlanId: string
    }) => moveTable(input.tableId, input.body),
    onSuccess: async (table, vars) => {
      await Promise.all([
        invalidateTableDetail(queryClient, vars.tableId),
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.sourceFloorPlanId),
        invalidateFloorTables(
          queryClient,
          vars.scope,
          vars.body.targetFloorPlanId,
        ),
        table.floorPlanId !== vars.body.targetFloorPlanId
          ? invalidateFloorTables(queryClient, vars.scope, table.floorPlanId)
          : Promise.resolve(),
      ])
    },
  })
}

export function useChangeTableStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      tableId: string
      body: ChangeTableStatusRequest
      scope: InventoryMutationScope
      floorPlanId: string
    }) => changeTableStatus(input.tableId, input.body),
    onSuccess: async (table: TableDto, vars) => {
      await Promise.all([
        invalidateTableDetail(queryClient, vars.tableId),
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.floorPlanId),
        table.floorPlanId !== vars.floorPlanId
          ? invalidateFloorTables(queryClient, vars.scope, table.floorPlanId)
          : Promise.resolve(),
      ])
    },
  })
}

export function useMergeTablesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      body: MergeTablesRequest
      scope: InventoryMutationScope
      floorPlanId: string
    }) => mergeTables(input.body),
    onSuccess: async (unit, vars) => {
      await Promise.all([
        ...unit.memberTableIds.map((id) => invalidateTableDetail(queryClient, id)),
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.floorPlanId),
      ])
    },
  })
}

export function useSplitTableMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      tableId: string
      scope: InventoryMutationScope
      floorPlanId: string
    }) => splitTable(input.tableId),
    onSuccess: async (unit, vars) => {
      await Promise.all([
        ...unit.memberTableIds.map((id) => invalidateTableDetail(queryClient, id)),
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.floorPlanId),
      ])
    },
  })
}

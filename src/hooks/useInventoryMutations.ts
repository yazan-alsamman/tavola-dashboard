import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  activateFloorPlan,
  createFloorPlan,
} from '@/api/floorPlans'
import {
  changeTableStatus,
  createTable,
  deleteTable,
  moveTable,
  updateTable,
  type ChangeTableStatusRequest,
  type CreateTableRequest,
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

export function useUpdateTableMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      tableId: string
      body: UpdateTableRequest
      scope: InventoryMutationScope
      /** Floor plan before update — for list invalidation. */
      floorPlanId: string
    }) => updateTable(input.tableId, input.body),
    onSuccess: async (table, vars) => {
      await Promise.all([
        invalidateTableDetail(queryClient, vars.tableId),
        invalidateBranchTables(queryClient, vars.scope),
        invalidateFloorTables(queryClient, vars.scope, vars.floorPlanId),
        vars.floorPlanId !== table.floorPlanId
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

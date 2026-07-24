import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listFloorPlans } from '@/api/floorPlans'
import { listAllTablesByBranch, listAllTablesByFloorPlan } from '@/api/tables'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { inventoryKeys } from '@/lib/inventoryQueryKeys'
import {
  floorPlanPersistence,
  selectFloorPlanId,
} from '@/lib/floorPlanSelection'

/**
 * Clears inventory cache when the authenticated identity changes or clears.
 */
export function useInventoryCacheIsolation(): void {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      void queryClient.removeQueries({ queryKey: inventoryKeys.all })
      floorPlanPersistence.clear()
    }
  }, [isAuthenticated, user?.userId, queryClient, user])
}

export function useFloorPlansQuery(enabled = true) {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  const restaurantId = selectedRestaurantId
  const branchId = selectedBranchId
  const ready = status === 'ready' && Boolean(restaurantId) && Boolean(branchId)

  return useQuery({
    queryKey: inventoryKeys.floorPlans(restaurantId ?? '', branchId ?? ''),
    queryFn: ({ signal }) => listFloorPlans(restaurantId!, branchId!, signal),
    enabled: enabled && ready,
  })
}

export function useBranchTablesQuery(enabled = true) {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  const restaurantId = selectedRestaurantId
  const branchId = selectedBranchId
  const ready = status === 'ready' && Boolean(restaurantId) && Boolean(branchId)

  return useQuery({
    queryKey: inventoryKeys.tablesByBranch(restaurantId ?? '', branchId ?? ''),
    queryFn: ({ signal }) =>
      listAllTablesByBranch(restaurantId!, branchId!, 100, signal),
    enabled: enabled && ready,
  })
}

export function useFloorPlanTablesQuery(floorPlanId: string | null, enabled = true) {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  const restaurantId = selectedRestaurantId
  const branchId = selectedBranchId
  const ready =
    status === 'ready' &&
    Boolean(restaurantId) &&
    Boolean(branchId) &&
    Boolean(floorPlanId)

  return useQuery({
    queryKey: inventoryKeys.tablesByFloorPlan(
      restaurantId ?? '',
      branchId ?? '',
      floorPlanId ?? '',
    ),
    queryFn: ({ signal }) =>
      listAllTablesByFloorPlan(
        restaurantId!,
        branchId!,
        floorPlanId!,
        100,
        signal,
      ),
    enabled: enabled && ready,
  })
}

/**
 * Floor-plan selection for the Floor Plan page: active → persisted → first.
 */
export function useSelectedFloorPlan() {
  const floorPlansQuery = useFloorPlansQuery()
  const [selectedId, setSelectedIdState] = useState<string | null>(null)

  const resolvedId = useMemo(() => {
    const list = floorPlansQuery.data
    if (!list) return null
    if (selectedId && list.some((fp) => fp.floorPlanId === selectedId)) {
      return selectedId
    }
    return selectFloorPlanId(list, floorPlanPersistence.get())
  }, [floorPlansQuery.data, selectedId])

  useEffect(() => {
    if (resolvedId) {
      floorPlanPersistence.set(resolvedId)
    }
  }, [resolvedId])

  const selectedFloorPlan = useMemo(
    () =>
      floorPlansQuery.data?.find((fp) => fp.floorPlanId === resolvedId) ?? null,
    [floorPlansQuery.data, resolvedId],
  )

  const selectFloorPlan = (floorPlanId: string): void => {
    setSelectedIdState(floorPlanId)
    floorPlanPersistence.set(floorPlanId)
  }

  return {
    floorPlansQuery,
    selectedFloorPlanId: resolvedId,
    selectedFloorPlan,
    selectFloorPlan,
  }
}

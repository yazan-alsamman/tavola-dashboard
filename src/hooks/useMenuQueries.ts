import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDefaultMenu, getMenu, listMenus } from '@/api/menus'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { menuKeys } from '@/lib/queryKeys'

/**
 * Clears menu cache when the authenticated identity changes or clears.
 */
export function useMenuCacheIsolation(): void {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      void queryClient.removeQueries({ queryKey: menuKeys.all })
    }
  }, [isAuthenticated, user?.userId, queryClient, user])
}

export function useMenusListQuery(enabled = true) {
  const { selectedRestaurantId, status } = useRestaurantScope()
  const restaurantId = selectedRestaurantId
  const ready = status === 'ready' && Boolean(restaurantId)

  return useQuery({
    queryKey: menuKeys.lists(restaurantId ?? ''),
    queryFn: ({ signal }) => listMenus(restaurantId!, signal),
    enabled: enabled && ready,
  })
}

export function useMenuQuery(menuId: string | null, enabled = true) {
  const { selectedRestaurantId, status } = useRestaurantScope()
  const restaurantId = selectedRestaurantId
  const ready =
    status === 'ready' && Boolean(restaurantId) && Boolean(menuId)

  return useQuery({
    queryKey: menuKeys.detail(restaurantId ?? '', menuId ?? ''),
    queryFn: ({ signal }) => getMenu(restaurantId!, menuId!, signal),
    enabled: enabled && ready,
  })
}

export function useDefaultMenuQuery(enabled = true) {
  const { selectedRestaurantId, status } = useRestaurantScope()
  const restaurantId = selectedRestaurantId
  const ready = status === 'ready' && Boolean(restaurantId)

  return useQuery({
    queryKey: menuKeys.default(restaurantId ?? ''),
    queryFn: ({ signal }) => getDefaultMenu(restaurantId!, signal),
    enabled: enabled && ready,
  })
}

/**
 * Menu list + selection for the Menu management page.
 */
export function useSelectedMenu() {
  const menusQuery = useMenusListQuery()
  const [selectedId, setSelectedIdState] = useState<string | null>(null)

  const resolvedId = useMemo(() => {
    const list = menusQuery.data
    if (!list?.length) return null
    if (selectedId && list.some((m) => m.menuId === selectedId)) {
      return selectedId
    }
    const defaultMenu = list.find((m) => m.isDefault)
    return defaultMenu?.menuId ?? list[0]?.menuId ?? null
  }, [menusQuery.data, selectedId])

  const menuDetailQuery = useMenuQuery(resolvedId, Boolean(resolvedId))

  const selectedMenuSummary = useMemo(
    () => menusQuery.data?.find((m) => m.menuId === resolvedId) ?? null,
    [menusQuery.data, resolvedId],
  )

  const selectMenu = (menuId: string): void => {
    setSelectedIdState(menuId)
  }

  return {
    menusQuery,
    menuDetailQuery,
    selectedMenuId: resolvedId,
    selectedMenuSummary,
    selectedMenu: menuDetailQuery.data ?? null,
    selectMenu,
  }
}

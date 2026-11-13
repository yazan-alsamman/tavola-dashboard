import { useQuery } from '@tanstack/react-query'
import { getBranchWorkingHours } from '@/api/branches'
import { listMenus } from '@/api/menus'
import { listRestaurantGallery } from '@/api/restaurants'
import { listTablesByBranch } from '@/api/tables'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useEmployeesQuery } from '@/hooks/useEmployeeQueries'
import { computeSetupProgress, type SetupProgress } from '@/lib/setupProgress'

function setupKey(restaurantId: string, branchId: string, part: string) {
  return ['restaurants', restaurantId, 'branches', branchId, 'setup', part] as const
}

/**
 * The setup guide's facts for the selected restaurant and branch. Every read
 * is an existing dashboard endpoint; `null` while any of them is loading.
 */
export function useSetupProgress(enabled: boolean): SetupProgress | null {
  const { selectedRestaurant, selectedRestaurantId, selectedBranch, branches } =
    useRestaurantScope()
  const restaurantId = enabled ? selectedRestaurantId : null
  const branchId = selectedBranch?.branchId ?? ''
  const withBranch = Boolean(restaurantId && branchId)

  const hours = useQuery({
    queryKey: setupKey(restaurantId ?? '', branchId, 'hours'),
    queryFn: () => getBranchWorkingHours(restaurantId!, branchId),
    enabled: withBranch,
  })
  const tables = useQuery({
    queryKey: setupKey(restaurantId ?? '', branchId, 'tables'),
    queryFn: ({ signal }) => listTablesByBranch(restaurantId!, branchId, { limit: 1 }, signal),
    enabled: withBranch,
  })
  const gallery = useQuery({
    queryKey: setupKey(restaurantId ?? '', branchId, 'gallery'),
    queryFn: () => listRestaurantGallery(restaurantId!, branchId),
    enabled: withBranch,
  })
  const menus = useQuery({
    queryKey: ['restaurants', restaurantId ?? '', 'setup', 'menus'],
    queryFn: ({ signal }) => listMenus(restaurantId!, signal),
    enabled: Boolean(restaurantId),
  })
  const employees = useEmployeesQuery(restaurantId)

  if (!restaurantId || !selectedRestaurant) return null
  const branchReads = withBranch ? [hours, tables, gallery] : []
  if ([...branchReads, menus, employees].some((query) => query.isPending && query.fetchStatus !== 'idle')) {
    return null
  }

  return computeSetupProgress({
    hasArabicName: Boolean(selectedRestaurant.nameAr?.trim()),
    hasEnglishName: Boolean(selectedRestaurant.nameEn?.trim()),
    hasDescription: Boolean(
      selectedRestaurant.descriptionAr?.trim() || selectedRestaurant.descriptionEn?.trim(),
    ),
    hasCuisine: Boolean(selectedRestaurant.cuisineType?.trim()),
    branchCount: branches.length,
    hasHours: (hours.data?.entries.length ?? 0) > 0,
    hasVenueType: Boolean(selectedBranch?.venueType),
    tableCount: tables.data?.total ?? 0,
    menuCount: menus.data?.length ?? 0,
    hasPhotos: Boolean(selectedBranch?.coverImageId) || (gallery.data?.length ?? 0) > 0,
    employeeCount: employees.data?.length ?? 0,
  })
}

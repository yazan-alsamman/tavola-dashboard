import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignEmployeeToBranch,
  inviteEmployeeForBranch,
  listEmployees,
  listRestaurantRoles,
  removeEmployee,
  type InviteEmployeeForBranchInput,
} from '@/api/employees'
import { employeeKeys } from '@/lib/queryKeys'

export function useEmployeesQuery(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: employeeKeys.restaurant(restaurantId ?? ''),
    queryFn: ({ signal }) => listEmployees(restaurantId!, signal),
    enabled: Boolean(restaurantId),
  })
}

export function useRestaurantRolesQuery(restaurantId: string | null | undefined) {
  return useQuery({
    queryKey: employeeKeys.roles(restaurantId ?? ''),
    queryFn: ({ signal }) => listRestaurantRoles(restaurantId!, signal),
    enabled: Boolean(restaurantId),
    staleTime: 10 * 60_000,
  })
}

function useInvalidateEmployees() {
  const queryClient = useQueryClient()
  return (restaurantId: string) =>
    queryClient.invalidateQueries({ queryKey: employeeKeys.restaurant(restaurantId), exact: true })
}

export function useInviteEmployeeMutation() {
  const invalidate = useInvalidateEmployees()
  return useMutation({
    mutationFn: (input: { restaurantId: string } & InviteEmployeeForBranchInput) => {
      const { restaurantId, ...body } = input
      return inviteEmployeeForBranch(restaurantId, body)
    },
    onSuccess: (_data, vars) => invalidate(vars.restaurantId),
  })
}

export function useAssignEmployeeBranchMutation() {
  const invalidate = useInvalidateEmployees()
  return useMutation({
    mutationFn: (input: { restaurantId: string; employeeId: string; branchId: string }) =>
      assignEmployeeToBranch(input.restaurantId, input.employeeId, { branchId: input.branchId }),
    onSuccess: (_data, vars) => invalidate(vars.restaurantId),
  })
}

export function useRemoveEmployeeMutation() {
  const invalidate = useInvalidateEmployees()
  return useMutation({
    mutationFn: (input: { restaurantId: string; employeeId: string }) =>
      removeEmployee(input.restaurantId, input.employeeId),
    onSuccess: (_data, vars) => invalidate(vars.restaurantId),
  })
}

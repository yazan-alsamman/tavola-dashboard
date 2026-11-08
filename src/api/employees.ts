import { apiRequest } from './client'

/** Live `EmployeeResponseDto`. Empty `assignedBranchIds` means restaurant-wide scope. */
export type EmployeeStatus = 'Invited' | 'Active' | 'Deactivated'

export interface EmployeeDto {
  employeeId: string
  restaurantId: string
  roleId: string
  userId?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  status: EmployeeStatus
  assignedBranchIds: string[]
  createdAt: string
  updatedAt: string
}

export interface InviteEmployeeRequest {
  roleId: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
}

export interface AssignEmployeeRoleRequest {
  roleId: string
}

export interface AssignEmployeeBranchRequest {
  branchId: string
}

/** A role an employee of this restaurant can hold (seeded, restaurant-scoped). */
export interface RoleDto {
  roleId: string
  name: string
  slug: string
  description: string
}

/** Owner/Admin. Every non-removed employee, oldest first. */
export async function listEmployees(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<EmployeeDto[]> {
  const data = await apiRequest<{ items: EmployeeDto[] }>(
    `/restaurants/${restaurantId}/employees`,
    { signal },
  )
  return data.items
}

/** Owner/Admin. Restaurant-scoped roles, ordered by name. */
export async function listRestaurantRoles(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<RoleDto[]> {
  const data = await apiRequest<{ items: RoleDto[] }>(`/restaurants/${restaurantId}/roles`, {
    signal,
  })
  return data.items
}

/** Invites an employee (status Invited, no linked User until first login). */
export async function inviteEmployee(
  restaurantId: string,
  body: InviteEmployeeRequest,
): Promise<EmployeeDto> {
  return apiRequest<EmployeeDto>(`/restaurants/${restaurantId}/employees`, {
    method: 'POST',
    body,
  })
}

export async function assignEmployeeRole(
  restaurantId: string,
  employeeId: string,
  body: AssignEmployeeRoleRequest,
): Promise<EmployeeDto> {
  return apiRequest<EmployeeDto>(
    `/restaurants/${restaurantId}/employees/${employeeId}/role`,
    {
      method: 'POST',
      body,
    },
  )
}

/** Idempotent — already-assigned branch is a no-op. */
export async function assignEmployeeToBranch(
  restaurantId: string,
  employeeId: string,
  body: AssignEmployeeBranchRequest,
): Promise<EmployeeDto> {
  return apiRequest<EmployeeDto>(
    `/restaurants/${restaurantId}/employees/${employeeId}/branches`,
    {
      method: 'POST',
      body,
    },
  )
}

/** Idempotent — returns 200 (not 204). */
export async function removeEmployeeFromBranch(
  restaurantId: string,
  employeeId: string,
  branchId: string,
): Promise<EmployeeDto | void> {
  return apiRequest(
    `/restaurants/${restaurantId}/employees/${employeeId}/branches/${branchId}`,
    { method: 'DELETE' },
  )
}

export interface InviteEmployeeForBranchInput extends InviteEmployeeRequest {
  branchId: string
}

/**
 * Invite, then assign the chosen branch so the employee can open that branch's bookings.
 * If the assign call fails, the invited row is still returned.
 */
export async function inviteEmployeeForBranch(
  restaurantId: string,
  input: InviteEmployeeForBranchInput,
): Promise<
  | { employee: EmployeeDto; branchAssigned: true }
  | { employee: EmployeeDto; branchAssigned: false; error: unknown }
> {
  const employee = await inviteEmployee(restaurantId, {
    roleId: input.roleId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    ...(input.phone ? { phone: input.phone } : {}),
  })
  try {
    const assigned = await assignEmployeeToBranch(restaurantId, employee.employeeId, {
      branchId: input.branchId,
    })
    return { employee: assigned, branchAssigned: true }
  } catch (error) {
    return { employee, branchAssigned: false, error }
  }
}

/** Soft-delete. Returns 200. Rejected with 409 if last Manager. */
export async function removeEmployee(
  restaurantId: string,
  employeeId: string,
): Promise<EmployeeDto | void> {
  return apiRequest(`/restaurants/${restaurantId}/employees/${employeeId}`, {
    method: 'DELETE',
  })
}

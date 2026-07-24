import { apiRequest } from './client'

/** Employee DTO fields confirmed from invite response + Postman capture. */
export interface EmployeeDto {
  employeeId: string
  restaurantId?: string
  roleId?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  status?: string
  createdAt?: string
  updatedAt?: string
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

/**
 * Invites an employee (status Invited, no linked User until first login).
 * There is no list-employees endpoint in the Postman collection yet.
 */
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

/** Soft-delete. Returns 200. Rejected with 409 if last Manager. */
export async function removeEmployee(
  restaurantId: string,
  employeeId: string,
): Promise<EmployeeDto | void> {
  return apiRequest(`/restaurants/${restaurantId}/employees/${employeeId}`, {
    method: 'DELETE',
  })
}

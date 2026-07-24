import { useAuth } from '@/context/AuthContext'
import type { OrgRole } from '@/types/auth'

/**
 * Advisory UI check against employee permission slugs from the access JWT claims.
 * Not an authorization boundary — the backend re-checks every request.
 */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuth()
  return user?.permissions.includes(permission) ?? false
}

/**
 * Advisory UI check against organization role from login / JWT claims.
 */
export function useHasOrgRole(role: OrgRole): boolean {
  const { user } = useAuth()
  return user?.organization?.role === role
}

/**
 * Floor-plan layout editing: org Owner/Admin, or explicit tables:manage permission.
 */
export function useCanEditFloorLayout(): boolean {
  const { user } = useAuth()
  if (!user) return false
  const orgRole = user.organization?.role
  if (orgRole === 'Owner' || orgRole === 'Admin') return true
  return user.permissions.includes('tables:manage')
}

/**
 * Advisory UI gate for live FloorPlan/Table mutations.
 * Backend inventory routes require organization Owner/Admin — not Employee RBAC.
 * A decoded role is not security enforcement; 403 remains authoritative.
 */
export function useCanManageInventory(): boolean {
  const { user } = useAuth()
  const role = user?.organization?.role
  return role === 'Owner' || role === 'Admin'
}

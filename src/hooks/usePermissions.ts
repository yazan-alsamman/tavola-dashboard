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

/**
 * Advisory UI gate for offer CRUD / publish / delete.
 * Backend routes require organization Owner/Admin — optional `offers:manage` slug.
 */
export function useCanManageOffers(): boolean {
  const { user } = useAuth()
  if (!user) return false
  const orgRole = user.organization?.role
  if (orgRole === 'Owner' || orgRole === 'Admin') return true
  return user.permissions.includes('offers:manage')
}

/**
 * Advisory UI gate for menu management mutations.
 * Org Owner/Admin, or explicit menu:manage permission from JWT claims.
 */
/**
 * Owner/Admin: replies, opens a review for re-rating, and reads guests'
 * private notes (backend ADR-045). Nobody on the restaurant side deletes a
 * review.
 */
export function useCanManageReviews(): boolean {
  const { user } = useAuth()
  const orgRole = user?.organization?.role
  return orgRole === 'Owner' || orgRole === 'Admin'
}

export function useCanManageMenu(): boolean {
  const { user } = useAuth()
  if (!user) return false
  const orgRole = user.organization?.role
  if (orgRole === 'Owner' || orgRole === 'Admin') return true
  return user.permissions.includes('menu:manage')
}

/** Backend ADR-053: the Front Desk role reads only today's reservations. */
export const TODAY_ONLY_PERMISSION = 'reservations:today-only'

/** Advisory: the server already limits the list; this only hides the other windows. */
export function useIsTodayOnly(): boolean {
  return useHasPermission(TODAY_ONLY_PERMISSION)
}

import type { LoginResponseData } from '@/api/auth'
import { normalizeOrgRole } from '@/api/auth'
import type { UserProfile } from '@/api/users'
import type { AccessTokenClaims } from '@/lib/accessTokenClaims'
import {
  buildDisplayName,
  buildInitials,
  type ActorType,
  type AuthIdentity,
  type AuthOrganization,
  type UserAccountStatus,
} from '@/types/auth'

function organizationFromLogin(
  login: LoginResponseData,
  claims: AccessTokenClaims | null,
): AuthOrganization | null {
  if (login.organization) {
    return {
      organizationId: login.organization.organizationId,
      name: login.organization.name,
      slug: login.organization.slug,
      role: normalizeOrgRole(login.organization.role) ?? claims?.orgRole ?? null,
    }
  }

  if (claims?.organizationId) {
    return {
      organizationId: claims.organizationId,
      name: null,
      slug: null,
      role: claims.orgRole,
    }
  }

  return null
}

function organizationFromClaims(claims: AccessTokenClaims | null): AuthOrganization | null {
  if (!claims?.organizationId) return null
  return {
    organizationId: claims.organizationId,
    name: null,
    slug: null,
    role: claims.orgRole,
  }
}

function pickActorType(
  preferred: ActorType | null | undefined,
  claims: AccessTokenClaims | null,
): ActorType {
  return preferred ?? claims?.actorType ?? 'User'
}

/**
 * Build canonical identity after a successful login (tokens already in tokenStore).
 */
export function buildIdentityFromLogin(
  login: LoginResponseData,
  profile: UserProfile | null,
  claims: AccessTokenClaims | null,
): AuthIdentity {
  const firstName = profile?.firstName ?? login.user.firstName
  const lastName = profile?.lastName ?? login.user.lastName
  const email = profile?.email ?? login.user.email

  return {
    userId: login.user.userId,
    email,
    firstName: firstName ?? '',
    lastName: lastName ?? '',
    displayName: buildDisplayName(firstName ?? '', lastName ?? '', email),
    initials: buildInitials(firstName ?? '', lastName ?? '', email),
    status: login.user.status,
    emailVerified: login.user.emailVerified,
    actorType: pickActorType(login.actorType, claims),
    organization: organizationFromLogin(login, claims),
    sessionId: login.sessionId,
    permissionsVersion: login.permissionsVersion,
    permissions: claims?.permissions ?? [],
    employeeId: claims?.employeeId ?? null,
    restaurantId: claims?.restaurantId ?? null,
    branchIds: claims?.branchIds ?? [],
    language: profile?.language ?? null,
    phone: profile?.phone ?? null,
    requiresPasswordChange: login.requiresPasswordChange,
  }
}

/**
 * Build identity after session restore (refresh + optional /users/me).
 * Login DTO is unavailable; JWT claims + profile are the sources.
 */
export function buildIdentityFromSession(
  profile: UserProfile | null,
  claims: AccessTokenClaims | null,
  meta?: {
    actorType?: ActorType
    sessionId?: string
    permissionsVersion?: number
  },
): AuthIdentity {
  const firstName = profile?.firstName ?? ''
  const lastName = profile?.lastName ?? ''
  const email = profile?.email ?? ''
  const userId = profile?.userId ?? claims?.sub ?? ''

  return {
    userId,
    email,
    firstName,
    lastName,
    displayName: buildDisplayName(firstName, lastName, email),
    initials: buildInitials(firstName, lastName, email),
    status: null as UserAccountStatus | null,
    emailVerified: null,
    actorType: pickActorType(meta?.actorType, claims),
    organization: organizationFromClaims(claims),
    sessionId: meta?.sessionId ?? claims?.sessionId ?? null,
    permissionsVersion: meta?.permissionsVersion ?? claims?.permissionsVersion ?? null,
    permissions: claims?.permissions ?? [],
    employeeId: claims?.employeeId ?? null,
    restaurantId: claims?.restaurantId ?? null,
    branchIds: claims?.branchIds ?? [],
    language: profile?.language ?? null,
    phone: profile?.phone ?? null,
    requiresPasswordChange: false,
  }
}

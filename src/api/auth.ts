import { apiRequest } from './client'
import type {
  ActorType,
  DeviceType,
  OrgRole,
  UserAccountStatus,
} from '@/types/auth'
import { isOrgRole } from '@/types/auth'

export interface LoginRequest {
  email: string
  password: string
  deviceName?: string
  deviceType?: DeviceType
}

export interface LoginUserDto {
  userId: string
  email: string
  firstName: string
  lastName: string
  status: UserAccountStatus
  emailVerified: boolean
}

export interface LoginOrganizationDto {
  organizationId: string
  name: string
  slug: string
  role: string
}

export interface LoginResponseData {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
  user: LoginUserDto
  organization: LoginOrganizationDto | null
  sessionId: string
  sessionVersion: number
  permissionsVersion: number
  actorType: ActorType
  requiresPasswordChange: boolean
}

export interface RefreshResponseData {
  accessToken: string
  refreshToken: string
  tokenType: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
  sessionId: string
  sessionVersion: number
  permissionsVersion: number
  actorType: ActorType
  issuedAt: string
  serverTime: string
}

export function normalizeOrgRole(role: string | null | undefined): OrgRole | null {
  if (typeof role !== 'string') return null
  return isOrgRole(role) ? role : null
}

/**
 * Staff / organization-member login (dashboard path).
 * Public endpoint — does not attach an access token.
 */
export async function login(request: LoginRequest): Promise<LoginResponseData> {
  return apiRequest<LoginResponseData>('/auth/login', {
    method: 'POST',
    auth: false,
    body: {
      email: request.email,
      password: request.password,
      deviceName: request.deviceName ?? 'Tavola Dashboard',
      deviceType: request.deviceType ?? 'web',
    },
  })
}

/**
 * Revoke the current device session. Requires a valid access token.
 * Backend returns 204 No Content.
 */
export async function logout(): Promise<void> {
  await apiRequest<undefined>('/auth/logout', {
    method: 'POST',
  })
}

/**
 * Revoke all sessions for the user. Requires a valid access token.
 * Backend returns 204 No Content.
 */
export async function logoutAll(): Promise<void> {
  await apiRequest<undefined>('/auth/logout-all', {
    method: 'POST',
  })
}

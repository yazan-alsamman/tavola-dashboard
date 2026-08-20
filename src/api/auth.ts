import { clearForcedLogoutPending } from '@/lib/leaveGuard'
import type {
  ActorType,
  DeviceType,
  OrgRole,
  UserAccountStatus,
} from '@/types/auth'
import { isOrgRole } from '@/types/auth'
import { apiRequest, getApiBaseUrl } from './client'
import { tokenStore } from './tokenStore'

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
 * Best-effort logout for tab/window close (`keepalive` fetch).
 * Clears local tokens immediately so a reopen does not restore the session,
 * and revokes the server session when the access token is still available.
 */
export function logoutKeepalive(): void {
  const accessToken = tokenStore.getAccessToken()
  tokenStore.clear()
  clearForcedLogoutPending()
  if (!accessToken || typeof fetch === 'undefined') return

  try {
    const base = getApiBaseUrl().replace(/\/+$/, '')
    const absoluteBase = /^https?:\/\//i.test(base)
      ? base
      : `${typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1'}${base}`
    const url = `${absoluteBase}/auth/logout`
    void fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      keepalive: true,
    })
  } catch {
    // Unload path — ignore network failures.
  }
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

/** Always returns a generic acceptance (does not reveal whether the email exists). */
export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<unknown>('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: { email },
  })
}

/** Consumes a single-use reset token and sets a new password. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await apiRequest<unknown>('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { token, newPassword },
  })
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/** Partial token refresh after password change (access token always rotated). */
export interface ChangePasswordResponse {
  accessToken: string
  refreshToken?: string
}

/**
 * Changes password for the authenticated user.
 * Rotates session version; stores any returned tokens in `tokenStore`.
 */
export async function changePassword(
  request: ChangePasswordRequest,
): Promise<ChangePasswordResponse> {
  const data = await apiRequest<ChangePasswordResponse>('/auth/change-password', {
    method: 'POST',
    body: {
      currentPassword: request.currentPassword,
      newPassword: request.newPassword,
    },
  })

  if (data.accessToken) {
    if (data.refreshToken) {
      tokenStore.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
    } else {
      tokenStore.setAccessToken(data.accessToken)
    }
  }

  return data
}

export interface AuthSessionDto {
  sessionId: string
  isCurrentSession: boolean
  deviceName?: string | null
  deviceType?: string | null
  createdAt?: string
  lastSeenAt?: string | null
  expiresAt?: string | null
}

export interface ListSessionsResponse {
  sessions: AuthSessionDto[]
}

export async function listSessions(): Promise<ListSessionsResponse> {
  return apiRequest<ListSessionsResponse>('/auth/sessions')
}

/** Revokes a session by id. Returns 204 No Content. */
export async function revokeSession(sessionId: string): Promise<void> {
  await apiRequest<undefined>(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

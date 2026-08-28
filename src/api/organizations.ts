import { apiRequest } from './client'
import type { PaginatedData } from './types'
import type { OrgRole } from '@/types/auth'

export interface OrganizationSubscriptionDto {
  [key: string]: unknown
}

export interface OrganizationSubscriptionUsageDto {
  [key: string]: unknown
}

export type OrganizationMemberStatus = 'Active' | 'Removed' | string

export interface OrganizationMemberDto {
  id: string
  userId?: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  role: OrgRole | string
  status?: OrganizationMemberStatus
  createdAt?: string
  [key: string]: unknown
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired' | string

/** Inviteable roles — Owner is not invitation-grantable (use transfer). */
export type OrganizationInviteRole = 'Admin' | 'Billing' | 'Staff'

export interface OrganizationInvitationDto {
  id: string
  email: string
  role: OrganizationInviteRole | string
  status: InvitationStatus
  createdAt?: string
  expiresAt?: string | null
  [key: string]: unknown
}

export interface IssueOrganizationInvitationRequest {
  email: string
  role: OrganizationInviteRole
}

export interface AcceptOrganizationInvitationRequest {
  firstName?: string
  lastName?: string
  password?: string
}

export async function getOrganizationSubscription(
  signal?: AbortSignal,
): Promise<OrganizationSubscriptionDto> {
  return apiRequest<OrganizationSubscriptionDto>('/organizations/subscription', {
    signal,
  })
}

export async function getOrganizationSubscriptionUsage(
  signal?: AbortSignal,
): Promise<OrganizationSubscriptionUsageDto> {
  return apiRequest<OrganizationSubscriptionUsageDto>(
    '/organizations/subscription/usage',
    { signal },
  )
}

export async function listOrganizationMembers(
  params: { page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<OrganizationMemberDto>> {
  return apiRequest<PaginatedData<OrganizationMemberDto>>('/organizations/members', {
    query: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 20,
    },
    signal,
  })
}

export async function changeOrganizationMemberRole(
  memberId: string,
  role: OrganizationInviteRole | 'Admin' | 'Billing' | 'Staff',
): Promise<OrganizationMemberDto> {
  return apiRequest<OrganizationMemberDto>(`/organizations/members/${memberId}/role`, {
    method: 'PATCH',
    body: { role },
  })
}

export async function removeOrganizationMember(memberId: string): Promise<void> {
  await apiRequest<undefined>(`/organizations/members/${memberId}`, {
    method: 'DELETE',
  })
}

/** Owner only — target member becomes the new Owner. */
export async function transferOrganizationOwnership(
  memberId: string,
): Promise<OrganizationMemberDto | void> {
  return apiRequest(`/organizations/members/${memberId}/transfer-ownership`, {
    method: 'POST',
  })
}

export async function listOrganizationInvitations(
  params: { page?: number; pageSize?: number } = {},
  signal?: AbortSignal,
): Promise<PaginatedData<OrganizationInvitationDto>> {
  return apiRequest<PaginatedData<OrganizationInvitationDto>>(
    '/organizations/invitations',
    {
      query: {
        page: params.page ?? 1,
        limit: params.pageSize ?? 20,
      },
      signal,
    },
  )
}

export async function issueOrganizationInvitation(
  body: IssueOrganizationInvitationRequest,
): Promise<OrganizationInvitationDto> {
  return apiRequest<OrganizationInvitationDto>('/organizations/invitations', {
    method: 'POST',
    body: {
      email: body.email,
      role: body.role,
    },
  })
}

export async function revokeOrganizationInvitation(
  invitationId: string,
): Promise<void> {
  await apiRequest<undefined>(`/organizations/invitations/${invitationId}`, {
    method: 'DELETE',
  })
}

/**
 * Public accept — security is the opaque token.
 * Existing accounts: send Bearer for that email (name/password ignored).
 * New accounts: require firstName, lastName, password.
 */
export async function acceptOrganizationInvitation(
  invitationToken: string,
  body: AcceptOrganizationInvitationRequest = {},
): Promise<unknown> {
  return apiRequest(`/invitations/${invitationToken}/accept`, {
    method: 'POST',
    body: {
      ...(body.firstName ? { firstName: body.firstName } : {}),
      ...(body.lastName ? { lastName: body.lastName } : {}),
      ...(body.password ? { password: body.password } : {}),
    },
  })
}

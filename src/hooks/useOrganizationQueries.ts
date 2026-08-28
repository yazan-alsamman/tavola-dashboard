import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrganizationSubscription,
  getOrganizationSubscriptionUsage,
  listOrganizationInvitations,
  listOrganizationMembers,
  issueOrganizationInvitation,
  revokeOrganizationInvitation,
  changeOrganizationMemberRole,
  removeOrganizationMember,
  transferOrganizationOwnership,
  type OrganizationInviteRole,
} from '@/api/organizations'
import { useAuth } from '@/context/AuthContext'
import { orgKeys } from '@/lib/queryKeys'
import { normalizePaginated } from '@/lib/pagination'

function useCanManageOrganization(): boolean {
  const { user } = useAuth()
  const role = user?.organization?.role
  return role === 'Owner' || role === 'Admin'
}

function useIsOrganizationOwner(): boolean {
  const { user } = useAuth()
  return user?.organization?.role === 'Owner'
}

export function useOrganizationSubscriptionQuery(enabled = true) {
  const canView = useCanManageOrganization()

  return useQuery({
    queryKey: orgKeys.subscription(),
    queryFn: ({ signal }) => getOrganizationSubscription(signal),
    enabled: enabled && canView,
  })
}

export function useOrganizationUsageQuery(enabled = true) {
  const canView = useCanManageOrganization()

  return useQuery({
    queryKey: orgKeys.usage(),
    queryFn: ({ signal }) => getOrganizationSubscriptionUsage(signal),
    enabled: enabled && canView,
  })
}

export function useOrganizationMembersQuery(page = 1, pageSize = 20, enabled = true) {
  const canView = useCanManageOrganization()

  return useQuery({
    queryKey: orgKeys.members(page, pageSize),
    queryFn: async ({ signal }) => {
      const data = await listOrganizationMembers({ page, pageSize }, signal)
      return normalizePaginated(data)
    },
    enabled: enabled && canView,
  })
}

export function useOrganizationInvitationsQuery(
  page = 1,
  pageSize = 20,
  enabled = true,
) {
  const canView = useCanManageOrganization()

  return useQuery({
    queryKey: orgKeys.invitations(page, pageSize),
    queryFn: async ({ signal }) => {
      const data = await listOrganizationInvitations({ page, pageSize }, signal)
      return normalizePaginated(data)
    },
    enabled: enabled && canView,
  })
}

export function useIssueOrganizationInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; role: OrganizationInviteRole }) =>
      issueOrganizationInvitation(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.all })
    },
  })
}

export function useRevokeOrganizationInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => revokeOrganizationInvitation(invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.all })
    },
  })
}

export function useChangeOrganizationMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { memberId: string; role: OrganizationInviteRole }) =>
      changeOrganizationMemberRole(input.memberId, input.role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.all })
    },
  })
}

export function useRemoveOrganizationMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeOrganizationMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.all })
    },
  })
}

export function useTransferOrganizationOwnership() {
  const queryClient = useQueryClient()
  const isOwner = useIsOrganizationOwner()
  return useMutation({
    mutationFn: (memberId: string) => {
      if (!isOwner) {
        return Promise.reject(new Error('Only the organization owner can transfer ownership.'))
      }
      return transferOrganizationOwnership(memberId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orgKeys.all })
    },
  })
}

export { useCanManageOrganization, useIsOrganizationOwner }

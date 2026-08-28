import { useState } from 'react'
import type { OrganizationInviteRole } from '@/api/organizations'
import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import {
  useChangeOrganizationMemberRole,
  useIssueOrganizationInvitation,
  useIsOrganizationOwner,
  useOrganizationInvitationsQuery,
  useOrganizationMembersQuery,
  useRemoveOrganizationMember,
  useRevokeOrganizationInvitation,
  useTransferOrganizationOwnership,
} from '@/hooks/useOrganizationQueries'

const INVITE_ROLES: OrganizationInviteRole[] = ['Admin', 'Billing', 'Staff']

export function SettingsTeamPanel() {
  const { t } = useLocale()
  const { toast } = useToast()
  const isOwner = useIsOrganizationOwner()
  const membersQuery = useOrganizationMembersQuery(1, 50, true)
  const invitationsQuery = useOrganizationInvitationsQuery(1, 50, true)
  const issueInvite = useIssueOrganizationInvitation()
  const revokeInvite = useRevokeOrganizationInvitation()
  const changeRole = useChangeOrganizationMemberRole()
  const removeMember = useRemoveOrganizationMember()
  const transferOwnership = useTransferOrganizationOwnership()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationInviteRole>('Staff')

  const tf = t.settings.teamForm

  const onInvite = (event: React.FormEvent): void => {
    event.preventDefault()
    if (!email.trim()) {
      toast('error', tf.inviteValidation)
      return
    }
    issueInvite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          toast('success', tf.inviteSuccess)
          setEmail('')
        },
        onError: (err) => {
          toast('error', isApiError(err) ? err.message : tf.inviteError)
        },
      },
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardTitle className="mb-2">{tf.inviteTitle}</CardTitle>
        <p className="text-body-sm text-on-surface-variant mb-4">{tf.inviteSubtitle}</p>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onInvite}>
          <div className="flex-1">
            <label className="text-label-sm text-on-surface-variant mb-1.5 block">
              {tf.email}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant mb-1.5 block">
              {tf.role}
            </label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as OrganizationInviteRole)}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={issueInvite.isPending}>
            {issueInvite.isPending ? t.common.loading : tf.invite}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-4">{tf.membersTitle}</CardTitle>
        {membersQuery.isLoading && (
          <p className="text-body-sm text-on-surface-variant">{t.common.loading}</p>
        )}
        {membersQuery.isError && (
          <EmptyState icon="error" title={tf.membersError} />
        )}
        {membersQuery.isSuccess && membersQuery.data.items.length === 0 && (
          <EmptyState icon="group" title={tf.membersEmpty} />
        )}
        {membersQuery.isSuccess && membersQuery.data.items.length > 0 && (
          <ul className="divide-y divide-outline-variant/20">
            {membersQuery.data.items.map((member) => {
              const memberId = String(member.id)
              const label =
                [member.firstName, member.lastName].filter(Boolean).join(' ') ||
                member.email ||
                memberId.slice(0, 8)
              return (
                <li
                  key={memberId}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface truncate">{label}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {member.email ?? '—'} · {String(member.role)}
                      {member.status ? ` · ${String(member.status)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {String(member.role) !== 'Owner' && (
                      <Select
                        value={
                          INVITE_ROLES.includes(member.role as OrganizationInviteRole)
                            ? (member.role as OrganizationInviteRole)
                            : 'Staff'
                        }
                        onChange={(e) => {
                          changeRole.mutate(
                            {
                              memberId,
                              role: e.target.value as OrganizationInviteRole,
                            },
                            {
                              onSuccess: () => toast('success', tf.roleChanged),
                              onError: (err) =>
                                toast(
                                  'error',
                                  isApiError(err) ? err.message : tf.roleChangeError,
                                ),
                            },
                          )
                        }}
                      >
                        {INVITE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    )}
                    {isOwner && String(member.role) !== 'Owner' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={transferOwnership.isPending}
                        onClick={() => {
                          if (!window.confirm(tf.transferConfirm)) return
                          transferOwnership.mutate(memberId, {
                            onSuccess: () => toast('success', tf.transferSuccess),
                            onError: (err) =>
                              toast(
                                'error',
                                isApiError(err) ? err.message : tf.transferError,
                              ),
                          })
                        }}
                      >
                        {tf.transfer}
                      </Button>
                    )}
                    {String(member.role) !== 'Owner' && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={removeMember.isPending}
                        onClick={() => {
                          if (!window.confirm(tf.removeConfirm)) return
                          removeMember.mutate(memberId, {
                            onSuccess: () => toast('success', tf.removeSuccess),
                            onError: (err) =>
                              toast(
                                'error',
                                isApiError(err) ? err.message : tf.removeError,
                              ),
                          })
                        }}
                      >
                        {tf.remove}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-4">{tf.invitationsTitle}</CardTitle>
        {invitationsQuery.isLoading && (
          <p className="text-body-sm text-on-surface-variant">{t.common.loading}</p>
        )}
        {invitationsQuery.isError && (
          <EmptyState icon="error" title={tf.invitationsError} />
        )}
        {invitationsQuery.isSuccess && invitationsQuery.data.items.length === 0 && (
          <EmptyState icon="mail" title={tf.invitationsEmpty} />
        )}
        {invitationsQuery.isSuccess && invitationsQuery.data.items.length > 0 && (
          <ul className="divide-y divide-outline-variant/20">
            {invitationsQuery.data.items.map((invite) => {
              const id = String(invite.id)
              return (
                <li
                  key={id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-on-surface">{invite.email}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {String(invite.role)} · {String(invite.status)}
                    </p>
                  </div>
                  {String(invite.status).toLowerCase() === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokeInvite.isPending}
                      onClick={() => {
                        revokeInvite.mutate(id, {
                          onSuccess: () => toast('success', tf.revokeSuccess),
                          onError: (err) =>
                            toast(
                              'error',
                              isApiError(err) ? err.message : tf.revokeError,
                            ),
                        })
                      }}
                    >
                      {tf.revoke}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

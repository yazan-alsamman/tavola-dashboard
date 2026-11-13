import { useEffect, useState } from 'react'
import type { EmployeeDto, EmployeeStatus } from '@/api/employees'
import type { BranchDto } from '@/api/branches'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  useAssignEmployeeBranchMutation,
  useEmployeesQuery,
  useInviteEmployeeMutation,
  useRemoveEmployeeMutation,
  useRestaurantRolesQuery,
} from '@/hooks/useEmployeeQueries'
import { apiErrorText } from '@/lib/apiErrorText'

function statusTone(status: EmployeeStatus | string): BadgeTone {
  if (status === 'Active') return 'success'
  if (status === 'Deactivated') return 'danger'
  return 'warning'
}

function statusLabel(
  status: EmployeeStatus | string,
  labels: { invited: string; active: string; deactivated: string },
): string {
  if (status === 'Active') return labels.active
  if (status === 'Deactivated') return labels.deactivated
  return labels.invited
}

export function StaffPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const {
    selectedRestaurantId,
    selectedBranchId,
    branches,
    status: scopeStatus,
    formatBranchLabel,
  } = useRestaurantScope()

  const [roleId, setRoleId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [branchId, setBranchId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const canOperate = scopeStatus === 'ready' && Boolean(selectedRestaurantId)
  const restaurantId = canOperate ? selectedRestaurantId : null

  const employeesQuery = useEmployeesQuery(restaurantId)
  const rolesQuery = useRestaurantRolesQuery(restaurantId)
  const inviteMutation = useInviteEmployeeMutation()
  const assignMutation = useAssignEmployeeBranchMutation()
  const removeMutation = useRemoveEmployeeMutation()

  const roles = rolesQuery.data ?? []
  const roleNameById = new Map(roles.map((role) => [role.roleId, role.name]))

  useEffect(() => {
    setBranchId(selectedBranchId ?? '')
  }, [selectedRestaurantId, selectedBranchId])

  const firstRoleId = rolesQuery.data?.[0]?.roleId
  useEffect(() => {
    if (!roleId && firstRoleId) setRoleId(firstRoleId)
  }, [roleId, firstRoleId])

  const mapError = (err: unknown): string =>
    apiErrorText(err, t, t.staff.errors.unknown)

  const handleInvite = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!selectedRestaurantId || inviteMutation.isPending) return
    if (!roleId) {
      toast('error', t.staff.errors.role)
      return
    }
    if (!branchId) {
      toast('error', t.staff.errors.branch)
      return
    }
    try {
      const result = await inviteMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        roleId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        branchId,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      if (result.branchAssigned) {
        toast('success', t.staff.inviteSuccess)
      } else {
        toast('error', apiErrorText(result.error, t, t.staff.assignFailed))
      }
    } catch (err) {
      toast('error', mapError(err))
    }
  }

  const retryAssign = async (employee: EmployeeDto): Promise<void> => {
    if (!selectedRestaurantId || !branchId || busyId) return
    setBusyId(employee.employeeId)
    try {
      await assignMutation.mutateAsync({
        restaurantId: selectedRestaurantId,
        employeeId: employee.employeeId,
        branchId,
      })
      toast('success', t.staff.inviteSuccess)
    } catch (err) {
      toast('error', mapError(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (employeeId: string): Promise<void> => {
    if (!selectedRestaurantId || busyId) return
    if (confirmRemoveId !== employeeId) {
      setConfirmRemoveId(employeeId)
      return
    }
    setBusyId(employeeId)
    try {
      await removeMutation.mutateAsync({ restaurantId: selectedRestaurantId, employeeId })
      setConfirmRemoveId(null)
      toast('success', t.staff.removeEmployeeSuccess)
    } catch (err) {
      toast('error', mapError(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!canOperate) {
    return (
      <div>
        <PageHeader title={t.staff.title} subtitle={t.staff.subtitle} />
        <EmptyState
          icon="group"
          title={t.scope.noRestaurantsTitle}
          description={t.scope.noRestaurantsBody}
        />
      </div>
    )
  }

  const employees = employeesQuery.data ?? []

  return (
    <div className="max-w-3xl">
      <PageHeader title={t.staff.title} subtitle={t.staff.subtitle} />

      <Card className="mb-6">
        <p className="text-body-sm text-on-surface-variant">{t.staff.intro}</p>
      </Card>

      <Card className="mb-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <MaterialIcon name="person_add" size={20} className="text-primary" />
          {t.staff.invite}
        </CardTitle>
        <form onSubmit={(event) => void handleInvite(event)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t.staff.firstName}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
              autoComplete="given-name"
            />
            <Input
              label={t.staff.lastName}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
          <Input
            label={t.staff.email}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label={t.staff.phone}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
          <Select
            label={t.staff.branch}
            hint={t.staff.branchHint}
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            required
          >
            {branches.map((branch) => (
              <option key={branch.branchId} value={branch.branchId}>
                {formatBranchLabel(branch)}
              </option>
            ))}
          </Select>
          <Select
            label={t.staff.role}
            hint={
              rolesQuery.isPending
                ? t.staff.rolesLoading
                : rolesQuery.isError
                  ? undefined
                  : t.staff.roleHint
            }
            error={rolesQuery.isError ? t.staff.rolesFailed : undefined}
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={roles.length === 0}
            required
          >
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.name}
              </option>
            ))}
          </Select>
          <Button
            type="submit"
            disabled={inviteMutation.isPending || branches.length === 0 || !roleId}
          >
            {inviteMutation.isPending ? t.common.loading : t.staff.addStaff}
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="text-label-lg font-semibold text-on-surface mb-4">{t.staff.listTitle}</h2>
        {employeesQuery.isPending ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : employeesQuery.isError ? (
          <EmptyState
            icon="error"
            title={t.staff.listFailed}
            description={mapError(employeesQuery.error)}
            action={
              <Button type="button" onClick={() => void employeesQuery.refetch()}>
                {t.common.retry}
              </Button>
            }
            className="py-8"
          />
        ) : employees.length === 0 ? (
          <EmptyState icon="group" title={t.staff.listEmpty} className="py-8" />
        ) : (
          <ul className="space-y-3">
            {employees.map((employee) => (
              <StaffCard
                key={employee.employeeId}
                employee={employee}
                roleName={roleNameById.get(employee.roleId) ?? null}
                branches={branches}
                formatBranchLabel={formatBranchLabel}
                busy={busyId === employee.employeeId}
                confirmingRemove={confirmRemoveId === employee.employeeId}
                onRetry={() => void retryAssign(employee)}
                onRemove={() => void handleRemove(employee.employeeId)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StaffCard({
  employee,
  roleName,
  branches,
  formatBranchLabel,
  busy,
  confirmingRemove,
  onRetry,
  onRemove,
}: {
  employee: EmployeeDto
  roleName: string | null
  branches: BranchDto[]
  formatBranchLabel: (branch: BranchDto) => string
  busy: boolean
  confirmingRemove: boolean
  onRetry: () => void
  onRemove: () => void
}) {
  const { t } = useLocale()
  const branchText = employee.assignedBranchIds
    .map((id) => {
      const branch = branches.find((item) => item.branchId === id)
      return branch ? formatBranchLabel(branch) : null
    })
    .filter((label): label is string => Boolean(label))
    .join(' · ')

  return (
    <li className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-lg font-semibold text-on-surface">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="text-body-sm text-on-surface-variant">{employee.email}</p>
          {roleName && <p className="text-label-sm text-primary mt-1">{roleName}</p>}
          {employee.phone && (
            <p className="text-label-sm text-on-surface mt-1">{employee.phone}</p>
          )}
        </div>
        <Badge tone={statusTone(employee.status)} dot>
          {statusLabel(employee.status, {
            invited: t.staff.statusInvited,
            active: t.staff.statusActive,
            deactivated: t.staff.statusDeactivated,
          })}
        </Badge>
      </div>
      <p className="mt-3 text-body-sm text-on-surface">
        {branchText || t.staff.branchMissing}
      </p>
      {employee.status === 'Invited' && (
        <p className="mt-1 text-label-sm text-on-surface-variant">{t.staff.signInHint}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {employee.assignedBranchIds.length === 0 && (
          <Button size="sm" variant="outline" disabled={busy} onClick={onRetry}>
            {t.staff.retryAssign}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          disabled={busy}
          onClick={onRemove}
        >
          <MaterialIcon name="person_remove" size={16} />
          {confirmingRemove ? t.staff.removeConfirm : t.staff.removeEmployee}
        </Button>
      </div>
    </li>
  )
}

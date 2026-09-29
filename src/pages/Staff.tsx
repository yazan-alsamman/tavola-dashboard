import { useEffect, useState } from 'react'
import {
  assignEmployeeToBranch,
  inviteEmployeeForBranch,
  removeEmployee,
  type EmployeeDto,
  type EmployeeStatus,
} from '@/api/employees'
import { isApiError } from '@/api/errors'
import type { BranchDto } from '@/api/branches'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function addedStorageKey(restaurantId: string): string {
  return `tavola.staff.added.${restaurantId}`
}

function roleStorageKey(restaurantId: string): string {
  return `tavola.staff.role.${restaurantId}`
}

function isEmployee(value: unknown): value is EmployeeDto {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<EmployeeDto>
  return (
    typeof row.employeeId === 'string' &&
    typeof row.firstName === 'string' &&
    typeof row.lastName === 'string' &&
    typeof row.email === 'string' &&
    typeof row.roleId === 'string' &&
    Array.isArray(row.assignedBranchIds)
  )
}

function readAdded(restaurantId: string): EmployeeDto[] {
  try {
    const raw = sessionStorage.getItem(addedStorageKey(restaurantId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEmployee)
  } catch {
    return []
  }
}

function writeAdded(restaurantId: string, employees: EmployeeDto[]): void {
  try {
    sessionStorage.setItem(addedStorageKey(restaurantId), JSON.stringify(employees))
  } catch {
    // The list still lives in component state for this visit.
  }
}

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
  const [roleError, setRoleError] = useState('')
  const [inviting, setInviting] = useState(false)
  const [added, setAdded] = useState<EmployeeDto[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const canOperate = scopeStatus === 'ready' && Boolean(selectedRestaurantId)

  useEffect(() => {
    if (!selectedRestaurantId) return
    setAdded(readAdded(selectedRestaurantId))
    try {
      setRoleId(sessionStorage.getItem(roleStorageKey(selectedRestaurantId)) ?? '')
    } catch {
      setRoleId('')
    }
    setBranchId(selectedBranchId ?? '')
  }, [selectedRestaurantId, selectedBranchId])

  const mapError = (err: unknown): string =>
    isApiError(err) ? err.message : t.staff.errors.unknown

  const remember = (employee: EmployeeDto): void => {
    if (!selectedRestaurantId) return
    setAdded((current) => {
      const next = [employee, ...current.filter((row) => row.employeeId !== employee.employeeId)]
      writeAdded(selectedRestaurantId, next)
      return next
    })
  }

  const handleInvite = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!selectedRestaurantId || inviting) return
    const trimmedRole = roleId.trim()
    if (!UUID_PATTERN.test(trimmedRole)) {
      setRoleError(t.staff.errors.role)
      return
    }
    if (!branchId) {
      toast('error', t.staff.errors.branch)
      return
    }
    setRoleError('')
    setInviting(true)
    try {
      const result = await inviteEmployeeForBranch(selectedRestaurantId, {
        roleId: trimmedRole,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        branchId,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      try {
        sessionStorage.setItem(roleStorageKey(selectedRestaurantId), trimmedRole)
      } catch {
        // The role stays in the field for this visit.
      }
      remember(result.employee)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      if (result.branchAssigned) {
        toast('success', t.staff.inviteSuccess)
      } else {
        toast('error', isApiError(result.error) ? result.error.message : t.staff.assignFailed)
      }
    } catch (err) {
      toast('error', mapError(err))
    } finally {
      setInviting(false)
    }
  }

  const retryAssign = async (employee: EmployeeDto): Promise<void> => {
    if (!selectedRestaurantId || !branchId || busyId) return
    setBusyId(employee.employeeId)
    try {
      const assigned = await assignEmployeeToBranch(selectedRestaurantId, employee.employeeId, {
        branchId,
      })
      remember(assigned)
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
      await removeEmployee(selectedRestaurantId, employeeId)
      setAdded((current) => {
        const next = current.filter((row) => row.employeeId !== employeeId)
        writeAdded(selectedRestaurantId, next)
        return next
      })
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
          <Input
            label={t.staff.role}
            hint={roleError ? undefined : t.staff.roleHint}
            error={roleError || undefined}
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value)
              if (roleError) setRoleError('')
            }}
            required
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" disabled={inviting || branches.length === 0}>
            {inviting ? t.common.loading : t.staff.addStaff}
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="text-label-lg font-semibold text-on-surface mb-1">{t.staff.sessionTitle}</h2>
        <p className="text-body-sm text-on-surface-variant mb-4">{t.staff.sessionHint}</p>
        {added.length === 0 ? (
          <EmptyState icon="group" title={t.staff.sessionEmpty} className="py-8" />
        ) : (
          <ul className="space-y-3">
            {added.map((employee) => (
              <StaffCard
                key={employee.employeeId}
                employee={employee}
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
  branches,
  formatBranchLabel,
  busy,
  confirmingRemove,
  onRetry,
  onRemove,
}: {
  employee: EmployeeDto
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

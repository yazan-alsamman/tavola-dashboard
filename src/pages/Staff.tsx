import { useState } from 'react'
import {
  assignEmployeeRole,
  assignEmployeeToBranch,
  inviteEmployee,
  removeEmployee,
  removeEmployeeFromBranch,
  type EmployeeDto,
} from '@/api/employees'
import { isApiError } from '@/api/errors'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'

export function StaffPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { selectedRestaurantId, status: scopeStatus } = useRestaurantScope()

  const [inviteRoleId, setInviteRoleId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [lastInvited, setLastInvited] = useState<EmployeeDto | null>(null)

  const [manageEmployeeId, setManageEmployeeId] = useState('')
  const [assignRoleId, setAssignRoleId] = useState('')
  const [assignBranchId, setAssignBranchId] = useState('')
  const [removeBranchId, setRemoveBranchId] = useState('')
  const [managing, setManaging] = useState(false)

  const canOperate = scopeStatus === 'ready' && Boolean(selectedRestaurantId)

  const mapError = (err: unknown): string =>
    isApiError(err) ? err.message : t.staff.errors.unknown

  const handleInvite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedRestaurantId || inviting) return

    setInviting(true)
    try {
      const employee = await inviteEmployee(selectedRestaurantId, {
        roleId: inviteRoleId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      })
      setLastInvited(employee)
      setManageEmployeeId(employee.employeeId)
      toast('success', t.staff.inviteSuccess)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
    } catch (err) {
      toast('error', mapError(err))
    } finally {
      setInviting(false)
    }
  }

  const runManageAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> => {
    if (!selectedRestaurantId || !manageEmployeeId.trim() || managing) return
    setManaging(true)
    try {
      await action()
      toast('success', successMessage)
    } catch (err) {
      toast('error', mapError(err))
    } finally {
      setManaging(false)
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
    <div>
      <PageHeader title={t.staff.title} subtitle={t.staff.subtitle} />

      <EmptyState
        icon="info"
        title={t.staff.noListTitle}
        description={t.staff.noListBody}
        className="mb-6 py-8"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <MaterialIcon name="person_add" size={20} className="text-primary" />
            {t.staff.invite}
          </CardTitle>
          <form onSubmit={(e) => void handleInvite(e)} className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.staff.roleId}</span>
              <Input
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                placeholder="UUID"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-on-surface-variant">{t.staff.firstName}</span>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-on-surface-variant">{t.staff.lastName}</span>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.customers.email}</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.reservations.phone}</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            </label>
            <Button type="submit" disabled={inviting}>
              {inviting ? t.common.loading : t.staff.addStaff}
            </Button>
            {lastInvited && (
              <p className="text-sm text-success">
                {t.staff.invitedId}: {lastInvited.employeeId}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <MaterialIcon name="manage_accounts" size={20} className="text-primary" />
            {t.staff.manageById}
          </CardTitle>
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{t.staff.employeeId}</span>
              <Input
                value={manageEmployeeId}
                onChange={(e) => setManageEmployeeId(e.target.value)}
                placeholder="UUID"
              />
            </label>

            <div className="border-t border-outline-variant/20 pt-4 space-y-3">
              <p className="text-sm font-semibold text-on-surface">{t.staff.assignRole}</p>
              <Input
                value={assignRoleId}
                onChange={(e) => setAssignRoleId(e.target.value)}
                placeholder={t.staff.roleId}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!assignRoleId.trim() || managing}
                onClick={() =>
                  void runManageAction(
                    () =>
                      assignEmployeeRole(selectedRestaurantId!, manageEmployeeId.trim(), {
                        roleId: assignRoleId.trim(),
                      }),
                    t.staff.assignRoleSuccess,
                  )
                }
              >
                {t.staff.assignRole}
              </Button>
            </div>

            <div className="border-t border-outline-variant/20 pt-4 space-y-3">
              <p className="text-sm font-semibold text-on-surface">{t.staff.assignBranch}</p>
              <Input
                value={assignBranchId}
                onChange={(e) => setAssignBranchId(e.target.value)}
                placeholder={t.staff.branchId}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!assignBranchId.trim() || managing}
                onClick={() =>
                  void runManageAction(
                    () =>
                      assignEmployeeToBranch(selectedRestaurantId!, manageEmployeeId.trim(), {
                        branchId: assignBranchId.trim(),
                      }),
                    t.staff.assignBranchSuccess,
                  )
                }
              >
                {t.staff.assignBranch}
              </Button>
            </div>

            <div className="border-t border-outline-variant/20 pt-4 space-y-3">
              <p className="text-sm font-semibold text-on-surface">{t.staff.removeFromBranch}</p>
              <Input
                value={removeBranchId}
                onChange={(e) => setRemoveBranchId(e.target.value)}
                placeholder={t.staff.branchId}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!removeBranchId.trim() || managing}
                onClick={() =>
                  void runManageAction(
                    () =>
                      removeEmployeeFromBranch(
                        selectedRestaurantId!,
                        manageEmployeeId.trim(),
                        removeBranchId.trim(),
                      ),
                    t.staff.removeFromBranchSuccess,
                  )
                }
              >
                {t.staff.removeFromBranch}
              </Button>
            </div>

            <div className="border-t border-outline-variant/20 pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                disabled={!manageEmployeeId.trim() || managing}
                onClick={() =>
                  void runManageAction(
                    () => removeEmployee(selectedRestaurantId!, manageEmployeeId.trim()),
                    t.staff.removeEmployeeSuccess,
                  )
                }
              >
                <MaterialIcon name="person_remove" size={16} /> {t.staff.removeEmployee}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

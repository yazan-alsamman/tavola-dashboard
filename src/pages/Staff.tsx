import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { useLocale } from '@/context/LocaleContext'
import { staff } from '@/data/mockData'
import type { StaffRole } from '@/types'

const roleColors: Record<StaffRole, string> = {
  owner: 'bg-primary-light text-primary',
  manager: 'bg-info-light text-info',
  receptionist: 'bg-success-light text-success',
  viewer: 'bg-surface-container-lowest text-on-surface-variant',
}

export function StaffPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader
        title={t.staff.title}
        subtitle={t.staff.subtitle}
        actions={
          <Button size="sm">
            <MaterialIcon name="add" size={16} /> {t.staff.addStaff}
          </Button>
        }
      />

      <DataTable>
        <DataTableHead>
          <DataTableHeader>{t.customers.name}</DataTableHeader>
          <DataTableHeader>{t.customers.email}</DataTableHeader>
          <DataTableHeader>{t.reservations.phone}</DataTableHeader>
          <DataTableHeader>{t.staff.role}</DataTableHeader>
          <DataTableHeader>{t.common.status}</DataTableHeader>
          <DataTableHeader>{t.common.actions}</DataTableHeader>
        </DataTableHead>
        <DataTableBody>
          {staff.map((member) => (
            <DataTableRow key={member.id}>
              <DataTableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span className="font-medium">{member.name}</span>
                </div>
              </DataTableCell>
              <DataTableCell className="text-on-surface-variant">{member.email}</DataTableCell>
              <DataTableCell className="text-on-surface-variant">{member.phone}</DataTableCell>
              <DataTableCell>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${roleColors[member.role]}`}>
                  {t.staff[member.role]}
                </span>
              </DataTableCell>
              <DataTableCell>
                <span className={`text-xs font-medium ${member.active ? 'text-success' : 'text-on-surface-variant'}`}>
                  {member.active ? 'Active' : 'Inactive'}
                </span>
              </DataTableCell>
              <DataTableCell>
                <Button variant="ghost" size="sm">{t.common.edit}</Button>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/Input'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'
import { customers } from '@/data/mockData'

export function CustomersPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader title={t.customers.title} subtitle={t.customers.subtitle} />

      <div className="mb-6 max-w-md">
        <Input placeholder={t.common.search} icon={<MaterialIcon name="search" size={16} />} />
      </div>

      <DataTable>
        <DataTableHead>
          <DataTableHeader>{t.customers.name}</DataTableHeader>
          <DataTableHeader>{t.reservations.phone}</DataTableHeader>
          <DataTableHeader>{t.customers.email}</DataTableHeader>
          <DataTableHeader>{t.customers.reservations}</DataTableHeader>
          <DataTableHeader>{t.customers.visits}</DataTableHeader>
          <DataTableHeader>{t.customers.lastVisit}</DataTableHeader>
          <DataTableHeader>{t.common.actions}</DataTableHeader>
        </DataTableHead>
        <DataTableBody>
          {customers.map((c) => (
            <DataTableRow key={c.id}>
              <DataTableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold">
                    {c.name.charAt(0)}
                  </div>
                  <span className="font-medium">{c.name}</span>
                </div>
              </DataTableCell>
              <DataTableCell className="text-on-surface-variant">{c.phone}</DataTableCell>
              <DataTableCell className="text-on-surface-variant">{c.email}</DataTableCell>
              <DataTableCell>{c.reservationCount}</DataTableCell>
              <DataTableCell>{c.visitCount}</DataTableCell>
              <DataTableCell>{c.lastVisit}</DataTableCell>
              <DataTableCell>
                <Button variant="ghost" size="sm">{t.customers.history}</Button>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

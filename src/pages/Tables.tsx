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
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocale } from '@/context/LocaleContext'
import { tables } from '@/data/mockData'

export function TablesPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader
        title={t.tables.title}
        subtitle={t.tables.subtitle}
        actions={
          <Button size="sm">
            <MaterialIcon name="add" size={16} /> {t.tables.create}
          </Button>
        }
      />

      <DataTable>
        <DataTableHead>
          <DataTableHeader>{t.tables.name}</DataTableHeader>
          <DataTableHeader>{t.tables.number}</DataTableHeader>
          <DataTableHeader>{t.tables.capacity}</DataTableHeader>
          <DataTableHeader>{t.tables.section}</DataTableHeader>
          <DataTableHeader>{t.tables.features}</DataTableHeader>
          <DataTableHeader>{t.common.status}</DataTableHeader>
          <DataTableHeader>{t.common.actions}</DataTableHeader>
        </DataTableHead>
        <DataTableBody>
          {tables.map((table) => (
            <DataTableRow key={table.id}>
              <DataTableCell className="font-medium">{table.name}</DataTableCell>
              <DataTableCell>{table.number}</DataTableCell>
              <DataTableCell>{table.capacity}</DataTableCell>
              <DataTableCell className="capitalize">{table.section}</DataTableCell>
              <DataTableCell>
                <div className="flex flex-wrap gap-1">
                  {table.features.map((f) => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded bg-surface-container-lowest capitalize">
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </DataTableCell>
              <DataTableCell>
                <StatusBadge status={table.status} label={t.status[table.status]} type="table" />
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

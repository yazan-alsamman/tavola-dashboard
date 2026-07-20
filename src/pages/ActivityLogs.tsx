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
import { useLocale } from '@/context/LocaleContext'
import { activityLogs } from '@/data/mockData'

export function ActivityLogsPage() {
  const { t } = useLocale()

  return (
    <div>
      <PageHeader title={t.activityLogs.title} subtitle={t.activityLogs.subtitle} />

      <div className="mb-6 max-w-md">
        <Input placeholder={t.common.search} icon={<MaterialIcon name="search" size={16} />} />
      </div>

      <DataTable>
        <DataTableHead>
          <DataTableHeader>{t.activityLogs.user}</DataTableHeader>
          <DataTableHeader>{t.activityLogs.action}</DataTableHeader>
          <DataTableHeader>{t.reservations.date}</DataTableHeader>
          <DataTableHeader>{t.reservations.time}</DataTableHeader>
          <DataTableHeader>{t.activityLogs.entity}</DataTableHeader>
        </DataTableHead>
        <DataTableBody>
          {activityLogs.map((log) => (
            <DataTableRow key={log.id}>
              <DataTableCell className="font-medium">{log.user}</DataTableCell>
              <DataTableCell>{log.action}</DataTableCell>
              <DataTableCell className="text-on-surface-variant">{log.date}</DataTableCell>
              <DataTableCell className="text-on-surface-variant">{log.time}</DataTableCell>
              <DataTableCell>
                <span className="font-mono text-xs text-primary">{log.entity}</span>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

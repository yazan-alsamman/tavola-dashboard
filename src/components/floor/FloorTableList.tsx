import { useState } from 'react'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto, TableStatusDto } from '@/api/tables'
import { Button } from '@/components/ui/Button'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableRowActions,
} from '@/components/ui/DataTable'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocale } from '@/context/LocaleContext'
import { compareTableNumbers, isPlaced, shapeChoiceOf } from '@/lib/floorGrid'
import { floorLabel, tableFloor, type FloorLabels } from '@/lib/floors'
import { effectiveCapacity } from '@/lib/tableCapacity'
import { cn } from '@/lib/utils'

interface FloorTableListProps {
  tables: TableDto[]
  areas: FloorPlanAreaDto[]
  floorLabels: FloorLabels
  canManage: boolean
  merging: boolean
  onEdit: (table: TableDto) => void
  onDelete: (table: TableDto) => void
  onToggleService: (table: TableDto) => void
  onMerge: (tableIds: string[]) => Promise<boolean>
  onSplit: (table: TableDto) => void
}

interface Group {
  key: string
  area: FloorPlanAreaDto | null
  tables: TableDto[]
}

/** Area order first (as on the plan), tables T1 upward inside each, "no area" last. */
function groupByArea(tables: TableDto[], areas: FloorPlanAreaDto[]): Group[] {
  const groups: Group[] = [...areas]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((area) => ({
      key: area.floorPlanAreaId,
      area,
      tables: tables.filter((table) => table.floorPlanAreaId === area.floorPlanAreaId),
    }))
  const known = new Set(areas.map((area) => area.floorPlanAreaId))
  groups.push({
    key: 'none',
    area: null,
    tables: tables.filter(
      (table) => !table.floorPlanAreaId || !known.has(table.floorPlanAreaId),
    ),
  })
  return groups
    .filter((group) => group.tables.length > 0)
    .map((group) => ({
      ...group,
      tables: [...group.tables].sort((a, b) => compareTableNumbers(a.tableNumber, b.tableNumber)),
    }))
}

/** "القائمة" view of the venue plan: every table, grouped by area. */
export function FloorTableList({
  tables,
  areas,
  floorLabels,
  canManage,
  merging,
  onEdit,
  onDelete,
  onToggleService,
  onMerge,
  onSplit,
}: FloorTableListProps) {
  const { t } = useLocale()
  const [selected, setSelected] = useState<string[]>([])
  const groups = groupByArea(tables, areas)
  const picked = tables.filter((table) => selected.includes(table.tableId))
  const canMerge =
    canManage && picked.length >= 2 && picked.every((table) => table.status === 'Available')

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  if (tables.length === 0) {
    return (
      <EmptyState icon="table_restaurant" title={t.floorGrid.emptyTitle} description={t.floorGrid.emptyBody} />
    )
  }

  const mergedWith = (table: TableDto) =>
    table.mergeGroupId
      ? tables
          .filter((other) => other.mergeGroupId === table.mergeGroupId && other.tableId !== table.tableId)
          .map((other) => other.tableNumber)
          .join('، ')
      : ''

  const actions = (table: TableDto) => (
    <DataTableRowActions
      primary={
        table.status === 'Available' || table.status === 'Disabled' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-11"
            onClick={() => onToggleService(table)}
          >
            {table.status === 'Disabled' ? t.floorGrid.backInService : t.floorGrid.outOfService}
          </Button>
        ) : undefined
      }
      menu={
        <DropdownMenu label={t.common.moreActions}>
          <DropdownMenuItem onSelect={() => onEdit(table)}>{t.common.edit}</DropdownMenuItem>
          {table.mergeGroupId ? (
            <DropdownMenuItem onSelect={() => onSplit(table)}>{t.floorGrid.split}</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem destructive onSelect={() => onDelete(table)}>
            {t.common.delete}
          </DropdownMenuItem>
        </DropdownMenu>
      }
    />
  )

  const placement = (table: TableDto) => (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-label-sm font-semibold',
        isPlaced(table) ? 'bg-success/10 text-success' : 'bg-warning-light text-warning',
      )}
    >
      {isPlaced(table) ? t.floorGrid.placed : t.floorGrid.notPlaced}
    </span>
  )

  const status = (table: TableDto) => (
    <StatusBadge status={table.status} label={t.status[table.status as TableStatusDto]} type="table" />
  )

  const groupTitle = (group: Group) => (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-2.5 rounded-full"
        style={{ backgroundColor: group.area?.color ?? 'var(--color-outline)' }}
      />
      {group.area?.name ?? t.floorGrid.noArea}
      <span className="font-normal text-on-surface-variant">
        · <Num>{group.tables.length}</Num>
      </span>
    </span>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-label-sm text-on-surface-variant">{t.floorGrid.statusAuto}</p>
        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canMerge || merging}
            loading={merging}
            onClick={() =>
              void onMerge(selected).then((ok) => {
                if (ok) setSelected([])
              })
            }
          >
            {t.floorGrid.mergeSelected}
          </Button>
        )}
      </div>

      <DataTable
        cards={
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <h3 className="text-label-lg font-semibold text-on-surface">{groupTitle(group)}</h3>
                {group.tables.map((table) => (
                  <article
                    key={table.tableId}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4"
                  >
                    <div className="flex items-start gap-3">
                      {canManage && (
                        <input
                          type="checkbox"
                          className="mt-1 size-5"
                          checked={selected.includes(table.tableId)}
                          onChange={() => toggle(table.tableId)}
                          aria-label={t.floorGrid.select.replace('{table}', table.tableNumber)}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-label-lg font-semibold text-on-surface">{table.tableNumber}</p>
                        <p className="text-body-sm text-on-surface-variant">
                          <Num>{effectiveCapacity(table, tables)}</Num> {t.common.seats} ·{' '}
                          {t.floorGrid.shapes[shapeChoiceOf(table)]} ·{' '}
                          {floorLabel(tableFloor(table), floorLabels)}
                        </p>
                        {table.mergeGroupId && (
                          <p className="text-label-sm text-on-surface-variant">
                            {t.floorGrid.mergedWith.replace('{tables}', mergedWith(table))}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {status(table)}
                        {placement(table)}
                      </div>
                    </div>
                    {canManage && <div className="mt-3">{actions(table)}</div>}
                  </article>
                ))}
              </section>
            ))}
          </div>
        }
      >
        <DataTableHead>
          {canManage && <DataTableHeader className="w-10"><span className="sr-only">{t.floorGrid.select.replace('{table}', '')}</span></DataTableHeader>}
          <DataTableHeader>{t.floorGrid.listTable}</DataTableHeader>
          <DataTableHeader>{t.floorGrid.listSeats}</DataTableHeader>
          <DataTableHeader>{t.floorGrid.listShape}</DataTableHeader>
          <DataTableHeader>{t.floorGrid.listArea}</DataTableHeader>
          <DataTableHeader>{t.floorGrid.listFloor}</DataTableHeader>
          <DataTableHeader>{t.floorGrid.listPlacement}</DataTableHeader>
          <DataTableHeader>{t.floorGrid.listStatus}</DataTableHeader>
          {canManage && <DataTableHeader>{t.floorGrid.listActions}</DataTableHeader>}
        </DataTableHead>
        <DataTableBody>
          {groups.flatMap((group) => [
            <DataTableRow key={`${group.key}-title`} className="bg-surface-container-low">
              <DataTableCell colSpan={canManage ? 9 : 7} className="font-semibold">
                {groupTitle(group)}
              </DataTableCell>
            </DataTableRow>,
            ...group.tables.map((table) => (
              <DataTableRow
                key={table.tableId}
                className={cn(selected.includes(table.tableId) && 'bg-primary-container/5')}
              >
                {canManage && (
                  <DataTableCell>
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selected.includes(table.tableId)}
                      onChange={() => toggle(table.tableId)}
                      aria-label={t.floorGrid.select.replace('{table}', table.tableNumber)}
                    />
                  </DataTableCell>
                )}
                <DataTableCell className="font-medium">
                  {table.tableNumber}
                  {table.mergeGroupId && (
                    <span className="block text-label-sm font-normal text-on-surface-variant">
                      {t.floorGrid.mergedWith.replace('{tables}', mergedWith(table))}
                    </span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <Num>{effectiveCapacity(table, tables)}</Num>
                </DataTableCell>
                <DataTableCell>{t.floorGrid.shapes[shapeChoiceOf(table)]}</DataTableCell>
                <DataTableCell>{group.area?.name ?? t.floorGrid.noArea}</DataTableCell>
                <DataTableCell>{floorLabel(tableFloor(table), floorLabels)}</DataTableCell>
                <DataTableCell>{placement(table)}</DataTableCell>
                <DataTableCell>{status(table)}</DataTableCell>
                {canManage && <DataTableCell>{actions(table)}</DataTableCell>}
              </DataTableRow>
            )),
          ])}
        </DataTableBody>
      </DataTable>
    </div>
  )
}

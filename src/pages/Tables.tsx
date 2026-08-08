import { useMemo, useState } from 'react'
import { isApiError } from '@/api/errors'
import type { TableDto, TableStatusDto } from '@/api/tables'
import { ChangeTableStatusDialog } from '@/components/inventory/ChangeTableStatusDialog'
import { MoveTableDialog } from '@/components/inventory/MoveTableDialog'
import { TableFormDialog } from '@/components/inventory/TableFormDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Num } from '@/components/ui/Num'
import { ConfirmDialog } from '@/components/ui/Modal'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  useBranchTablesQuery,
  useFloorPlansQuery,
} from '@/hooks/useInventoryQueries'
import {
  useDeleteTableMutation,
  useMergeTablesMutation,
  useSplitTableMutation,
} from '@/hooks/useInventoryMutations'
import { useCanManageInventory } from '@/hooks/usePermissions'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'
import { cn } from '@/lib/utils'

function tableFlags(
  table: {
    indoor: boolean
    vip: boolean
    smoking: boolean
  },
  t: ReturnType<typeof useLocale>['t'],
): string[] {
  const flags: string[] = []
  flags.push(table.indoor ? t.tables.indoor : t.tables.outdoor)
  if (table.vip) flags.push(t.tables.vip)
  if (table.smoking) flags.push(t.tables.smoking)
  return flags
}

/**
 * Branch-scoped table inventory with production mutations (Owner/Admin).
 */
export function TablesPage() {
  const { t } = useLocale()
  const {
    status: scopeStatus,
    selectedBranch,
    selectedRestaurantId,
    selectedBranchId,
  } = useRestaurantScope()
  const canManage = useCanManageInventory()
  const tablesQuery = useBranchTablesQuery(scopeStatus === 'ready')
  const floorPlansQuery = useFloorPlansQuery(scopeStatus === 'ready' && canManage)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTable, setEditTable] = useState<TableDto | null>(null)
  const [moveTableTarget, setMoveTableTarget] = useState<TableDto | null>(null)
  const [statusTable, setStatusTable] = useState<TableDto | null>(null)
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableDto | null>(
    null,
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mergeError, setMergeError] = useState<string | null>(null)
  const { toast } = useToast()

  const deleteMutation = useDeleteTableMutation()
  const mergeMutation = useMergeTablesMutation()
  const splitMutation = useSplitTableMutation()

  const restaurantId = selectedRestaurantId ?? ''
  const branchId = selectedBranchId ?? ''
  const floorPlans = floorPlansQuery.data ?? []
  const defaultFloorPlanId = useMemo(() => {
    const active = floorPlansQuery.data?.find((fp) => fp.isActive)
    return (
      active?.floorPlanId ??
      floorPlansQuery.data?.[0]?.floorPlanId ??
      ''
    )
  }, [floorPlansQuery.data])

  if (scopeStatus === 'loading' || scopeStatus === 'idle') {
    return (
      <div className="py-16 text-center text-on-surface-variant">{t.tables.loading}</div>
    )
  }

  if (tablesQuery.isLoading) {
    return (
      <div>
        <PageHeader title={t.tables.title} subtitle={t.tables.subtitle} />
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          {t.tables.loading}
        </p>
      </div>
    )
  }

  if (tablesQuery.isError) {
    const err = tablesQuery.error
    const forbidden = isApiError(err) && err.code === 'FORBIDDEN'
    return (
      <div>
        <PageHeader title={t.tables.title} subtitle={t.tables.subtitle} />
        <EmptyState
          icon="error"
          title={forbidden ? t.tables.forbiddenTitle : t.tables.errorTitle}
          description={
            forbidden ? t.tables.forbiddenBody : t.tables.errorBody
          }
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void tablesQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      </div>
    )
  }

  const tables = tablesQuery.data ?? []

  const toggleSelect = (tableId: string) => {
    setSelectedIds((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId],
    )
  }

  const selectedTables = tables.filter((t) => selectedIds.includes(t.tableId))
  const canMerge =
    canManage &&
    selectedTables.length >= 2 &&
    selectedTables.every((t) => t.status === 'Available') &&
    selectedTables.every((t) => t.floorPlanId === selectedTables[0]?.floorPlanId)

  const runMerge = async () => {
    if (!restaurantId || !branchId || !canMerge) return
    setMergeError(null)
    try {
      await mergeMutation.mutateAsync({
        body: { tableIds: selectedIds },
        scope: { restaurantId, branchId },
        floorPlanId: selectedTables[0]!.floorPlanId,
      })
      setSelectedIds([])
      toast('success', t.tables.mergeSuccess)
    } catch (err) {
      setMergeError(mapInventoryMutationError(err, t.inventory.errors))
    }
  }

  const runSplit = async (table: TableDto) => {
    if (!restaurantId || !branchId) return
    try {
      await splitMutation.mutateAsync({
        tableId: table.tableId,
        scope: { restaurantId, branchId },
        floorPlanId: table.floorPlanId,
      })
      toast('success', t.tables.splitSuccess)
    } catch (err) {
      toast(
        'error',
        mapInventoryMutationError(err, t.inventory.errors),
      )
    }
  }

  const confirmDelete = async () => {
    if (!deleteTableTarget || !restaurantId || !branchId) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync({
        tableId: deleteTableTarget.tableId,
        scope: { restaurantId, branchId },
        floorPlanId: deleteTableTarget.floorPlanId,
      })
      setDeleteTableTarget(null)
    } catch (err) {
      setDeleteError(mapInventoryMutationError(err, t.inventory.errors))
    }
  }

  return (
    <div>
      <PageHeader
        title={t.tables.title}
        subtitle={
          selectedBranch
            ? `${t.tables.subtitle} · ${selectedBranch.city}`
            : t.tables.subtitle
        }
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canMerge || mergeMutation.isPending}
                onClick={() => void runMerge()}
                className="px-4 py-2 rounded-lg text-label-md border border-outline-variant/40 text-on-surface disabled:opacity-50"
              >
                {t.tables.mergeSelected}
              </button>
              <button
                type="button"
                disabled={!defaultFloorPlanId}
                onClick={() => setCreateOpen(true)}
                className="px-4 py-2 rounded-lg text-label-md bg-primary text-on-primary disabled:opacity-50"
              >
                {t.tables.create}
              </button>
            </div>
          ) : undefined
        }
      />

      <p className="text-label-sm text-on-surface-variant mb-4">
        {canManage ? t.tables.manageHint : t.inventory.employeeBlocked}
      </p>
      {mergeError && (
        <p className="text-label-sm text-error mb-3">{mergeError}</p>
      )}

      {tables.length === 0 ? (
        <EmptyState
          icon="table_restaurant"
          title={t.tables.emptyTitle}
          description={t.tables.emptyBody}
          action={
            canManage && defaultFloorPlanId ? (
              <button
                type="button"
                className="text-label-md text-primary font-semibold"
                onClick={() => setCreateOpen(true)}
              >
                {t.inventory.createTable}
              </button>
            ) : undefined
          }
        />
      ) : (
        <DataTable>
          <DataTableHead>
            {canManage && <DataTableHeader>{t.tables.select}</DataTableHeader>}
            <DataTableHeader>{t.tables.number}</DataTableHeader>
            <DataTableHeader>{t.tables.capacity}</DataTableHeader>
            <DataTableHeader>{t.tables.shape}</DataTableHeader>
            <DataTableHeader>{t.tables.flags}</DataTableHeader>
            <DataTableHeader>{t.common.status}</DataTableHeader>
            {canManage && (
              <DataTableHeader>{t.inventory.actions}</DataTableHeader>
            )}
          </DataTableHead>
          <DataTableBody>
            {tables.map((table) => (
              <DataTableRow
                key={table.tableId}
                className={cn(
                  selectedIds.includes(table.tableId) && 'bg-primary-container/5',
                )}
              >
                {canManage && (
                  <DataTableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(table.tableId)}
                      onChange={() => toggleSelect(table.tableId)}
                      aria-label={t.tables.select}
                    />
                  </DataTableCell>
                )}
                <DataTableCell className="font-medium">
                  {table.tableNumber}
                  {table.mergeGroupId ? (
                    <span className="ms-2 text-xs text-on-surface-variant">
                      ({t.tables.merged})
                    </span>
                  ) : null}
                </DataTableCell>
                <DataTableCell>
                  <Num>{table.capacity}</Num>
                </DataTableCell>
                <DataTableCell>{t.tables.shapes[table.shape]}</DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap gap-1">
                    {tableFlags(table, t).map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2 py-0.5 rounded bg-surface-container-lowest"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge
                    status={table.status}
                    label={t.status[table.status as TableStatusDto]}
                    type="table"
                  />
                </DataTableCell>
                {canManage && (
                  <DataTableCell>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-label-sm text-primary font-semibold"
                        onClick={() => setEditTable(table)}
                      >
                        {t.common.edit}
                      </button>
                      <button
                        type="button"
                        className="text-label-sm text-primary font-semibold"
                        onClick={() => setMoveTableTarget(table)}
                      >
                        {t.inventory.moveTable}
                      </button>
                      <button
                        type="button"
                        className="text-label-sm text-primary font-semibold"
                        onClick={() => setStatusTable(table)}
                      >
                        {t.inventory.changeStatus}
                      </button>
                      {table.mergeGroupId ? (
                        <button
                          type="button"
                          className="text-label-sm text-primary font-semibold"
                          disabled={splitMutation.isPending}
                          onClick={() => void runSplit(table)}
                        >
                          {t.tables.split}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-label-sm text-error font-semibold"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTableTarget(table)
                        }}
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </DataTableCell>
                )}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      {canManage && restaurantId && branchId && (
        <>
          <TableFormDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            restaurantId={restaurantId}
            branchId={branchId}
            floorPlans={floorPlans}
            mode={
              createOpen && defaultFloorPlanId
                ? { kind: 'create', floorPlanId: defaultFloorPlanId }
                : null
            }
          />
          <TableFormDialog
            open={Boolean(editTable)}
            onClose={() => setEditTable(null)}
            restaurantId={restaurantId}
            branchId={branchId}
            floorPlans={floorPlans}
            mode={editTable ? { kind: 'edit', table: editTable } : null}
          />
          <MoveTableDialog
            open={Boolean(moveTableTarget)}
            onClose={() => setMoveTableTarget(null)}
            restaurantId={restaurantId}
            branchId={branchId}
            table={moveTableTarget}
            floorPlans={floorPlans}
          />
          <ChangeTableStatusDialog
            open={Boolean(statusTable)}
            onClose={() => setStatusTable(null)}
            restaurantId={restaurantId}
            branchId={branchId}
            table={statusTable}
          />
          <ConfirmDialog
            open={Boolean(deleteTableTarget)}
            onClose={() => {
              if (!deleteMutation.isPending) setDeleteTableTarget(null)
            }}
            onConfirm={() => void confirmDelete()}
            title={t.inventory.deleteConfirmTitle}
            message={
              deleteError ??
              t.inventory.deleteConfirmMessage.replace(
                '{tableNumber}',
                deleteTableTarget?.tableNumber ?? '',
              )
            }
            confirmLabel={
              deleteMutation.isPending
                ? t.inventory.deleting
                : t.inventory.deleteTable
            }
            cancelLabel={t.common.cancel}
            variant="danger"
            busy={deleteMutation.isPending}
            closeOnConfirm={false}
          />
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import { isApiError } from '@/api/errors'
import type { TableDto, TableStatusDto } from '@/api/tables'
import { tableToUpdateRequest } from '@/api/tables'
import { CreateFloorPlanDialog } from '@/components/inventory/CreateFloorPlanDialog'
import { ChangeTableStatusDialog } from '@/components/inventory/ChangeTableStatusDialog'
import { MoveTableDialog } from '@/components/inventory/MoveTableDialog'
import { TableFormDialog } from '@/components/inventory/TableFormDialog'
import { FloorPlanReadView } from '@/components/floor/FloorPlanReadView'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import {
  useFloorPlanTablesQuery,
  useSelectedFloorPlan,
} from '@/hooks/useInventoryQueries'
import {
  useActivateFloorPlanMutation,
  useDeleteTableMutation,
  useUpdateTableMutation,
} from '@/hooks/useInventoryMutations'
import { useCanManageInventory } from '@/hooks/usePermissions'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'

/**
 * Backend-driven Floor Plan with production mutations.
 * Viewing a floor plan does not activate it — activation is explicit.
 * Geometry: save-on-drop via Update Table (no PATCH per pointer move).
 */
export function FloorPlanPage() {
  const { t } = useLocale()
  const {
    status: scopeStatus,
    formatBranchLabel,
    selectedBranch,
    selectedRestaurantId,
    selectedBranchId,
  } = useRestaurantScope()
  const canManage = useCanManageInventory()
  const {
    floorPlansQuery,
    selectedFloorPlanId,
    selectedFloorPlan,
    selectFloorPlan,
  } = useSelectedFloorPlan()
  const tablesQuery = useFloorPlanTablesQuery(
    selectedFloorPlanId,
    scopeStatus === 'ready' && Boolean(selectedFloorPlanId),
  )

  const activateMutation = useActivateFloorPlanMutation()
  const updateMutation = useUpdateTableMutation()
  const deleteMutation = useDeleteTableMutation()

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [createFloorOpen, setCreateFloorOpen] = useState(false)
  const [createTableOpen, setCreateTableOpen] = useState(false)
  const [editTable, setEditTable] = useState<TableDto | null>(null)
  const [moveTableTarget, setMoveTableTarget] = useState<TableDto | null>(null)
  const [statusTable, setStatusTable] = useState<TableDto | null>(null)
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableDto | null>(
    null,
  )
  const [repositionBusyId, setRepositionBusyId] = useState<string | null>(null)
  const [repositionError, setRepositionError] = useState<string | null>(null)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const restaurantId = selectedRestaurantId ?? ''
  const branchId = selectedBranchId ?? ''
  const tables = tablesQuery.data ?? []
  const selectedTable = tables.find((tb) => tb.tableId === selectedTableId)
  const floorPlans = floorPlansQuery.data ?? []

  const counts = {
    total: tables.length,
    available: tables.filter((tb) => tb.status === 'Available').length,
    occupied: tables.filter((tb) => tb.status === 'Occupied').length,
  }

  const handleReposition = async (
    tableId: string,
    positionX: number,
    positionY: number,
  ) => {
    const table = tables.find((tb) => tb.tableId === tableId)
    if (!table || !restaurantId || !branchId) return
    setRepositionError(null)
    setRepositionBusyId(tableId)
    try {
      await updateMutation.mutateAsync({
        tableId,
        body: tableToUpdateRequest(table, { positionX, positionY }),
        scope: { restaurantId, branchId },
        floorPlanId: table.floorPlanId,
      })
    } catch {
      setRepositionError(t.floorPlan.repositionFailed)
    } finally {
      setRepositionBusyId(null)
    }
  }

  const handleActivate = async () => {
    if (!selectedFloorPlan || !restaurantId || !branchId) return
    setActivateError(null)
    try {
      await activateMutation.mutateAsync({
        restaurantId,
        branchId,
        floorPlanId: selectedFloorPlan.floorPlanId,
      })
    } catch (err) {
      setActivateError(mapInventoryMutationError(err, t.inventory.errors))
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
      if (selectedTableId === deleteTableTarget.tableId) {
        setSelectedTableId(null)
      }
      setDeleteTableTarget(null)
    } catch (err) {
      setDeleteError(mapInventoryMutationError(err, t.inventory.errors))
    }
  }

  if (scopeStatus === 'loading' || scopeStatus === 'idle') {
    return (
      <div className="py-16 text-center text-on-surface-variant">
        {t.floorPlan.loading}
      </div>
    )
  }

  if (floorPlansQuery.isLoading) {
    return (
      <div className="py-16 text-center text-on-surface-variant">
        {t.floorPlan.loading}
      </div>
    )
  }

  if (floorPlansQuery.isError) {
    const forbidden =
      isApiError(floorPlansQuery.error) &&
      floorPlansQuery.error.code === 'FORBIDDEN'
    return (
      <EmptyState
        icon="error"
        title={forbidden ? t.floorPlan.forbiddenTitle : t.floorPlan.errorTitle}
        description={
          forbidden ? t.floorPlan.forbiddenBody : t.floorPlan.errorBody
        }
        action={
          <button
            type="button"
            className="text-label-md text-primary font-semibold"
            onClick={() => void floorPlansQuery.refetch()}
          >
            {t.scope.retry}
          </button>
        }
      />
    )
  }

  if (floorPlans.length === 0) {
    return (
      <div className="space-y-4">
        <Header
          selectedBranchLabel={
            selectedBranch ? formatBranchLabel(selectedBranch) : null
          }
          t={t}
          canManage={canManage}
          onCreateFloor={() => setCreateFloorOpen(true)}
        />
        <EmptyState
          icon="layers"
          title={t.floorPlan.noFloorPlansTitle}
          description={t.floorPlan.noFloorPlansBody}
          action={
            canManage ? (
              <button
                type="button"
                className="text-label-md text-primary font-semibold"
                onClick={() => setCreateFloorOpen(true)}
              >
                {t.inventory.createFloorPlan}
              </button>
            ) : undefined
          }
        />
        {canManage && restaurantId && branchId && (
          <CreateFloorPlanDialog
            open={createFloorOpen}
            onClose={() => setCreateFloorOpen(false)}
            restaurantId={restaurantId}
            branchId={branchId}
            onCreated={(id) => selectFloorPlan(id)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Header
        selectedBranchLabel={
          selectedBranch ? formatBranchLabel(selectedBranch) : null
        }
        t={t}
        canManage={canManage}
        onCreateFloor={() => setCreateFloorOpen(true)}
        onCreateTable={
          selectedFloorPlanId ? () => setCreateTableOpen(true) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <span>{t.floorPlan.floorSelector}</span>
          <select
            value={selectedFloorPlanId ?? ''}
            onChange={(e) => {
              setSelectedTableId(null)
              selectFloorPlan(e.target.value)
            }}
            className="rounded-lg bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={t.floorPlan.floorSelector}
          >
            {floorPlans.map((fp) => (
              <option key={fp.floorPlanId} value={fp.floorPlanId}>
                {fp.name}
                {fp.isActive ? ` (${t.floorPlan.active})` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3 text-label-md">
          <span className="flex items-center gap-1.5 text-on-surface-variant">
            <MaterialIcon
              name="table_restaurant"
              size={18}
              className="text-primary"
            />
            <Num>{counts.total}</Num> {t.floorPlan.tablesCount}
          </span>
          <span className="text-primary font-semibold">
            <Num>{counts.occupied}</Num> {t.status.Occupied}
          </span>
          <span className="text-on-surface-variant font-semibold">
            <Num>{counts.available}</Num> {t.status.Available}
          </span>
        </div>
      </div>

      {canManage &&
        selectedFloorPlan &&
        !selectedFloorPlan.isActive && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-3">
            <p className="text-label-md text-on-surface-variant flex-1">
              {t.floorPlan.viewingInactive}
            </p>
            <button
              type="button"
              disabled={activateMutation.isPending}
              onClick={() => void handleActivate()}
              className="px-3 py-1.5 rounded-lg text-label-md bg-primary text-on-primary disabled:opacity-50"
            >
              {activateMutation.isPending
                ? t.floorPlan.activating
                : t.floorPlan.activate}
            </button>
            {activateError && (
              <p className="w-full text-label-sm text-error" role="alert">
                {activateError}
              </p>
            )}
          </div>
        )}

      <p className="text-label-sm text-on-surface-variant">
        {canManage ? t.floorPlan.manageHint : t.inventory.employeeBlocked}
      </p>
      {canManage && (
        <p className="text-label-sm text-on-surface-variant">
          {t.floorPlan.repositionHint}
        </p>
      )}
      {repositionError && (
        <p className="text-label-sm text-error" role="alert">
          {repositionError}
        </p>
      )}

      {tablesQuery.isLoading && (
        <p className="py-8 text-center text-on-surface-variant">
          {t.floorPlan.loadingTables}
        </p>
      )}

      {tablesQuery.isError && (
        <EmptyState
          icon="error"
          title={t.floorPlan.errorTitle}
          description={t.floorPlan.errorBody}
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
      )}

      {tablesQuery.isSuccess && tables.length === 0 && (
        <EmptyState
          icon="table_restaurant"
          title={t.floorPlan.noTablesTitle}
          description={t.floorPlan.noTablesBody}
          action={
            canManage ? (
              <button
                type="button"
                className="text-label-md text-primary font-semibold"
                onClick={() => setCreateTableOpen(true)}
              >
                {t.inventory.createTable}
              </button>
            ) : undefined
          }
        />
      )}

      {tablesQuery.isSuccess && tables.length > 0 && (
        <FloorPlanReadView
          tables={tables}
          selectedTableId={selectedTableId}
          onSelectTable={setSelectedTableId}
          repositionEnabled={canManage}
          repositionBusyTableId={repositionBusyId}
          onReposition={(id, x, y) => void handleReposition(id, x, y)}
        />
      )}

      {selectedTable && (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 flex flex-wrap items-center gap-4">
          <div>
            <p className="font-semibold text-on-surface">
              {selectedTable.tableNumber}
            </p>
            <p className="text-label-sm text-on-surface-variant">
              <Num>{selectedTable.capacity}</Num> {t.common.seats} ·{' '}
              {t.tables.shapes[selectedTable.shape]}
            </p>
          </div>
          <StatusBadge
            status={selectedTable.status}
            label={t.status[selectedTable.status as TableStatusDto]}
            type="table"
          />
          {selectedFloorPlan && (
            <span className="text-label-sm text-on-surface-variant">
              {selectedFloorPlan.name}
              {selectedFloorPlan.isActive ? ` · ${t.floorPlan.active}` : ''}
            </span>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2 ms-auto">
              <button
                type="button"
                className="text-label-sm text-primary font-semibold"
                onClick={() => setEditTable(selectedTable)}
              >
                {t.common.edit}
              </button>
              <button
                type="button"
                className="text-label-sm text-primary font-semibold"
                onClick={() => setMoveTableTarget(selectedTable)}
              >
                {t.inventory.moveTable}
              </button>
              <button
                type="button"
                className="text-label-sm text-primary font-semibold"
                onClick={() => setStatusTable(selectedTable)}
              >
                {t.inventory.changeStatus}
              </button>
              <button
                type="button"
                className="text-label-sm text-error font-semibold"
                onClick={() => {
                  setDeleteError(null)
                  setDeleteTableTarget(selectedTable)
                }}
              >
                {t.common.delete}
              </button>
            </div>
          )}
        </div>
      )}

      {canManage && restaurantId && branchId && (
        <>
          <CreateFloorPlanDialog
            open={createFloorOpen}
            onClose={() => setCreateFloorOpen(false)}
            restaurantId={restaurantId}
            branchId={branchId}
            onCreated={(id) => selectFloorPlan(id)}
          />
          <TableFormDialog
            open={createTableOpen}
            onClose={() => setCreateTableOpen(false)}
            restaurantId={restaurantId}
            branchId={branchId}
            floorPlans={floorPlans}
            mode={
              createTableOpen && selectedFloorPlanId
                ? {
                    kind: 'create',
                    floorPlanId: selectedFloorPlanId,
                    defaultX: 40 + tables.length * 16,
                    defaultY: 40 + tables.length * 12,
                  }
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

function Header({
  selectedBranchLabel,
  t,
  canManage,
  onCreateFloor,
  onCreateTable,
}: {
  selectedBranchLabel: string | null
  t: ReturnType<typeof useLocale>['t']
  canManage: boolean
  onCreateFloor: () => void
  onCreateTable?: () => void
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-headline-lg text-on-surface">{t.floorPlan.title}</h1>
        <p className="text-body-md text-on-surface-variant">
          {t.floorPlan.subtitle}
          {selectedBranchLabel ? ` · ${selectedBranchLabel}` : ''}
        </p>
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateFloor}
            className="px-3 py-2 rounded-lg text-label-md border border-outline-variant/40 text-on-surface"
          >
            {t.inventory.createFloorPlan}
          </button>
          {onCreateTable && (
            <button
              type="button"
              onClick={onCreateTable}
              className="px-3 py-2 rounded-lg text-label-md bg-primary text-on-primary"
            >
              {t.inventory.createTable}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

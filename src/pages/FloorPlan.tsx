import { useState } from 'react'
import { isApiError } from '@/api/errors'
import type { TableDto } from '@/api/tables'
import { CreateFloorPlanDialog } from '@/components/inventory/CreateFloorPlanDialog'
import { ChangeTableStatusDialog } from '@/components/inventory/ChangeTableStatusDialog'
import { MoveTableDialog } from '@/components/inventory/MoveTableDialog'
import { TableFormDialog } from '@/components/inventory/TableFormDialog'
import { FloorPlanReadView } from '@/components/floor/FloorPlanReadView'
import { FloorTableInspector } from '@/components/floor/FloorTableInspector'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import {
  useFloorPlanTablesQuery,
  useSelectedFloorPlan,
} from '@/hooks/useInventoryQueries'
import {
  useActivateFloorPlanMutation,
  useCreateTableMutation,
  useDeleteTableMutation,
  useUpdateTableMutation,
} from '@/hooks/useInventoryMutations'
import { useCanManageInventory } from '@/hooks/usePermissions'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'
import {
  clampTableSize,
  isTablePlaced,
  layoutUnplaced,
  nextTableNumber,
  resolveTableSize,
  tableBox,
  withCompleteGeometry,
  type TablePreset,
} from '@/lib/floorGeometry'

/**
 * Backend-driven Floor Plan with production mutations.
 * Viewing a floor plan does not activate it — activation is explicit.
 * Geometry: save-on-drop via Update Table (no PATCH per pointer move).
 */
export function FloorPlanPage() {
  const { t } = useLocale()
  const { toast } = useToast()
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
  const createMutation = useCreateTableMutation()
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
  const [failedSave, setFailedSave] = useState<{
    tableId: string
    overrides: Parameters<typeof withCompleteGeometry>[1]
    message: string
  } | null>(null)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [placePreset, setPlacePreset] = useState<TablePreset | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)

  const restaurantId = selectedRestaurantId ?? ''
  const branchId = selectedBranchId ?? ''
  const tables = tablesQuery.data ?? []
  const selectedTable = tables.find((tb) => tb.tableId === selectedTableId)
  const floorPlans = floorPlansQuery.data ?? []
  const unplaced = tables.filter((tb) => !isTablePlaced(tb))
  const placingUnplaced =
    selectedTable != null && !isTablePlaced(selectedTable)

  const counts = {
    total: tables.length,
    available: tables.filter((tb) => tb.status === 'Available').length,
    occupied: tables.filter((tb) => tb.status === 'Occupied').length,
  }

  const persistGeometry = async (
    table: TableDto,
    overrides: Parameters<typeof withCompleteGeometry>[1],
  ): Promise<boolean> => {
    if (!restaurantId || !branchId) return false
    setRepositionError(null)
    setFailedSave((current) =>
      current?.tableId === table.tableId ? null : current,
    )
    setRepositionBusyId(table.tableId)
    try {
      await updateMutation.mutateAsync({
        tableId: table.tableId,
        body: withCompleteGeometry(table, overrides),
        scope: { restaurantId, branchId },
        floorPlanId: table.floorPlanId,
      })
      return true
    } catch (err) {
      setFailedSave({
        tableId: table.tableId,
        overrides,
        message: mapInventoryMutationError(err, t.inventory.errors),
      })
      return false
    } finally {
      setRepositionBusyId(null)
    }
  }

  const retryFailedSave = async () => {
    if (!failedSave) return
    const table = tables.find((tb) => tb.tableId === failedSave.tableId)
    if (!table) {
      setFailedSave(null)
      return
    }
    await persistGeometry(table, failedSave.overrides)
  }

  const handleDuplicate = async (table: TableDto) => {
    if (!restaurantId || !branchId) return
    setRepositionError(null)
    const size = resolveTableSize(table)
    try {
      const created = await createMutation.mutateAsync({
        restaurantId,
        branchId,
        body: {
          floorPlanId: table.floorPlanId,
          tableNumber: nextTableNumber(tables),
          capacity: table.capacity,
          shape: table.shape,
          positionX: (table.positionX ?? 48) + 32,
          positionY: (table.positionY ?? 48) + 32,
          width: size.width,
          height: size.height,
          rotation: table.rotation ?? 0,
          floor: table.floor,
          layer: table.layer ?? 0,
          indoor: table.indoor,
          vip: table.vip,
          smoking: table.smoking,
        },
      })
      setSelectedTableId(created.tableId)
      toast('success', t.floorPlan.duplicateSuccess)
    } catch (err) {
      setRepositionError(mapInventoryMutationError(err, t.inventory.errors))
    }
  }

  const handleReposition = async (
    tableId: string,
    positionX: number,
    positionY: number,
  ) => {
    const table = tables.find((tb) => tb.tableId === tableId)
    if (!table) return
    await persistGeometry(table, { positionX, positionY })
  }

  const handleResize = async (
    tableId: string,
    width: number,
    height: number,
  ) => {
    const table = tables.find((tb) => tb.tableId === tableId)
    if (!table) return
    const size =
      table.shape === 'Round'
        ? { width, height: width }
        : { width, height }
    await persistGeometry(table, size)
  }

  const handlePlaceAt = async (x: number, y: number) => {
    if (!restaurantId || !branchId || !selectedFloorPlanId) return
    setRepositionError(null)

    if (placingUnplaced && selectedTable && !placePreset) {
      await persistGeometry(selectedTable, { positionX: x, positionY: y })
      return
    }

    if (!placePreset) return
    try {
      await createMutation.mutateAsync({
        restaurantId,
        branchId,
        body: {
          floorPlanId: selectedFloorPlanId,
          tableNumber: nextTableNumber(tables),
          capacity: placePreset.capacity,
          shape: placePreset.shape,
          positionX: x,
          positionY: y,
          width: placePreset.width,
          height: placePreset.height,
          rotation: 0,
          indoor: true,
          vip: false,
          smoking: false,
          layer: 0,
        },
      })
      toast('success', t.floorPlan.createdSuccess)
    } catch (err) {
      setRepositionError(mapInventoryMutationError(err, t.inventory.errors))
    }
  }

  const handleAutoPlace = async () => {
    if (!restaurantId || !branchId || unplaced.length === 0) return
    setRepositionError(null)
    const occupied = tables.filter(isTablePlaced).map((tb) => tableBox(tb))
    const laid = layoutUnplaced(unplaced, occupied)
    for (const item of laid) {
      const table = tables.find((tb) => tb.tableId === item.tableId)
      if (!table) continue
      const ok = await persistGeometry(table, {
        positionX: item.x,
        positionY: item.y,
        width: item.width,
        height: item.height,
      })
      if (!ok) return
    }
    if (laid.length > 0) {
      toast('success', t.floorPlan.placedSuccess)
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
      toast('success', t.floorPlan.activateSuccess)
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

  const bumpSize = async (table: TableDto, delta: number) => {
    const size = resolveTableSize(table)
    const width = clampTableSize(size.width + delta)
    const height =
      table.shape === 'Round' ? width : clampTableSize(size.height + delta)
    await persistGeometry(table, { width, height })
  }

  const header = (
    <PageHeader
      title={t.floorPlan.title}
      subtitle={`${t.floorPlan.subtitle}${
        selectedBranch ? ` · ${formatBranchLabel(selectedBranch)}` : ''
      }`}
      actions={
        canManage ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateFloorOpen(true)}
            >
              {t.inventory.createFloorPlan}
            </Button>
            {selectedFloorPlanId ? (
              <Button
                type="button"
                onClick={() => setCreateTableOpen(true)}
              >
                {t.inventory.createTable}
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    />
  )

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
        {header}
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
      {header}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <span>{t.floorPlan.floorSelector}</span>
          <select
            value={selectedFloorPlanId ?? ''}
            onChange={(e) => {
              setSelectedTableId(null)
              setPlacePreset(null)
              selectFloorPlan(e.target.value)
            }}
            className="rounded-lg bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/20 min-h-10"
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

      {canManage && selectedFloorPlan && !selectedFloorPlan.isActive && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-3">
          <p className="text-label-md text-on-surface-variant flex-1">
            {t.floorPlan.viewingInactive}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={activateMutation.isPending}
            onClick={() => void handleActivate()}
            loading={activateMutation.isPending}
          >
            {activateMutation.isPending
              ? t.floorPlan.activating
              : t.floorPlan.activate}
          </Button>
          {activateError && (
            <p className="w-full text-label-sm text-error" role="alert">
              {activateError}
            </p>
          )}
        </div>
      )}

      <p className="text-label-sm text-on-surface-variant">
        {canManage ? t.floorPlan.studioHint : t.inventory.employeeBlocked}
      </p>
      {repositionError && (
        <p className="text-label-sm text-error" role="alert">
          {repositionError}
        </p>
      )}
      {failedSave && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border border-error/30 bg-error/5 px-4 py-3"
          role="alert"
        >
          <p className="text-label-md text-error flex-1">
            {t.floorPlan.saveFailedTitle} {failedSave.message}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={Boolean(repositionBusyId)}
            onClick={() => void retryFailedSave()}
          >
            {t.floorPlan.retrySave}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={Boolean(repositionBusyId)}
            onClick={() => setFailedSave(null)}
          >
            {t.floorPlan.discardSave}
          </Button>
        </div>
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

      {tablesQuery.isSuccess && (
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_280px] gap-3">
          <div className="min-w-0 space-y-3">
            {unplaced.length > 0 && canManage && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(repositionBusyId)}
                  onClick={() => void handleAutoPlace()}
                >
                  {t.floorPlan.autoPlace}
                </Button>
              </div>
            )}
            <FloorPlanReadView
              tables={tables}
              selectedTableId={selectedTableId}
              onSelectTable={(id) => {
                setSelectedTableId(id)
                if (id) setPlacePreset(null)
              }}
              repositionEnabled={canManage}
              repositionBusyTableId={repositionBusyId}
              onReposition={(id, x, y) => void handleReposition(id, x, y)}
              onResize={(id, w, h) => void handleResize(id, w, h)}
              snapEnabled={snapEnabled}
              onSnapChange={setSnapEnabled}
              placePreset={placePreset}
              onPlacePreset={(preset) => {
                setPlacePreset(preset)
                if (preset) setSelectedTableId(null)
              }}
              placeEnabled={Boolean(placePreset) || placingUnplaced}
              placeSize={
                placePreset ??
                (placingUnplaced && selectedTable
                  ? resolveTableSize(selectedTable)
                  : undefined)
              }
              onPlaceAt={(x, y) => void handlePlaceAt(x, y)}
              placing={createMutation.isPending || Boolean(repositionBusyId)}
            />
          </div>

          {selectedTable ? (
            <FloorTableInspector
              table={selectedTable}
              floorPlanName={selectedFloorPlan?.name ?? null}
              floorPlanActive={Boolean(selectedFloorPlan?.isActive)}
              canManage={canManage}
              busy={repositionBusyId === selectedTable.tableId}
              onRotate={() =>
                void persistGeometry(selectedTable, {
                  rotation: ((selectedTable.rotation ?? 0) + 45) % 360,
                })
              }
              onLarger={() => void bumpSize(selectedTable, 16)}
              onSmaller={() => void bumpSize(selectedTable, -16)}
              onEdit={() => setEditTable(selectedTable)}
              onMove={() => setMoveTableTarget(selectedTable)}
              onStatus={() => setStatusTable(selectedTable)}
              onDelete={() => {
                setDeleteError(null)
                setDeleteTableTarget(selectedTable)
              }}
              onDuplicate={() => void handleDuplicate(selectedTable)}
              duplicating={createMutation.isPending}
              onClose={() => setSelectedTableId(null)}
            />
          ) : (
            <div className="hidden lg:flex rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest p-4 text-body-sm text-on-surface-variant items-center">
              {canManage ? t.floorPlan.placePresetHint : t.floorPlan.selectTable}
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
                    defaultX: 48 + tables.length * 16,
                    defaultY: 48 + tables.length * 12,
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

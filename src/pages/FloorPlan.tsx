import { useEffect, useRef, useState } from 'react'
import { isApiError } from '@/api/errors'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { CreateTableRequest, TableDto } from '@/api/tables'
import { CreateFloorPlanDialog } from '@/components/inventory/CreateFloorPlanDialog'
import { ChangeTableStatusDialog } from '@/components/inventory/ChangeTableStatusDialog'
import { MoveTableDialog } from '@/components/inventory/MoveTableDialog'
import { TableFormDialog } from '@/components/inventory/TableFormDialog'
import { CreateFloorPlanAreaDialog } from '@/components/floor/CreateFloorPlanAreaDialog'
import { FloorPlanAreaBar } from '@/components/floor/FloorPlanAreaBar'
import { FloorPlanReadView } from '@/components/floor/FloorPlanReadView'
import { FloorSaveStatus, type FloorSaveState } from '@/components/floor/FloorSaveStatus'
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
  useBranchTablesQuery,
  useFloorPlanAreasQuery,
  useFloorPlanTablesQuery,
  useSelectedFloorPlan,
} from '@/hooks/useInventoryQueries'
import {
  useActivateFloorPlanMutation,
  useCreateTableMutation,
  useDeleteFloorPlanAreaMutation,
  useDeleteTableMutation,
  useUpdateTableMutation,
} from '@/hooks/useInventoryMutations'
import { useCanManageInventory } from '@/hooks/usePermissions'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'
import {
  nextHallSortOrder,
  partitionFrame,
  sectionIdForBox,
  tablesInsidePartition,
  visiblePartitions,
} from '@/lib/floorPartitions'
import {
  readSectionDrafts,
  writeSectionDrafts,
} from '@/lib/floorSectionDrafts'
import {
  clampTableSize,
  isTablePlaced,
  layoutUnplaced,
  nextTableNumber,
  resolveTableSize,
  tableBox,
  withCompleteGeometry,
  type TableBox,
  type TablePreset,
} from '@/lib/floorGeometry'
import { tableShapeKind } from '@/lib/tableShape'

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
  const areasQuery = useFloorPlanAreasQuery(
    selectedFloorPlanId,
    scopeStatus === 'ready' && Boolean(selectedFloorPlanId),
  )
  const tablesQuery = useFloorPlanTablesQuery(
    selectedFloorPlanId,
    scopeStatus === 'ready' && Boolean(selectedFloorPlanId),
  )
  const branchTablesQuery = useBranchTablesQuery()

  const activateMutation = useActivateFloorPlanMutation()
  const createMutation = useCreateTableMutation()
  const updateMutation = useUpdateTableMutation()
  const deleteMutation = useDeleteTableMutation()
  const deleteAreaMutation = useDeleteFloorPlanAreaMutation()

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
  const [viewMode, setViewMode] = useState<'all' | 'focus'>('focus')
  const [overviewPlanId, setOverviewPlanId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [drawHall, setDrawHall] = useState(false)
  const [hallDialogOpen, setHallDialogOpen] = useState(false)
  const [pendingPartition, setPendingPartition] = useState<TableBox | null>(null)
  const pendingPartitionRef = useRef<TableBox | null>(null)
  const [sectionRects, setSectionRects] = useState<Record<string, TableBox>>({})
  const [draftScope, setDraftScope] = useState('')
  const [highlightedAreaId, setHighlightedAreaId] = useState<string | null>(null)
  const [deleteHallTarget, setDeleteHallTarget] = useState<FloorPlanAreaDto | null>(
    null,
  )
  const [hallError, setHallError] = useState<string | null>(null)

  const restaurantId = selectedRestaurantId ?? ''
  const branchId = selectedBranchId ?? ''
  const tables = tablesQuery.data ?? []
  const halls = areasQuery.data ?? []
  const draftScopeKey =
    restaurantId && branchId && selectedFloorPlanId
      ? `${restaurantId}:${branchId}:${selectedFloorPlanId}`
      : ''

  if (draftScopeKey && draftScope !== draftScopeKey) {
    setDraftScope(draftScopeKey)
    setSectionRects(
      readSectionDrafts(restaurantId, branchId, selectedFloorPlanId!),
    )
  }

  useEffect(() => {
    if (!draftScopeKey || draftScope !== draftScopeKey || !selectedFloorPlanId) return
    writeSectionDrafts(restaurantId, branchId, selectedFloorPlanId, sectionRects)
  }, [
    branchId,
    draftScope,
    draftScopeKey,
    restaurantId,
    sectionRects,
    selectedFloorPlanId,
  ])

  useEffect(() => {
    if (!draftScopeKey || draftScope !== draftScopeKey) return
    const areas = areasQuery.data ?? []
    const floorTables = tablesQuery.data ?? []
    setSectionRects((current) => {
      let changed = false
      const next = { ...current }
      for (const area of areas) {
        if (next[area.floorPlanAreaId]) continue
        const frame = partitionFrame(
          floorTables.filter((table) => table.floorPlanAreaId === area.floorPlanAreaId),
        )
        if (!frame) continue
        next[area.floorPlanAreaId] = frame
        changed = true
      }
      return changed ? next : current
    })
  }, [areasQuery.data, draftScope, draftScopeKey, tablesQuery.data])
  const branchTables = branchTablesQuery.data ?? []
  const catalogTables = branchTables.length > 0 ? branchTables : tables
  const selectedTable = catalogTables.find((tb) => tb.tableId === selectedTableId)
  const floorPlans = floorPlansQuery.data ?? []
  const unplaced = tables.filter((tb) => !isTablePlaced(tb))
  const placingUnplaced =
    selectedTable != null && !isTablePlaced(selectedTable)

  const countedTables = viewMode === 'all' ? catalogTables : tables
  const counts = {
    total: countedTables.length,
    available: countedTables.filter((tb) => tb.status === 'Available').length,
    occupied: countedTables.filter((tb) => tb.status === 'Occupied').length,
  }
  const inspectedPlan =
    viewMode === 'focus'
      ? selectedFloorPlan
      : (floorPlans.find((fp) => fp.floorPlanId === overviewPlanId) ?? null)
  const layoutReady =
    viewMode === 'all' ? branchTablesQuery.isSuccess : tablesQuery.isSuccess
  const saveState: FloorSaveState =
    Boolean(repositionBusyId) ||
    updateMutation.isPending ||
    createMutation.isPending
      ? 'saving'
      : failedSave || repositionError
        ? 'failed'
        : dragging
          ? 'unsaved'
          : 'saved'
  const createOnFloorPlanId =
    viewMode === 'focus'
      ? selectedFloorPlanId
      : (overviewPlanId ?? selectedFloorPlanId)

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
    const table = catalogTables.find((tb) => tb.tableId === failedSave.tableId)
    if (!table) {
      setFailedSave(null)
      return
    }
    await persistGeometry(table, failedSave.overrides)
  }

  const createWithFreeNumber = async (body: Omit<CreateTableRequest, 'tableNumber'>) => {
    const rejected: string[] = []
    let lastError: unknown
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const tableNumber = nextTableNumber([...branchTables, ...tables], rejected)
      try {
        return await createMutation.mutateAsync({
          restaurantId,
          branchId,
          body: { ...body, tableNumber },
        })
      } catch (err) {
        lastError = err
        if (!isApiError(err) || err.code !== 'CONFLICT') throw err
        rejected.push(tableNumber)
      }
    }
    throw lastError
  }

  const handleDuplicate = async (table: TableDto) => {
    if (!restaurantId || !branchId) return
    setRepositionError(null)
    const size = resolveTableSize(table)
    try {
      const created = await createWithFreeNumber({
          floorPlanId: table.floorPlanId,
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
          floorPlanAreaId: table.floorPlanAreaId,
          color: table.color,
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
    const table = catalogTables.find((tb) => tb.tableId === tableId)
    if (!table) return
    await persistGeometry(table, { positionX, positionY })
  }

  const handleResize = async (
    tableId: string,
    width: number,
    height: number,
  ) => {
    const table = catalogTables.find((tb) => tb.tableId === tableId)
    if (!table) return
    const size =
      tableShapeKind(table.shape) === 'round'
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
      await createWithFreeNumber({
          floorPlanId: selectedFloorPlanId,
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
          ...(() => {
            const areaId =
              highlightedAreaId ??
              sectionIdForBox(visiblePartitions(halls, tables, sectionRects), {
                x,
                y,
                width: placePreset.width,
                height: placePreset.height,
              })
            return areaId ? { floorPlanAreaId: areaId } : {}
          })(),
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

  const rememberSection = (areaId: string, region: TableBox) => {
    setSectionRects((current) => ({ ...current, [areaId]: region }))
  }

  const assignTablesInRegion = async (areaId: string, region: TableBox) => {
    let assigned = false
    for (const table of tablesInsidePartition(tables, region)) {
      const ok = await persistGeometry(table, { floorPlanAreaId: areaId })
      if (!ok) return false
      assigned = true
    }
    if (assigned) toast('success', t.floorPlan.hallAssigned)
    return true
  }

  const handleHallCreated = async (area: FloorPlanAreaDto) => {
    const region = pendingPartitionRef.current ?? pendingPartition
    pendingPartitionRef.current = null
    setPendingPartition(null)
    setHighlightedAreaId(area.floorPlanAreaId)
    if (!region) {
      toast('success', t.floorPlan.hallCreated)
      return
    }
    rememberSection(area.floorPlanAreaId, region)
    const ok = await assignTablesInRegion(area.floorPlanAreaId, region)
    if (ok && tablesInsidePartition(tables, region).length === 0) {
      toast('success', t.floorPlan.hallCreated)
    }
  }

  const handleDrawHall = (box: TableBox) => {
    setDrawHall(false)
    if (highlightedAreaId) {
      rememberSection(highlightedAreaId, box)
      void assignTablesInRegion(highlightedAreaId, box)
      return
    }
    pendingPartitionRef.current = box
    setPendingPartition(box)
    setHallDialogOpen(true)
  }

  const confirmDeleteHall = async () => {
    if (!deleteHallTarget || !restaurantId || !branchId) return
    setHallError(null)
    try {
      await deleteAreaMutation.mutateAsync({
        restaurantId,
        branchId,
        floorPlanId: deleteHallTarget.floorPlanId,
        areaId: deleteHallTarget.floorPlanAreaId,
      })
      if (highlightedAreaId === deleteHallTarget.floorPlanAreaId) {
        setHighlightedAreaId(null)
      }
      setSectionRects((current) => {
        const next = { ...current }
        delete next[deleteHallTarget.floorPlanAreaId]
        return next
      })
      setDeleteHallTarget(null)
      toast('success', t.floorPlan.hallDeleted)
    } catch (err) {
      const blocked = isApiError(err) && err.code === 'CONFLICT'
      const message = blocked
        ? t.floorPlan.hallDeleteBlocked
        : mapInventoryMutationError(err, t.inventory.errors)
      setHallError(message)
      toast('error', message)
    }
  }

  const handleAreaCreated = (floorPlanId: string) => {
    setViewMode('focus')
    setOverviewPlanId(floorPlanId)
    setSelectedTableId(null)
    setPlacePreset(null)
    selectFloorPlan(floorPlanId)
    toast('success', t.floorPlan.areaCreated)
  }

  const handleActivate = async (floorPlanId?: string) => {
    const id = floorPlanId ?? selectedFloorPlan?.floorPlanId
    if (!id || !restaurantId || !branchId) return
    setActivateError(null)
    try {
      await activateMutation.mutateAsync({
        restaurantId,
        branchId,
        floorPlanId: id,
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
      tableShapeKind(table.shape) === 'round'
        ? width
        : clampTableSize(size.height + delta)
    await persistGeometry(table, { width, height })
  }

  const header = (
    <PageHeader
      title={t.floorPlan.title}
      subtitle={`${t.floorPlan.subtitle}${
        selectedBranch ? ` · ${formatBranchLabel(selectedBranch)}` : ''
      }`}
      actions={
        canManage && selectedFloorPlanId ? (
          <Button type="button" onClick={() => setCreateTableOpen(true)}>
            {t.inventory.createTable}
          </Button>
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
                {t.floorPlan.addArea}
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
            variant="floorPlan"
            onCreated={handleAreaCreated}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {layoutReady ? <FloorSaveStatus state={saveState} /> : <span />}
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

      {canManage && inspectedPlan && !inspectedPlan.isActive && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/30 bg-warning-light px-4 py-3">
          <MaterialIcon name="visibility_off" size={18} className="text-warning" />
          <p className="text-label-md text-on-surface flex-1 min-w-48">
            {t.floorPlan.areaNotVisible}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={activateMutation.isPending}
            onClick={() => void handleActivate(inspectedPlan.floorPlanId)}
            loading={activateMutation.isPending}
          >
            {activateMutation.isPending
              ? t.floorPlan.activating
              : t.floorPlan.showToGuests}
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

      {(viewMode === 'all' ? branchTablesQuery.isLoading : tablesQuery.isLoading) && (
        <p className="py-8 text-center text-on-surface-variant">
          {t.floorPlan.loadingTables}
        </p>
      )}

      {(viewMode === 'all' ? branchTablesQuery.isError : tablesQuery.isError) && (
        <EmptyState
          icon="error"
          title={t.floorPlan.errorTitle}
          description={t.floorPlan.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() =>
                void (viewMode === 'all'
                  ? branchTablesQuery.refetch()
                  : tablesQuery.refetch())
              }
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {layoutReady && (
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_280px] gap-3">
          <div className="min-w-0 space-y-3">
            {areasQuery.isError && (
              <p className="text-label-sm text-error" role="alert">
                {t.floorPlan.errorBody}{' '}
                <button
                  type="button"
                  className="font-semibold text-primary"
                  onClick={() => void areasQuery.refetch()}
                >
                  {t.scope.retry}
                </button>
              </p>
            )}
            {hallError && (
              <p className="text-label-sm text-error" role="alert">
                {hallError}
              </p>
            )}
            <FloorPlanAreaBar
              areas={halls}
              tables={tables}
              highlightedAreaId={highlightedAreaId}
              drawHall={drawHall}
              canManage={canManage}
              floorName={selectedFloorPlan?.name}
              activePresetId={placePreset?.id ?? null}
              placing={createMutation.isPending || Boolean(repositionBusyId)}
              onPreset={(preset) => {
                setDrawHall(false)
                setPlacePreset(preset)
                if (preset) setSelectedTableId(null)
              }}
              onHighlight={setHighlightedAreaId}
              onAdd={() => {
                setDrawHall(false)
                pendingPartitionRef.current = null
                setPendingPartition(null)
                setHallDialogOpen(true)
              }}
              onToggleDraw={() => {
                setPlacePreset(null)
                setDrawHall((current) => !current)
              }}
              onDelete={(area) => {
                setHallError(null)
                setDeleteHallTarget(area)
              }}
            />
            {viewMode === 'focus' && unplaced.length > 0 && canManage && (
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
              key={selectedFloorPlanId ?? 'floor'}
              tables={tables}
              areas={halls}
              drawHall={drawHall && canManage}
              sectionDrafts={sectionRects}
              onDrawHall={handleDrawHall}
              hidePresets
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
              onDragActiveChange={setDragging}
            />
          </div>

          {selectedTable ? (
            <FloorTableInspector
              table={selectedTable}
              floorPlanName={
                floorPlans.find((fp) => fp.floorPlanId === selectedTable.floorPlanId)
                  ?.name ?? null
              }
              floorPlanActive={Boolean(
                floorPlans.find((fp) => fp.floorPlanId === selectedTable.floorPlanId)
                  ?.isActive,
              )}
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
              halls={
                selectedTable.floorPlanId === selectedFloorPlanId ? halls : []
              }
              onAssignHall={(areaId) =>
                void persistGeometry(selectedTable, { floorPlanAreaId: areaId })
              }
            />
          ) : (
            <aside className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm">
              <p className="text-label-lg font-semibold text-on-surface">
                {selectedFloorPlan?.name ?? t.floorPlan.title}
              </p>
              <p className="mt-2 text-body-sm text-on-surface-variant leading-relaxed">
                {t.floorPlan.addHallHint}
              </p>
              {halls.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {halls.map((area) => {
                    const count = tables.filter(
                      (table) => table.floorPlanAreaId === area.floorPlanAreaId,
                    ).length
                    return (
                      <li key={area.floorPlanAreaId}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-surface-container-low"
                          onClick={() =>
                            setHighlightedAreaId(
                              highlightedAreaId === area.floorPlanAreaId
                                ? null
                                : area.floorPlanAreaId,
                            )
                          }
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="min-w-0 flex-1 truncate text-label-md font-semibold">
                            {area.name}
                          </span>
                          <Num>{count}</Num>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </aside>
          )}
        </div>
      )}

      {canManage && restaurantId && branchId && (
        <>
          {selectedFloorPlanId && (
            <CreateFloorPlanAreaDialog
              open={hallDialogOpen}
              onClose={() => {
                setHallDialogOpen(false)
                pendingPartitionRef.current = null
                setPendingPartition(null)
              }}
              restaurantId={restaurantId}
              branchId={branchId}
              floorPlanId={selectedFloorPlanId}
              sortOrder={nextHallSortOrder(halls)}
              existingNames={halls.map((area) => area.name)}
              drawn={pendingPartition != null}
              onCreated={(area) => void handleHallCreated(area)}
            />
          )}
          <ConfirmDialog
            open={deleteHallTarget != null}
            onClose={() => {
              if (!deleteAreaMutation.isPending) setDeleteHallTarget(null)
            }}
            onConfirm={() => void confirmDeleteHall()}
            title={t.floorPlan.hallDeleteTitle}
            message={t.floorPlan.hallDeleteMessage.replace(
              '{name}',
              deleteHallTarget?.name ?? '',
            )}
            confirmLabel={t.floorPlan.deleteHall}
            cancelLabel={t.common.cancel}
            variant="danger"
            busy={deleteAreaMutation.isPending}
            closeOnConfirm={false}
          />
          <CreateFloorPlanDialog
            open={createFloorOpen}
            onClose={() => setCreateFloorOpen(false)}
            restaurantId={restaurantId}
            branchId={branchId}
            variant="floorPlan"
            existingNames={floorPlans.map((fp) => fp.name)}
            onCreated={handleAreaCreated}
          />
          <TableFormDialog
            open={createTableOpen}
            onClose={() => setCreateTableOpen(false)}
            restaurantId={restaurantId}
            branchId={branchId}
            floorPlans={floorPlans}
            mode={
              createTableOpen && createOnFloorPlanId
                ? {
                    kind: 'create',
                    floorPlanId: createOnFloorPlanId,
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

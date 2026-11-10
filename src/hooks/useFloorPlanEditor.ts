import { useState } from 'react'
import { isApiError } from '@/api/errors'
import {
  areaToWriteRequest,
  type FloorPlanAreaDto,
  type FloorPlanAreaFeature,
} from '@/api/floorPlanAreas'
import { tableToUpdateRequest, type TableDto, type UpdateTableRequest } from '@/api/tables'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import {
  useActivateFloorPlanMutation,
  useChangeTableStatusMutation,
  useCreateFloorPlanAreaMutation,
  useCreateFloorPlanMutation,
  useCreateTableMutation,
  useDeleteFloorPlanAreaMutation,
  useDeleteTableMutation,
  useMergeTablesMutation,
  useSplitTableMutation,
  useUpdateFloorPlanAreaMutation,
  useUpdateTableMutation,
  type InventoryMutationScope,
} from '@/hooks/useInventoryMutations'
import {
  areaForRect,
  areaRect,
  areasOnFloor,
  canPlace,
  firstFreeCell,
  flagsFromFeatures,
  GRID_CELL,
  gridSize,
  occupiedRects,
  rectContains,
  rectToAreaLayout,
  rectToTableGeometry,
  rectsOverlap,
  shapeDtoOf,
  shapeSpan,
  tableRect,
  type CellRect,
  type TableShapeChoice,
} from '@/lib/floorGrid'
import { tableFloor } from '@/lib/floors'
import { mapInventoryMutationError } from '@/lib/inventoryMutationErrors'

export interface TableDraft {
  tableNumber: string
  capacity: number
  shape: TableShapeChoice
  floorPlanAreaId: string | null
}

export interface AreaDraft {
  name: string
  color: string
  features: FloorPlanAreaFeature[]
}

interface FloorPlanEditorInput {
  scope: InventoryMutationScope | null
  floorPlanId: string | null
  /** Every table of the floor plan (placed or not). */
  tables: TableDto[]
  areas: FloorPlanAreaDto[]
  currentFloor: number
}

/**
 * Domain actions of the venue plan editor. Every table change is optimistic
 * (the cache moves first, the PATCH runs in the background); a failed save
 * rolls back and is offered for retry.
 */
export function useFloorPlanEditor({
  scope,
  floorPlanId,
  tables,
  areas,
  currentFloor,
}: FloorPlanEditorInput) {
  const { t } = useLocale()
  const { toast } = useToast()
  const updateTable = useUpdateTableMutation()
  const createTable = useCreateTableMutation()
  const deleteTable = useDeleteTableMutation()
  const changeStatus = useChangeTableStatusMutation()
  const merge = useMergeTablesMutation()
  const split = useSplitTableMutation()
  const createArea = useCreateFloorPlanAreaMutation()
  const updateArea = useUpdateFloorPlanAreaMutation()
  const deleteArea = useDeleteFloorPlanAreaMutation()
  const createPlan = useCreateFloorPlanMutation()
  const activatePlan = useActivateFloorPlanMutation()
  const [failedSave, setFailedSave] = useState<{
    tableId: string
    changes: Partial<UpdateTableRequest>
    message: string
  } | null>(null)

  const errorText = (err: unknown) => mapInventoryMutationError(err, t.inventory.errors)
  const areaById = (id: string | null) =>
    areas.find((area) => area.floorPlanAreaId === id) ?? null
  const floorAreas = areasOnFloor(areas, currentFloor)

  const saveTable = async (
    table: TableDto,
    changes: Partial<UpdateTableRequest>,
  ): Promise<boolean> => {
    if (!scope) return false
    setFailedSave((current) => (current?.tableId === table.tableId ? null : current))
    try {
      await updateTable.mutateAsync({
        tableId: table.tableId,
        body: tableToUpdateRequest(table, changes),
        scope,
        floorPlanId: table.floorPlanId,
      })
      return true
    } catch (err) {
      setFailedSave({ tableId: table.tableId, changes, message: errorText(err) })
      return false
    }
  }

  /** Area membership + legacy flags that go with landing at `rect`. */
  const areaChanges = (table: TableDto, rect: CellRect): Partial<UpdateTableRequest> => {
    const areaId = areaForRect(rect, floorAreas, areaById(table.floorPlanAreaId))
    if (areaId === table.floorPlanAreaId) return {}
    const area = areaById(areaId)
    return {
      floorPlanAreaId: areaId,
      ...(area ? flagsFromFeatures(area.features) : {}),
    }
  }

  const bounds = gridSize([
    ...occupiedRects(tables, currentFloor),
    ...floorAreas.map((area) => areaRect(area)!),
  ])
  // The grid always offers one more row/column to grow into.
  const placeBounds = { cols: bounds.cols + 1, rows: bounds.rows + 1 }

  /** Moves a placed table, or places a queued one, at `rect` on the current floor. */
  const placeTable = (table: TableDto, rect: CellRect): boolean => {
    const occupied = occupiedRects(tables, currentFloor, table.tableId)
    if (!canPlace(rect, occupied, placeBounds)) {
      toast('error', t.floorGrid.cellTaken)
      return false
    }
    void saveTable(table, {
      ...rectToTableGeometry(rect),
      floor: currentFloor,
      ...areaChanges(table, rect),
    })
    return true
  }

  /** Long tables turn by swapping their span; round and square ones need not. */
  const rotateTable = (table: TableDto) => {
    const rect = tableRect(table)
    if (rect.cols === rect.rows) return
    const turned = { ...rect, cols: rect.rows, rows: rect.cols }
    const occupied = occupiedRects(tables, tableFloor(table), table.tableId)
    if (!canPlace(turned, occupied, placeBounds)) {
      toast('error', t.floorGrid.cellTaken)
      return
    }
    void saveTable(table, rectToTableGeometry(turned))
  }

  /** Spot for a new table: first free square of its area on this floor. */
  const spotInArea = (areaId: string | null, span: { cols: number; rows: number }) => {
    const area = areaById(areaId)
    const box = area ? areaRect(area) : null
    if (!area || !box || (area.floor ?? 0) !== currentFloor) return null
    return firstFreeCell(span, occupiedRects(tables, currentFloor), box)
  }

  const createFromDraft = async (draft: TableDraft): Promise<boolean> => {
    if (!scope || !floorPlanId) return false
    const span = shapeSpan(draft.shape, draft.capacity)
    const spot = spotInArea(draft.floorPlanAreaId, span)
    const area = areaById(draft.floorPlanAreaId)
    try {
      await createTable.mutateAsync({
        ...scope,
        body: {
          floorPlanId,
          tableNumber: draft.tableNumber,
          capacity: draft.capacity,
          shape: shapeDtoOf(draft.shape),
          floor: currentFloor,
          layer: 0,
          floorPlanAreaId: draft.floorPlanAreaId,
          ...(area ? flagsFromFeatures(area.features) : {}),
          ...(spot
            ? rectToTableGeometry(spot)
            : { width: span.cols * GRID_CELL, height: span.rows * GRID_CELL, rotation: 0 }),
        },
      })
      toast(
        'success',
        (spot ? t.floorGrid.created : t.floorGrid.createdQueued).replace(
          '{table}',
          draft.tableNumber,
        ),
      )
      return true
    } catch (err) {
      throw new Error(errorText(err), { cause: err })
    }
  }

  /** Number, seats, shape and area. A new area moves the table into it. */
  const editFromDraft = async (table: TableDto, draft: TableDraft): Promise<void> => {
    const span = shapeSpan(draft.shape, draft.capacity)
    const current = tableRect(table)
    const vertical = current.rows > current.cols
    const footprint =
      vertical && span.cols !== span.rows ? { cols: span.rows, rows: span.cols } : span
    const changes: Partial<UpdateTableRequest> = {
      tableNumber: draft.tableNumber,
      capacity: draft.capacity,
      shape: shapeDtoOf(draft.shape),
      width: footprint.cols * GRID_CELL,
      height: footprint.rows * GRID_CELL,
      rotation: 0,
    }
    if (draft.floorPlanAreaId !== table.floorPlanAreaId) {
      const area = areaById(draft.floorPlanAreaId)
      changes.floorPlanAreaId = draft.floorPlanAreaId
      Object.assign(changes, area ? flagsFromFeatures(area.features) : {})
      const box = area ? areaRect(area) : null
      const inside = box && table.positionX != null && rectContains(box, current)
      if (box && !inside) {
        const spot = spotInArea(draft.floorPlanAreaId, footprint)
        if (spot) Object.assign(changes, rectToTableGeometry(spot))
        else Object.assign(changes, { positionX: null, positionY: null })
      }
    } else if (table.positionX != null) {
      // A bigger table must still fit where it stands, or it goes back to the queue.
      const grown = { ...current, ...footprint }
      const occupied = occupiedRects(tables, tableFloor(table), table.tableId)
      if (!canPlace(grown, occupied, placeBounds)) {
        Object.assign(changes, { positionX: null, positionY: null })
      }
    }
    if (!scope) return
    try {
      await updateTable.mutateAsync({
        tableId: table.tableId,
        body: tableToUpdateRequest(table, changes),
        scope,
        floorPlanId: table.floorPlanId,
      })
    } catch (err) {
      throw new Error(errorText(err), { cause: err })
    }
  }

  const removeTable = async (table: TableDto): Promise<void> => {
    if (!scope) return
    try {
      await deleteTable.mutateAsync({
        tableId: table.tableId,
        scope,
        floorPlanId: table.floorPlanId,
      })
      toast('success', t.floorGrid.deleted)
    } catch (err) {
      throw new Error(errorText(err), { cause: err })
    }
  }

  /** Staff only toggle out of service; every other status comes from bookings. */
  const toggleOutOfService = async (table: TableDto) => {
    if (!scope) return
    try {
      await changeStatus.mutateAsync({
        tableId: table.tableId,
        body: { status: table.status === 'Disabled' ? 'Available' : 'Disabled' },
        scope,
        floorPlanId: table.floorPlanId,
      })
    } catch (err) {
      toast('error', errorText(err))
    }
  }

  const mergeTables = async (tableIds: string[]): Promise<boolean> => {
    if (!scope || !floorPlanId) return false
    try {
      const unit = await merge.mutateAsync({ body: { tableIds }, scope, floorPlanId })
      toast('success', t.floorGrid.merged.replace('{n}', String(unit.effectiveCapacity)))
      return true
    } catch (err) {
      toast('error', errorText(err))
      return false
    }
  }

  const splitTable = async (table: TableDto) => {
    if (!scope) return
    try {
      await split.mutateAsync({ tableId: table.tableId, scope, floorPlanId: table.floorPlanId })
      toast('success', t.floorGrid.splitDone)
    } catch (err) {
      toast('error', errorText(err))
    }
  }

  /** Tables standing in `rect` on the current floor join the area. */
  const adoptTablesInRect = (area: FloorPlanAreaDto, rect: CellRect) => {
    for (const table of tables) {
      if (table.positionX == null || tableFloor(table) !== currentFloor) continue
      const box = tableRect(table)
      if (!rectContains(rect, { ...box, cols: 1, rows: 1 })) continue
      if (table.floorPlanAreaId === area.floorPlanAreaId) continue
      void saveTable(table, {
        floorPlanAreaId: area.floorPlanAreaId,
        ...flagsFromFeatures(area.features),
      })
    }
  }

  const rectFreeOfAreas = (rect: CellRect, exceptAreaId?: string) =>
    !floorAreas.some((area) => {
      if (area.floorPlanAreaId === exceptAreaId) return false
      const box = areaRect(area)
      return box != null && rectsOverlap(box, rect)
    })

  const areaError = (err: unknown) =>
    isApiError(err) && err.code === 'CONFLICT' ? t.floorGrid.areaNameTaken : errorText(err)

  const createAreaFromDraft = async (draft: AreaDraft, rect: CellRect | null) => {
    if (!scope || !floorPlanId) return
    try {
      const created = await createArea.mutateAsync({
        ...scope,
        floorPlanId,
        body: {
          ...draft,
          sortOrder: areas.reduce((max, area) => Math.max(max, area.sortOrder + 1), 0),
          floor: currentFloor,
          ...(rect ? { layout: rectToAreaLayout(rect) } : {}),
        },
      })
      if (rect) adoptTablesInRect(created, rect)
      toast('success', t.floorGrid.areaSaved)
    } catch (err) {
      throw new Error(areaError(err), { cause: err })
    }
  }

  /** Saves name/color/features; tables of the area pick up the new features. */
  const editArea = async (area: FloorPlanAreaDto, draft: AreaDraft) => {
    if (!scope || !floorPlanId) return
    try {
      const saved = await updateArea.mutateAsync({
        ...scope,
        floorPlanId,
        areaId: area.floorPlanAreaId,
        body: areaToWriteRequest(area, draft),
      })
      const flags = flagsFromFeatures(saved.features)
      for (const table of tables) {
        if (table.floorPlanAreaId !== area.floorPlanAreaId) continue
        if (
          table.indoor === flags.indoor &&
          table.vip === flags.vip &&
          table.smoking === flags.smoking
        ) {
          continue
        }
        void saveTable(table, flags)
      }
      toast('success', t.floorGrid.areaSaved)
    } catch (err) {
      throw new Error(areaError(err), { cause: err })
    }
  }

  const redrawArea = async (area: FloorPlanAreaDto, rect: CellRect) => {
    if (!scope || !floorPlanId) return
    try {
      const saved = await updateArea.mutateAsync({
        ...scope,
        floorPlanId,
        areaId: area.floorPlanAreaId,
        body: areaToWriteRequest(area, { floor: currentFloor, layout: rectToAreaLayout(rect) }),
      })
      adoptTablesInRect(saved, rect)
    } catch (err) {
      toast('error', areaError(err))
    }
  }

  /** Tables leave the area first (the API refuses to delete a used area). */
  const removeArea = async (area: FloorPlanAreaDto) => {
    if (!scope || !floorPlanId) return
    const members = tables.filter((table) => table.floorPlanAreaId === area.floorPlanAreaId)
    for (const table of members) {
      const ok = await saveTable(table, { floorPlanAreaId: null })
      if (!ok) return
    }
    try {
      await deleteArea.mutateAsync({ ...scope, floorPlanId, areaId: area.floorPlanAreaId })
      toast('success', t.floorGrid.areaDeleted)
    } catch (err) {
      toast('error', errorText(err))
    }
  }

  const startPlan = async (name: string) => {
    if (!scope) return
    try {
      const plan = await createPlan.mutateAsync({ ...scope, name })
      await activatePlan.mutateAsync({ ...scope, floorPlanId: plan.floorPlanId })
    } catch (err) {
      toast('error', errorText(err))
    }
  }

  const publish = async () => {
    if (!scope || !floorPlanId) return
    try {
      await activatePlan.mutateAsync({ ...scope, floorPlanId })
      toast('success', t.floorGrid.published)
    } catch (err) {
      toast('error', errorText(err))
    }
  }

  const retryFailedSave = () => {
    if (!failedSave) return
    const table = tables.find((tb) => tb.tableId === failedSave.tableId)
    if (!table) {
      setFailedSave(null)
      return
    }
    void saveTable(table, failedSave.changes)
  }

  return {
    bounds,
    floorAreas,
    placeTable,
    rotateTable,
    createFromDraft,
    editFromDraft,
    removeTable,
    toggleOutOfService,
    mergeTables,
    splitTable,
    createAreaFromDraft,
    editArea,
    redrawArea,
    removeArea,
    rectFreeOfAreas,
    startPlan,
    publish,
    failedSave,
    retryFailedSave,
    dismissFailedSave: () => setFailedSave(null),
    busy: {
      creating: createTable.isPending,
      deleting: deleteTable.isPending,
      merging: merge.isPending,
      area: createArea.isPending || updateArea.isPending || deleteArea.isPending,
      starting: createPlan.isPending || activatePlan.isPending,
    },
  }
}

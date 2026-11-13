import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isApiError } from '@/api/errors'
import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import { FloorAreaDialog } from '@/components/floor/FloorAreaDialog'
import { FloorGridEditor, type GridMode } from '@/components/floor/FloorGridEditor'
import { FloorReviewDialog } from '@/components/floor/FloorReviewDialog'
import { FloorTableList } from '@/components/floor/FloorTableList'
import { TableFormDialog } from '@/components/inventory/TableFormDialog'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useFloorPlanEditor } from '@/hooks/useFloorPlanEditor'
import {
  useBranchTablesQuery,
  useFloorPlanAreasQuery,
  useFloorPlanTablesQuery,
  useSelectedFloorPlan,
} from '@/hooks/useInventoryQueries'
import { useCanManageInventory } from '@/hooks/usePermissions'
import { areaFloor, areaRect, type CellRect } from '@/lib/floorGrid'
import { floorLabel, listFloors, nextFloor } from '@/lib/floors'
import { cn } from '@/lib/utils'
import { apiErrorText } from '@/lib/apiErrorText'

type View = 'map' | 'list'

/**
 * "مخطط المكان" (CR WJ-R-2026-002 p.04–05): one plan per branch with a tab
 * per floor, areas drawn on a fixed grid, tables placed by drag, a list view
 * and a review before guests see it. Replaces the separate Tables page.
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
  const [searchParams, setSearchParams] = useSearchParams()
  const view: View = searchParams.get('view') === 'list' ? 'list' : 'map'
  const { floorPlansQuery, selectedFloorPlanId, selectedFloorPlan } = useSelectedFloorPlan()
  const ready = scopeStatus === 'ready' && Boolean(selectedFloorPlanId)
  const areasQuery = useFloorPlanAreasQuery(selectedFloorPlanId, ready)
  const tablesQuery = useFloorPlanTablesQuery(selectedFloorPlanId, ready)
  const branchTablesQuery = useBranchTablesQuery(scopeStatus === 'ready')

  const [currentFloor, setCurrentFloor] = useState(0)
  const [openedFloors, setOpenedFloors] = useState<number[]>([])
  const [mode, setMode] = useState<GridMode>({ kind: 'idle' })
  const [redrawTarget, setRedrawTarget] = useState<FloorPlanAreaDto | null>(null)
  const [pendingRect, setPendingRect] = useState<CellRect | null>(null)
  const [areaDialog, setAreaDialog] = useState<{ area: FloorPlanAreaDto | null } | null>(null)
  const [deleteAreaTarget, setDeleteAreaTarget] = useState<FloorPlanAreaDto | null>(null)
  const [tableDialog, setTableDialog] = useState<{ table: TableDto | null } | null>(null)
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableDto | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const tables = tablesQuery.data ?? []
  const areas = areasQuery.data ?? []
  const branchTables = branchTablesQuery.data?.length ? branchTablesQuery.data : tables
  const scope =
    selectedRestaurantId && selectedBranchId
      ? { restaurantId: selectedRestaurantId, branchId: selectedBranchId }
      : null
  const editor = useFloorPlanEditor({
    scope,
    floorPlanId: selectedFloorPlanId,
    tables,
    areas,
    currentFloor,
  })

  const floors = listFloors(tables, [...openedFloors, ...areas.map(areaFloor)])
  const floorLabels = {
    ground: t.floorPlan.floorGround,
    ordinals: t.floorPlan.floorOrdinals,
    numbered: t.floorPlan.floorNumbered,
  }
  const floorAreasAll = areas.filter((area) => areaFloor(area) === currentFloor)

  const setView = (next: View) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'list') params.set('view', 'list')
    else params.delete('view')
    setSearchParams(params, { replace: true })
    setMode({ kind: 'idle' })
  }

  const startDraw = (target: FloorPlanAreaDto | null) => {
    setRedrawTarget(target)
    setMode({ kind: 'drawArea' })
  }

  const handleAreaDrawn = (rect: CellRect) => {
    setMode({ kind: 'idle' })
    if (!editor.rectFreeOfAreas(rect, redrawTarget?.floorPlanAreaId)) {
      toast('error', t.floorGrid.areaOverlap)
      return
    }
    if (redrawTarget) {
      void editor.redrawArea(redrawTarget, rect)
      setRedrawTarget(null)
      return
    }
    setPendingRect(rect)
    setAreaDialog({ area: null })
  }

  const confirmDeleteTable = async () => {
    if (!deleteTableTarget) return
    setDeleteError(null)
    try {
      await editor.removeTable(deleteTableTarget)
      setDeleteTableTarget(null)
    } catch (err) {
      setDeleteError(apiErrorText(err, t, t.inventory.errors.unknown))
    }
  }

  const header = (
    <PageHeader
      title={t.floorGrid.title}
      subtitle={`${t.floorGrid.subtitle}${selectedBranch ? ` · ${formatBranchLabel(selectedBranch)}` : ''}`}
      actions={
        selectedFloorPlanId ? (
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label={t.floorGrid.viewLabel}
              className="inline-flex rounded-lg bg-surface-container-high p-1"
            >
              {(['map', 'list'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    'min-h-9 rounded-md px-4 text-label-md font-semibold',
                    view === option
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {option === 'map' ? t.floorGrid.viewMap : t.floorGrid.viewList}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(true)}>
              {t.floorGrid.review}
            </Button>
            {canManage && (
              <Button type="button" onClick={() => setTableDialog({ table: null })}>
                <MaterialIcon name="add" size={18} />
                {t.floorGrid.addTable}
              </Button>
            )}
          </div>
        ) : undefined
      }
    />
  )

  if (scopeStatus === 'loading' || scopeStatus === 'idle' || floorPlansQuery.isLoading) {
    return <div className="py-16 text-center text-on-surface-variant">{t.floorPlan.loading}</div>
  }

  if (floorPlansQuery.isError) {
    const forbidden =
      isApiError(floorPlansQuery.error) && floorPlansQuery.error.code === 'FORBIDDEN'
    return (
      <EmptyState
        icon="error"
        title={forbidden ? t.floorPlan.forbiddenTitle : t.floorPlan.errorTitle}
        description={forbidden ? t.floorPlan.forbiddenBody : t.floorPlan.errorBody}
        action={
          <button
            type="button"
            className="text-label-md font-semibold text-primary"
            onClick={() => void floorPlansQuery.refetch()}
          >
            {t.scope.retry}
          </button>
        }
      />
    )
  }

  if (!selectedFloorPlanId) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon="layers"
          title={t.floorGrid.startTitle}
          description={t.floorGrid.startBody}
          action={
            canManage ? (
              <Button
                type="button"
                loading={editor.busy.starting}
                onClick={() => void editor.startPlan(t.floorGrid.defaultPlanName)}
              >
                {t.floorGrid.startAction}
              </Button>
            ) : undefined
          }
        />
      </div>
    )
  }

  const loadFailed = tablesQuery.isError || areasQuery.isError

  return (
    <div className="min-w-0 space-y-4">
      {header}

      {!canManage && (
        <p className="text-label-sm text-on-surface-variant">{t.floorGrid.employeeView}</p>
      )}

      {editor.failedSave && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-error/30 bg-error/5 px-4 py-3"
        >
          <p className="min-w-48 flex-1 text-label-md text-error">
            {t.floorGrid.saveFailed} {editor.failedSave.message}
          </p>
          <Button type="button" size="sm" onClick={editor.retryFailedSave}>
            {t.floorGrid.retry}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={editor.dismissFailedSave}>
            {t.floorPlan.discardSave}
          </Button>
        </div>
      )}

      {loadFailed ? (
        <EmptyState
          icon="error"
          title={t.floorPlan.errorTitle}
          description={t.floorPlan.errorBody}
          action={
            <button
              type="button"
              className="text-label-md font-semibold text-primary"
              onClick={() => {
                void tablesQuery.refetch()
                void areasQuery.refetch()
              }}
            >
              {t.scope.retry}
            </button>
          }
        />
      ) : tablesQuery.isLoading || areasQuery.isLoading ? (
        <p className="py-8 text-center text-on-surface-variant">{t.floorPlan.loadingTables}</p>
      ) : view === 'list' ? (
        <FloorTableList
          tables={tables}
          areas={areas}
          floorLabels={floorLabels}
          canManage={canManage}
          merging={editor.busy.merging}
          onEdit={(table) => setTableDialog({ table })}
          onDelete={(table) => {
            setDeleteError(null)
            setDeleteTableTarget(table)
          }}
          onToggleService={(table) => void editor.toggleOutOfService(table)}
          onMerge={editor.mergeTables}
          onSplit={(table) => void editor.splitTable(table)}
        />
      ) : (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label={t.floorPlan.floorsLabel} className="flex flex-wrap gap-2">
              {floors.map((floor) => (
                <button
                  key={floor}
                  type="button"
                  role="tab"
                  aria-selected={floor === currentFloor}
                  onClick={() => {
                    setCurrentFloor(floor)
                    setMode({ kind: 'idle' })
                  }}
                  className={cn(
                    'min-h-10 rounded-lg px-4 text-label-md font-semibold',
                    floor === currentFloor
                      ? 'bg-inverse-surface text-inverse-on-surface'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
                  )}
                >
                  {floorLabel(floor, floorLabels)}
                </button>
              ))}
            </div>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const floor = nextFloor(floors)
                  setOpenedFloors((current) => [...current, floor])
                  setCurrentFloor(floor)
                }}
              >
                <MaterialIcon name="add" size={18} />
                {t.floorPlan.addFloor}
              </Button>
            )}
            {canManage && (
              <Button
                type="button"
                size="sm"
                variant={mode.kind === 'drawArea' ? 'primary' : 'outline'}
                className="ms-auto"
                aria-pressed={mode.kind === 'drawArea'}
                onClick={() =>
                  mode.kind === 'drawArea' ? setMode({ kind: 'idle' }) : startDraw(null)
                }
              >
                <MaterialIcon name={mode.kind === 'drawArea' ? 'close' : 'crop_free'} size={18} />
                {mode.kind === 'drawArea' ? t.floorGrid.cancel : t.floorGrid.drawArea}
              </Button>
            )}
          </div>

          {floorAreasAll.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t.floorGrid.areasLabel}>
              {floorAreasAll.map((area) => (
                <li key={area.floorPlanAreaId}>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => setAreaDialog({ area })}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-3 text-label-md hover:border-primary/50 disabled:cursor-default"
                  >
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                    {area.name}
                    {areaRect(area) == null && (
                      <span className="text-label-sm text-warning">· {t.floorGrid.areaNotDrawn}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {tables.length === 0 && floorAreasAll.length === 0 && (
            <p className="text-label-md text-on-surface-variant">{t.floorGrid.emptyGridHint}</p>
          )}

          <FloorGridEditor
            key={`${selectedFloorPlanId}:${currentFloor}`}
            tables={tables}
            areas={editor.floorAreas}
            currentFloor={currentFloor}
            bounds={editor.bounds}
            canManage={canManage}
            mode={mode}
            onAreaDrawn={handleAreaDrawn}
            onAreaSelect={(area) => canManage && setAreaDialog({ area })}
            onPlace={editor.placeTable}
            onRotate={editor.rotateTable}
            onEdit={(table) => setTableDialog({ table })}
            onDelete={(table) => {
              setDeleteError(null)
              setDeleteTableTarget(table)
            }}
          />
        </div>
      )}

      <FloorReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        tables={tables}
        areas={areas}
        floors={floors}
        floorLabels={floorLabels}
        live={Boolean(selectedFloorPlan?.isActive)}
        canManage={canManage}
        publishing={editor.busy.starting}
        onPublish={editor.publish}
      />

      {canManage && (
        <>
          <TableFormDialog
            open={tableDialog != null}
            onClose={() => setTableDialog(null)}
            table={tableDialog?.table ?? null}
            areas={areas}
            branchTables={branchTables}
            defaultAreaId={floorAreasAll.length === 1 ? floorAreasAll[0].floorPlanAreaId : null}
            onSubmit={(draft) =>
              tableDialog?.table
                ? editor.editFromDraft(tableDialog.table, draft)
                : editor.createFromDraft(draft)
            }
          />
          <FloorAreaDialog
            open={areaDialog != null}
            onClose={() => {
              setAreaDialog(null)
              setPendingRect(null)
            }}
            area={areaDialog?.area ?? null}
            existingNames={areas.map((area) => area.name)}
            onSubmit={(draft) =>
              areaDialog?.area
                ? editor.editArea(areaDialog.area, draft)
                : editor.createAreaFromDraft(draft, pendingRect)
            }
            onRedraw={() => {
              const area = areaDialog?.area ?? null
              setAreaDialog(null)
              if (area) {
                setCurrentFloor(areaFloor(area))
                startDraw(area)
                setView('map')
              }
            }}
            onDelete={() => {
              setDeleteAreaTarget(areaDialog?.area ?? null)
              setAreaDialog(null)
            }}
          />
          <ConfirmDialog
            open={deleteAreaTarget != null}
            onClose={() => setDeleteAreaTarget(null)}
            onConfirm={() => {
              if (deleteAreaTarget) void editor.removeArea(deleteAreaTarget)
              setDeleteAreaTarget(null)
            }}
            title={t.floorGrid.areaDeleteTitle}
            message={t.floorGrid.areaDeleteMessage.replace('{name}', deleteAreaTarget?.name ?? '')}
            confirmLabel={t.floorGrid.deleteArea}
            cancelLabel={t.common.cancel}
            variant="danger"
          />
          <ConfirmDialog
            open={deleteTableTarget != null}
            onClose={() => {
              if (!editor.busy.deleting) setDeleteTableTarget(null)
            }}
            onConfirm={() => void confirmDeleteTable()}
            title={t.inventory.deleteConfirmTitle}
            message={
              deleteError ??
              t.inventory.deleteConfirmMessage.replace(
                '{tableNumber}',
                deleteTableTarget?.tableNumber ?? '',
              )
            }
            confirmLabel={editor.busy.deleting ? t.inventory.deleting : t.inventory.deleteTable}
            cancelLabel={t.common.cancel}
            variant="danger"
            busy={editor.busy.deleting}
            closeOnConfirm={false}
          />
        </>
      )}
    </div>
  )
}

import type { TableDto, TableStatusDto } from '@/api/tables'
import { isTablePlaced } from '@/lib/floorGeometry'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useLocale } from '@/context/LocaleContext'

interface FloorTableInspectorProps {
  table: TableDto
  floorPlanName: string | null
  floorPlanActive: boolean
  canManage: boolean
  busy: boolean
  onRotate: () => void
  onLarger: () => void
  onSmaller: () => void
  onEdit: () => void
  onMove: () => void
  onStatus: () => void
  onDelete: () => void
  onDuplicate: () => void
  duplicating: boolean
  onClose: () => void
}

export function FloorTableInspector({
  table,
  floorPlanName,
  floorPlanActive,
  canManage,
  busy,
  onRotate,
  onLarger,
  onSmaller,
  onEdit,
  onMove,
  onStatus,
  onDelete,
  onDuplicate,
  duplicating,
  onClose,
}: FloorTableInspectorProps) {
  const { t } = useLocale()
  const isPlaced = isTablePlaced(table)

  return (
    <aside className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm max-lg:sticky max-lg:bottom-2 max-lg:z-20">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-on-surface truncate">
            {table.tableNumber}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            <Num>{table.capacity}</Num> {t.common.seats} ·{' '}
            {t.tables.shapes[table.shape]}
          </p>
        </div>
        <StatusBadge
          status={table.status}
          label={t.status[table.status as TableStatusDto]}
          type="table"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={t.common.close}
        >
          <MaterialIcon name="close" size={18} />
        </Button>
      </div>

      {floorPlanName && (
        <p className="mt-2 flex items-center gap-1 text-label-sm text-on-surface-variant">
          <MaterialIcon name="location_on" size={14} />
          {floorPlanName}
          {floorPlanActive ? ` · ${t.floorPlan.guestVisible}` : ''}
        </p>
      )}

      <p className="mt-2 text-label-sm text-on-surface-variant">
        {t.floorPlan.statusNote}
      </p>

      {isPlaced && (
        <p className="mt-2 text-label-sm text-on-surface-variant">
          {t.floorPlan.positionLabel}{' '}
          <Num>{table.positionX ?? 0}</Num>, <Num>{table.positionY ?? 0}</Num>
        </p>
      )}

      <p className="mt-2 text-label-sm text-on-surface">
        <span className="text-on-surface-variant">{t.floorPlan.flagsLabel}: </span>
        {table.indoor ? t.tables.indoor : t.tables.outdoor}
        {table.vip ? ` · ${t.tables.vip}` : ''}
        {table.smoking ? ` · ${t.tables.smoking}` : ''}
      </p>

      {canManage && (
        <>
          <p className="mt-3 text-label-sm text-on-surface-variant">
            {t.floorPlan.dragToMove}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onRotate}
              className="min-h-11"
            >
              <MaterialIcon name="rotate_right" size={16} />
              {t.floorPlan.rotate}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onSmaller}
              className="min-h-11"
            >
              {t.floorPlan.smaller}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onLarger}
              className="min-h-11"
            >
              {t.floorPlan.larger}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || duplicating}
              onClick={onDuplicate}
            >
              {duplicating ? t.floorPlan.duplicating : t.floorPlan.duplicate}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              {t.common.edit}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onMove}>
              {t.inventory.targetFloorPlan}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onStatus}>
              {t.inventory.changeStatus}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-error"
              onClick={onDelete}
            >
              {t.common.delete}
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}

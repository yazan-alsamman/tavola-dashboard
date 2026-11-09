import type { TableDto } from '@/api/tables'
import { FLOOR_TABLE_DRAG_TYPE } from '@/components/floor/FloorPlanReadView'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { tableShapeKind } from '@/lib/tableShape'
import { cn } from '@/lib/utils'

interface FloorTableQueueProps {
  /** Tables of this floor plan with no position yet. */
  tables: TableDto[]
  selectedTableId: string | null
  onSelect: (tableId: string) => void
  canManage: boolean
  busy?: boolean
}

/**
 * Side "queue" of tables that are not on the map yet. New tables land here
 * first; staff drag one onto the canvas (or tap it, then tap a free spot).
 */
export function FloorTableQueue({
  tables,
  selectedTableId,
  onSelect,
  canManage,
  busy = false,
}: FloorTableQueueProps) {
  const { t } = useLocale()
  const sorted = [...tables].sort((a, b) =>
    a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }),
  )

  return (
    <aside
      className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3"
      aria-labelledby="floor-table-queue-title"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id="floor-table-queue-title" className="text-label-lg font-semibold text-primary">
          {t.floorPlan.queueTitle} · <Num>{tables.length}</Num>
        </h3>
      </div>
      {sorted.length === 0 ? (
        <p className="text-label-sm text-on-surface-variant">{t.floorPlan.queueEmpty}</p>
      ) : (
        <>
          {canManage && (
            <p className="mb-3 text-label-sm text-on-surface-variant">{t.floorPlan.queueHint}</p>
          )}
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {sorted.map((table) => {
              const round = tableShapeKind(table.shape) === 'round'
              const selected = selectedTableId === table.tableId
              return (
                <li key={table.tableId} className="shrink-0">
                  <button
                    type="button"
                    draggable={canManage && !busy}
                    disabled={!canManage || busy}
                    aria-pressed={selected}
                    aria-label={t.floorPlan.queueDragLabel.replace('{table}', table.tableNumber)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(FLOOR_TABLE_DRAG_TYPE, table.tableId)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => onSelect(table.tableId)}
                    className={cn(
                      'flex min-h-12 w-full min-w-36 items-center gap-3 rounded-lg border px-3 py-2 text-start',
                      'cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-outline-variant/40 bg-surface hover:border-primary/60',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center border-2 border-primary/70 text-label-sm font-semibold text-on-surface',
                        round ? 'rounded-full' : 'rounded-md',
                      )}
                    >
                      {table.tableNumber}
                    </span>
                    <span className="min-w-0 flex-1 text-label-md text-on-surface">
                      {t.floorPlan.queueSeats.replace('{n}', String(table.capacity))}
                    </span>
                    {canManage && (
                      <MaterialIcon
                        name="drag_indicator"
                        size={18}
                        className="text-on-surface-variant"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </aside>
  )
}

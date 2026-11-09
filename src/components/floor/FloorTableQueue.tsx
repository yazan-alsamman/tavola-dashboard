import type { PointerEvent as ReactPointerEvent } from 'react'
import type { TableDto } from '@/api/tables'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { compareTableNumbers } from '@/lib/floorGrid'
import { cn } from '@/lib/utils'

interface FloorTableQueueProps {
  /** Tables of this floor plan with no square on the grid yet. */
  tables: TableDto[]
  pickedId: string | null
  draggingId: string | null
  canManage: boolean
  onPointerDown: (table: TableDto, e: ReactPointerEvent) => void
  /** Keyboard pick (Enter/Space); pointers go through onPointerDown. */
  onPick: (table: TableDto) => void
}

/**
 * "لم توضع بعد" box beside the grid. New tables wait here; staff drag one
 * onto the grid, or tap it and then tap a free square.
 */
export function FloorTableQueue({
  tables,
  pickedId,
  draggingId,
  canManage,
  onPointerDown,
  onPick,
}: FloorTableQueueProps) {
  const { t } = useLocale()
  const sorted = [...tables].sort((a, b) => compareTableNumbers(a.tableNumber, b.tableNumber))

  return (
    <aside
      className="min-w-0 self-start rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3"
      aria-labelledby="floor-table-queue-title"
    >
      <h3 id="floor-table-queue-title" className="mb-2 text-label-lg font-semibold text-primary">
        {t.floorGrid.queueTitle} · <Num>{tables.length}</Num>
      </h3>
      {sorted.length === 0 ? (
        <p className="text-label-sm text-on-surface-variant">{t.floorGrid.queueEmpty}</p>
      ) : (
        <>
          {canManage && (
            <p className="mb-3 text-label-sm text-on-surface-variant">{t.floorGrid.queueHint}</p>
          )}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 lg:grid-cols-1">
            {sorted.map((table) => {
              const picked = pickedId === table.tableId
              return (
                <li key={table.tableId}>
                  <button
                    type="button"
                    disabled={!canManage}
                    aria-pressed={picked}
                    aria-label={t.floorGrid.queueDragLabel.replace('{table}', table.tableNumber)}
                    onPointerDown={(e) => onPointerDown(table, e)}
                    onClick={(e) => {
                      if (e.detail === 0) onPick(table)
                    }}
                    className={cn(
                      'flex min-h-12 w-full touch-none items-center gap-3 rounded-lg border px-3 py-2 text-start',
                      'cursor-grab active:cursor-grabbing disabled:cursor-default',
                      picked
                        ? 'border-primary bg-primary/10'
                        : 'border-outline-variant/40 bg-surface hover:border-primary/60',
                      draggingId === table.tableId && 'opacity-40',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center border-2 border-primary/70 text-label-sm font-semibold text-on-surface',
                        table.shape === 'Round' ? 'rounded-full' : 'rounded-md',
                      )}
                    >
                      {table.tableNumber}
                    </span>
                    <span className="min-w-0 flex-1 text-label-md text-on-surface">
                      {t.floorGrid.seats.replace('{n}', String(table.capacity))}
                    </span>
                    {canManage && (
                      <MaterialIcon name="drag_indicator" size={18} className="text-on-surface-variant" />
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

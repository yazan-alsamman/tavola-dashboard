import type { FloorPlanAreaDto } from '@/api/floorPlanAreas'
import type { TableDto } from '@/api/tables'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { compareTableNumbers, summarizeFloors } from '@/lib/floorGrid'
import { floorLabel, type FloorLabels } from '@/lib/floors'

interface FloorReviewDialogProps {
  open: boolean
  onClose: () => void
  tables: TableDto[]
  areas: FloorPlanAreaDto[]
  floors: number[]
  floorLabels: FloorLabels
  /** Whether guests already see this plan. */
  live: boolean
  canManage: boolean
  publishing: boolean
  onPublish: () => Promise<void>
}

/**
 * "قبل الحفظ" summary: tables and seats per floor, and a warning for any table
 * still waiting off the grid. Changes are already saved; this is the last look
 * before guests see the plan.
 */
export function FloorReviewDialog({
  open,
  onClose,
  tables,
  areas,
  floors,
  floorLabels,
  live,
  canManage,
  publishing,
  onPublish,
}: FloorReviewDialogProps) {
  const { t } = useLocale()
  const summary = summarizeFloors(tables, areas, floors)
  const total = summary.floors.reduce(
    (sum, row) => ({ tables: sum.tables + row.tables, seats: sum.seats + row.seats, areas: sum.areas + row.areas }),
    { tables: 0, seats: 0, areas: 0 },
  )
  const unplaced = [...summary.unplaced].sort((a, b) =>
    compareTableNumbers(a.tableNumber, b.tableNumber),
  )

  return (
    <Modal open={open} onClose={onClose} title={t.floorGrid.reviewTitle} size="md">
      <div className="space-y-4">
        <p className="text-body-md text-on-surface-variant">{t.floorGrid.reviewLead}</p>
        <div className="overflow-x-auto rounded-lg border border-outline-variant/40">
          <table className="w-full text-body-md">
            <thead className="bg-surface-container-low text-label-md text-on-surface-variant">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{t.floorGrid.reviewFloor}</th>
                <th className="px-3 py-2 text-end font-semibold">{t.floorGrid.reviewAreas}</th>
                <th className="px-3 py-2 text-end font-semibold">{t.floorGrid.reviewTables}</th>
                <th className="px-3 py-2 text-end font-semibold">{t.floorGrid.reviewSeats}</th>
              </tr>
            </thead>
            <tbody>
              {summary.floors.map((row) => (
                <tr key={row.floor} className="border-t border-outline-variant/30">
                  <td className="px-3 py-2">{floorLabel(row.floor, floorLabels)}</td>
                  <td className="px-3 py-2 text-end"><Num>{row.areas}</Num></td>
                  <td className="px-3 py-2 text-end"><Num>{row.tables}</Num></td>
                  <td className="px-3 py-2 text-end"><Num>{row.seats}</Num></td>
                </tr>
              ))}
              <tr className="border-t border-outline-variant/50 font-semibold">
                <td className="px-3 py-2">{t.floorGrid.reviewTotal}</td>
                <td className="px-3 py-2 text-end"><Num>{total.areas}</Num></td>
                <td className="px-3 py-2 text-end"><Num>{total.tables}</Num></td>
                <td className="px-3 py-2 text-end"><Num>{total.seats}</Num></td>
              </tr>
            </tbody>
          </table>
        </div>

        {unplaced.length > 0 ? (
          <p
            className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-light px-3 py-2 text-label-md text-on-surface"
            role="alert"
          >
            <MaterialIcon name="warning" size={18} className="mt-0.5 shrink-0 text-warning" />
            {t.floorGrid.reviewUnplaced
              .replace('{n}', String(unplaced.length))
              .replace('{list}', unplaced.map((table) => table.tableNumber).join('، '))}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-label-md text-success">
            <MaterialIcon name="check_circle" size={18} />
            {t.floorGrid.reviewAllPlaced}
          </p>
        )}

        <p className="text-label-md text-on-surface-variant">
          {live ? t.floorGrid.reviewLive : t.floorGrid.reviewHidden}
        </p>

        <div className="flex justify-end gap-2">
          {canManage && !live && (
            <Button
              type="button"
              loading={publishing}
              onClick={() => void onPublish().then(onClose)}
            >
              {t.floorGrid.reviewPublish}
            </Button>
          )}
          <Button type="button" variant={live ? 'primary' : 'outline'} onClick={onClose}>
            {t.floorGrid.reviewDone}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useToast } from '@/context/ToastContext'
import { cn, formatTime } from '@/lib/utils'

export function WaitlistPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { waitlist, tables, assignWaitlistToTable, removeFromWaitlist } = useRestaurant()
  const [assignId, setAssignId] = useState<string | null>(null)
  const [tableId, setTableId] = useState('')
  const [removeId, setRemoveId] = useState<string | null>(null)

  const availableTables = tables.filter((tbl) => tbl.status === 'available')
  const entry = waitlist.find((w) => w.id === assignId)

  const handleAssign = () => {
    if (!assignId || !tableId) return
    assignWaitlistToTable(assignId, tableId)
    toast('success', t.waitlist.assign, entry?.name)
    setAssignId(null)
    setTableId('')
  }

  return (
    <div>
      <PageHeader
        title={t.waitlist.title}
        subtitle={t.waitlist.subtitle}
        actions={
          <span className="text-sm font-semibold text-on-surface-variant">
            {waitlist.length} {t.common.guests}
          </span>
        }
      />

      {waitlist.length === 0 ? (
        <EmptyState title={t.ops.allClear} description={t.walkIn.subtitle} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {waitlist.map((entry, index) => (
            <Card key={entry.id} className={index === 0 ? 'ring-2 ring-primary/30' : ''}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm',
                    index === 0 ? 'bg-primary text-white' : 'bg-primary-light text-primary',
                  )}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{entry.name}</p>
                    <p className="text-sm text-on-surface-variant">{entry.phone}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded-lg">
                  {formatTime(entry.arrivalTime)}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mb-4 flex items-center gap-1">
                {entry.guestCount} {t.common.guests}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => window.open(`tel:${entry.phone}`)}>
                  <MaterialIcon name="call" size={14} /> {t.waitlist.call}
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setAssignId(entry.id)}>
                  <MaterialIcon name="how_to_reg" size={14} /> {t.waitlist.assign}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setRemoveId(entry.id)}>
                  <MaterialIcon name="delete" size={16} className="text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!assignId}
        onClose={() => { setAssignId(null); setTableId('') }}
        title={t.waitlist.assign}
        description={entry ? `${entry.name} · ${entry.guestCount} ${t.common.guests}` : ''}
      >
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full mb-4">
          <option value="">{t.reservations.table}</option>
          {availableTables
            .filter((tbl) => !entry || tbl.capacity >= entry.guestCount)
            .map((tbl) => (
              <option key={tbl.id} value={tbl.id}>{tbl.name} — {tbl.capacity} seats</option>
            ))}
        </Select>
        <Button className="w-full" disabled={!tableId} onClick={handleAssign}>
          {t.ops.seatGuest}
        </Button>
      </Modal>

      <ConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={() => { if (removeId) { removeFromWaitlist(removeId); toast('info', t.waitlist.remove) } }}
        title={t.waitlist.remove}
        message={t.common.confirm}
        confirmLabel={t.common.delete}
        variant="danger"
      />
    </div>
  )
}

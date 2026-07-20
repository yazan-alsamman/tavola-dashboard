import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { FloorDesigner } from '@/components/floor/designer/FloorDesigner'
import { FloorDesignerProvider } from '@/context/FloorDesignerContext'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import type { TableStatus } from '@/types'

export function FloorPlanPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    tables,
    activeBranchId,
    getReservation,
    updateTableStatus,
  } = useRestaurant()

  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const canEditLayout = user?.role === 'owner' || user?.role === 'manager'

  const handleStatus = (tableId: string, status: TableStatus) => {
    const table = tables.find((tb) => tb.id === tableId)
    if (!table) return
    updateTableStatus(tableId, status)
    toast('success', t.common.save, table.name)
  }

  const getGuestName = (table: { currentReservationId?: string }) =>
    table.currentReservationId ? getReservation(table.currentReservationId)?.customerName : undefined

  const occupied = tables.filter((tb) => tb.status === 'occupied').length
  const available = tables.filter((tb) => tb.status === 'available').length

  return (
    <FloorDesignerProvider branchId={activeBranchId}>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-headline-lg text-on-surface">{t.floorPlan.title}</h1>
            <p className="text-body-md text-on-surface-variant">{t.floorPlan.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
              <MaterialIcon name="table_restaurant" size={18} className="text-primary" />
              <Num>{tables.length}</Num> {t.floorPlan.tablesCount}
            </span>
            <span className="flex items-center gap-2 text-primary font-semibold text-label-md">
              <Num>{occupied}</Num> {t.status.occupied}
            </span>
            <span className="flex items-center gap-2 text-tertiary-container font-semibold text-label-md">
              <Num>{available}</Num> {t.status.available}
            </span>
            {selectedTable && (
              <Button variant="ghost" size="sm" onClick={() => {
                const res = tables.find((tb) => tb.id === selectedTable)?.currentReservationId
                if (res) navigate(`/reservations/${res}`)
              }}>
                <MaterialIcon name="event" size={16} /> {t.floorPlan.viewReservation}
              </Button>
            )}
          </div>
        </div>

        {canEditLayout ? (
          <FloorDesigner
            selectedTableId={selectedTable}
            onSelectTable={setSelectedTable}
            onTableStatusChange={handleStatus}
            getGuestName={getGuestName}
          />
        ) : (
          <FloorDesigner
            selectedTableId={selectedTable}
            onSelectTable={setSelectedTable}
            onTableStatusChange={handleStatus}
            getGuestName={getGuestName}
            readOnly
          />
        )}
      </div>
    </FloorDesignerProvider>
  )
}

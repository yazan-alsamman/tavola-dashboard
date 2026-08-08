import { useEffect } from 'react'
import { DesignerToolbar } from './DesignerToolbar'
import { SectionsPanel } from './SectionsPanel'
import { LayersPanel } from './LayersPanel'
import { DesignerCanvas } from './DesignerCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { Minimap } from './Minimap'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import type { Table, TableStatus } from '@/types'

interface FloorDesignerProps {
  selectedTableId: string | null
  onSelectTable: (id: string | null) => void
  onTableStatusChange: (tableId: string, status: TableStatus) => void
  getGuestName: (table: Table) => string | undefined
  /** Optional inventory tables for panels; designer layout remains local. */
  tables?: Table[]
  onUpdateSeatCount?: (tableId: string, seatCount: number) => void
  readOnly?: boolean
}

export function FloorDesigner({
  selectedTableId,
  onSelectTable,
  onTableStatusChange,
  getGuestName,
  tables = [],
  onUpdateSeatCount,
  readOnly = false,
}: FloorDesignerProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const { selectedBranchId } = useRestaurantScope()
  const { mode, setMode, resetDocument, saveDocument } = useFloorDesigner()
  const floorBranchId = selectedBranchId ?? 'unscoped'

  useEffect(() => {
    if (readOnly && mode === 'edit') setMode('operations')
  }, [readOnly, mode, setMode])

  const handleSave = () => {
    saveDocument(floorBranchId)
    toast('success', t.common.save, t.floorPlan.layoutSaved)
  }

  const handleReset = () => {
    resetDocument()
    toast('info', t.floorPlan.layoutReset)
  }

  const handleTableAction = (tableId: string, action: string) => {
    onTableStatusChange(tableId, action as TableStatus)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[560px] rounded-xl border border-outline-variant/30 overflow-hidden bg-surface-container-lowest shadow-sm">
      <DesignerToolbar onSave={handleSave} onReset={handleReset} readOnly={readOnly} />

      <div className="flex flex-1 min-h-0">
        {mode === 'edit' && (
          <div className="w-52 shrink-0 flex flex-col border-e border-outline-variant/30 overflow-hidden">
            <SectionsPanel tables={tables} />
            <div className="flex-1 min-h-0">
              <LayersPanel tables={tables} />
            </div>
          </div>
        )}

        <div className="flex-1 relative min-w-0 flex flex-col">
          <DesignerCanvas
            tables={tables}
            selectedTableId={selectedTableId}
            onSelectTable={onSelectTable}
            getGuestName={getGuestName}
          />
          <Minimap />
        </div>

        <div className="w-56 shrink-0 border-s border-outline-variant/30 bg-surface-container-lowest overflow-y-auto">
          <PropertiesPanel
            tables={tables}
            selectedTableId={selectedTableId}
            onTableAction={handleTableAction}
            onUpdateSeatCount={onUpdateSeatCount}
            getGuestName={getGuestName}
          />
        </div>
      </div>
    </div>
  )
}

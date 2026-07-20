import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { SECTION_BORDER_COLORS, type TableShape } from '@/lib/floorDesigner'
import { cn } from '@/lib/utils'
import type { Table } from '@/types'

interface PropertiesPanelProps {
  tables: Table[]
  selectedTableId?: string | null
  onTableAction?: (tableId: string, action: string) => void
  onUpdateSeatCount?: (tableId: string, seatCount: number) => void
  getGuestName?: (table: Table) => string | undefined
}

export function PropertiesPanel({ tables, selectedTableId, onTableAction, onUpdateSeatCount, getGuestName }: PropertiesPanelProps) {
  const { t } = useLocale()
  const fd = t.floorDesigner
  const {
    document,
    mode,
    selectedIds,
    updateSection,
    updateTable,
    updateDecorative,
    bringForward,
    sendBackward,
    duplicateSelected,
    deleteSelected,
  } = useFloorDesigner()

  const tableMap = new Map(tables.map((tb) => [tb.id, tb]))

  // Operations mode: show table details
  if (mode === 'operations' && selectedTableId) {
    const table = tables.find((tb) => tb.id === selectedTableId)
    if (!table) return <EmptyState text={t.floorPlan.selectTable} />
    const guest = getGuestName?.(table)

    return (
      <div className="p-4 space-y-4">
        <div className="text-center pb-3 border-b border-outline-variant/30">
          <p className="text-display text-primary"><Num>{table.number}</Num></p>
          <p className="text-headline-md mt-0.5">{table.name}</p>
          <span className={cn(
            'inline-block mt-2 px-2.5 py-0.5 rounded-full text-label-sm font-semibold',
            table.status === 'occupied' ? 'bg-primary-container text-on-primary-container' :
            table.status === 'available' ? 'bg-surface-container-high text-on-surface-variant' :
            table.status === 'reserved' ? 'bg-secondary-container text-primary' :
            'bg-error/10 text-error',
          )}>
            {t.status[table.status]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-surface-container-low">
            <p className="text-label-sm text-on-surface-variant">{t.floorPlan.capacity}</p>
            <p className="font-bold text-headline-md"><Num>{table.capacity}</Num></p>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container-low">
            <p className="text-label-sm text-on-surface-variant">{t.floorPlan.section}</p>
            <p className="text-body-sm font-bold">{t.floorPlan[table.section]}</p>
          </div>
        </div>
        {guest && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-label-sm font-bold text-primary">{t.floorPlan.current}</p>
            <p className="font-semibold mt-0.5 text-body-sm">{guest}</p>
          </div>
        )}
        <div className="space-y-1.5">
          {table.status !== 'available' && (
            <button type="button" onClick={() => onTableAction?.(table.id, 'available')} className="w-full py-2 rounded-lg bg-surface-container-high text-label-sm font-semibold hover:bg-surface-container transition-colors">
              {t.floorPlan.markAvailable}
            </button>
          )}
          {table.status !== 'out_of_service' && (
            <button type="button" onClick={() => onTableAction?.(table.id, 'out_of_service')} className="w-full py-2 rounded-lg border border-outline-variant/40 text-label-sm hover:bg-surface-container-high transition-colors">
              {t.floorPlan.outOfService}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'operations') {
    return <EmptyState text={t.floorPlan.selectTable} />
  }

  // Edit mode: show selected element properties
  if (selectedIds.length === 0) {
    return <EmptyState text={fd.selectElement} />
  }

  if (selectedIds.length > 1) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-center">
          <MaterialIcon name="select_all" size={32} className="text-outline mx-auto mb-2" />
          <p className="text-body-sm text-on-surface-variant">
            <Num>{selectedIds.length}</Num> {fd.elementsSelected}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <ActionBtn icon="content_copy" label={fd.duplicate} onClick={duplicateSelected} />
          <ActionBtn icon="delete" label={fd.deleteSelected} onClick={deleteSelected} />
        </div>
      </div>
    )
  }

  const id = selectedIds[0]
  const section = document.sections.find((s) => s.id === id)
  const designerTable = document.tables.find((t) => t.id === id)
  const decorative = document.decoratives.find((d) => d.id === id)

  if (section) {
    return (
      <div className="p-3 space-y-3">
        <h3 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
          <MaterialIcon name="view_quilt" size={16} className="text-primary" />
          {fd.sectionProperties}
        </h3>
        <Field label={fd.name}>
          <input
            type="text"
            value={section.name}
            onChange={(e) => updateSection(id, { name: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-md bg-surface-container-low border border-outline-variant/30 text-body-sm"
          />
        </Field>
        <Field label={fd.type}>
          <span className="text-body-sm text-on-surface-variant">{t.floorPlan[section.sectionType]}</span>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(['x', 'y', 'w', 'h'] as const).map((dim) => (
            <Field key={dim} label={dim.toUpperCase()}>
              <input
                type="number"
                value={Math.round(section[dim])}
                onChange={(e) => updateSection(id, { [dim]: Number(e.target.value) })}
                className="w-full px-2 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-body-sm tabular-nums"
              />
            </Field>
          ))}
        </div>
        <Field label={fd.color}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={section.color}
              onChange={(e) => updateSection(id, { color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <span className="text-label-sm text-on-surface-variant" style={{ color: SECTION_BORDER_COLORS[section.sectionType] }}>
              {t.floorPlan[section.sectionType]}
            </span>
          </div>
        </Field>
        <LayerActions id={id} bringForward={bringForward} sendBackward={sendBackward} fd={fd} />
      </div>
    )
  }

  if (designerTable) {
    const table = tableMap.get(designerTable.tableId)
    const shapes: TableShape[] = ['round', 'square', 'rect']
    const shapeLabels: Record<string, string> = { round: fd.shape_round, square: fd.shape_square, rect: fd.shape_rect }
    const seatCount = designerTable.seatCount ?? table?.capacity ?? 4

    const changeSeats = (delta: number) => {
      const next = Math.max(1, Math.min(20, seatCount + delta))
      updateTable(id, { seatCount: next })
      if (table) onUpdateSeatCount?.(table.id, next)
    }

    return (
      <div className="p-3 space-y-3">
        <h3 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
          <MaterialIcon name="table_restaurant" size={16} className="text-primary" />
          {fd.tableProperties} {table && <Num>{table.number}</Num>}
        </h3>

        <Field label={fd.seats}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => changeSeats(-1)} className="w-8 h-8 rounded-md bg-surface-container-high hover:bg-surface-container flex items-center justify-center">
              <MaterialIcon name="remove" size={18} />
            </button>
            <input
              type="number"
              min={1}
              max={20}
              value={seatCount}
              onChange={(e) => {
                const next = Math.max(1, Math.min(20, Number(e.target.value) || 1))
                updateTable(id, { seatCount: next })
                if (table) onUpdateSeatCount?.(table.id, next)
              }}
              className="flex-1 px-2 py-1.5 rounded-md bg-surface-container-low border border-outline-variant/30 text-body-sm text-center tabular-nums font-bold"
            />
            <button type="button" onClick={() => changeSeats(1)} className="w-8 h-8 rounded-md bg-surface-container-high hover:bg-surface-container flex items-center justify-center">
              <MaterialIcon name="add" size={18} />
            </button>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1">{fd.seatsHint}</p>
        </Field>

        <Field label={fd.shape}>
          <div className="flex gap-1">
            {shapes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateTable(id, { shape: s })}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-label-sm transition-colors',
                  designerTable.shape === s ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant',
                )}
              >
                {shapeLabels[s]}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(['x', 'y', 'w', 'h'] as const).map((dim) => (
            <Field key={dim} label={dim.toUpperCase()}>
              <input
                type="number"
                value={Math.round(designerTable[dim])}
                onChange={(e) => updateTable(id, { [dim]: Number(e.target.value) })}
                className="w-full px-2 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-body-sm tabular-nums"
              />
            </Field>
          ))}
        </div>
        <Field label={fd.rotation}>
          <input
            type="range"
            min={0}
            max={360}
            value={designerTable.rotation}
            onChange={(e) => updateTable(id, { rotation: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <span className="text-label-sm text-on-surface-variant"><Num>{designerTable.rotation}</Num>°</span>
        </Field>
        <LayerActions id={id} bringForward={bringForward} sendBackward={sendBackward} fd={fd} />
      </div>
    )
  }

  if (decorative) {
    return (
      <div className="p-3 space-y-3">
        <h3 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
          <MaterialIcon name="category" size={16} className="text-primary" />
          {fd.decorativeProperties}
        </h3>
        <Field label={fd.name}>
          <input
            type="text"
            value={decorative.label}
            onChange={(e) => updateDecorative(id, { label: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-md bg-surface-container-low border border-outline-variant/30 text-body-sm"
          />
        </Field>
        <Field label={fd.type}>
          <span className="text-body-sm text-on-surface-variant">{fd[decorative.type]}</span>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(['x', 'y', 'w', 'h'] as const).map((dim) => (
            <Field key={dim} label={dim.toUpperCase()}>
              <input
                type="number"
                value={Math.round(decorative[dim])}
                onChange={(e) => updateDecorative(id, { [dim]: Number(e.target.value) })}
                className="w-full px-2 py-1 rounded-md bg-surface-container-low border border-outline-variant/30 text-body-sm tabular-nums"
              />
            </Field>
          ))}
        </div>
        <LayerActions id={id} bringForward={bringForward} sendBackward={sendBackward} fd={fd} />
      </div>
    )
  }

  return <EmptyState text={fd.selectElement} />
}

function LayerActions({
  id,
  bringForward,
  sendBackward,
  fd,
}: {
  id: string
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  fd: { bringForward: string; sendBackward: string }
}) {
  return (
    <div className="flex gap-1.5 pt-1 border-t border-outline-variant/20">
      <ActionBtn icon="flip_to_front" label={fd.bringForward} onClick={() => bringForward(id)} />
      <ActionBtn icon="flip_to_back" label={fd.sendBackward} onClick={() => sendBackward(id)} />
    </div>
  )
}

function ActionBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-surface-container-high hover:bg-surface-container text-label-sm text-on-surface-variant transition-colors"
    >
      <MaterialIcon name={icon} size={14} />
      <span className="truncate">{label}</span>
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-label-sm text-on-surface-variant block mb-1">{label}</label>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <MaterialIcon name="touch_app" size={36} className="text-outline mb-2" />
      <p className="text-body-sm text-on-surface-variant">{text}</p>
    </div>
  )
}

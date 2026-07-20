import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { cn } from '@/lib/utils'
import { DECORATIVE_ICONS } from '@/lib/floorDesigner'
import type { Table } from '@/types'

interface LayersPanelProps {
  tables: Table[]
}

export function LayersPanel({ tables }: LayersPanelProps) {
  const { t } = useLocale()
  const fd = t.floorDesigner
  const {
    document,
    selectedIds,
    toggleSelect,
    toggleVisibility,
    toggleLock,
    mode,
  } = useFloorDesigner()

  const tableMap = new Map(tables.map((tb) => [tb.id, tb]))

  const allLayers = [
    ...document.sections.map((s) => ({ kind: 'section' as const, item: s })),
    ...document.decoratives.map((d) => ({ kind: 'decorative' as const, item: d })),
    ...document.tables.filter((t) => t.visible).map((t) => ({ kind: 'table' as const, item: t })),
  ].sort((a, b) => b.item.zIndex - a.item.zIndex)

  if (mode !== 'edit') return null

  return (
    <div className="flex flex-col h-full border-e border-outline-variant/30 bg-surface-container-lowest">
      <div className="px-3 py-2 border-b border-outline-variant/30">
        <h3 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
          <MaterialIcon name="layers" size={16} className="text-primary" />
          {fd.layers}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {allLayers.map(({ kind, item }) => {
          const isSelected = selectedIds.includes(item.id)
          let label = ''
          let icon = 'crop_square'

          if (kind === 'section') {
            label = item.name
            icon = 'view_quilt'
          } else if (kind === 'decorative') {
            label = item.label
            icon = DECORATIVE_ICONS[item.type]
          } else {
            const tb = tableMap.get(item.tableId)
            label = tb ? `${fd.table} ${tb.number}` : item.tableId
            icon = item.shape === 'round' ? 'circle' : 'crop_square'
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={(e) => toggleSelect(item.id, e.shiftKey || e.ctrlKey || e.metaKey)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-start transition-colors group',
                isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-high text-on-surface-variant',
              )}
            >
              <MaterialIcon name={icon} size={14} className="shrink-0" />
              <span className="flex-1 text-label-sm truncate">{label}</span>
              <span className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id) }}
                  className="p-0.5 rounded hover:bg-surface-container"
                >
                  <MaterialIcon name={item.visible ? 'visibility' : 'visibility_off'} size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleLock(item.id) }}
                  className="p-0.5 rounded hover:bg-surface-container"
                >
                  <MaterialIcon name={item.locked ? 'lock' : 'lock_open'} size={14} />
                </button>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

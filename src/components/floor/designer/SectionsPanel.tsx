import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { cn } from '@/lib/utils'
import { SECTION_BORDER_COLORS, type SectionType, type DecorativeType } from '@/lib/floorDesigner'
import type { Table } from '@/types'

const SECTION_TYPES: SectionType[] = ['indoor', 'outdoor', 'terrace', 'vip', 'family', 'private', 'custom']
const DECORATIVE_TYPES: DecorativeType[] = ['kitchen', 'bar', 'reception', 'entrance', 'exit', 'restroom', 'stage', 'garden']

interface SectionsPanelProps {
  tables: Table[]
}

export function SectionsPanel({ tables }: SectionsPanelProps) {
  const { t } = useLocale()
  const fd = t.floorDesigner
  const { document, addSection, addDecorative, addTableToSection, selectedIds, mode } = useFloorDesigner()
  const [expanded, setExpanded] = useState(true)
  const [showAddMenu, setShowAddMenu] = useState(false)

  if (mode !== 'edit') return null

  const placedTableIds = new Set(document.tables.map((dt) => dt.tableId))
  const unplacedTables = tables.filter((tb) => !placedTableIds.has(tb.id))

  return (
    <div className="border-b border-outline-variant/30 bg-surface-container-lowest">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-container-high transition-colors"
      >
        <span className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
          <MaterialIcon name="view_quilt" size={16} className="text-primary" />
          {fd.sections}
        </span>
        <MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Section list */}
          {document.sections.map((sec) => {
            const secTables = document.tables.filter((t) => t.sectionId === sec.id && t.visible)
            const isSelected = selectedIds.includes(sec.id)
            return (
              <div
                key={sec.id}
                className={cn(
                  'rounded-lg border p-2 transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant/30',
                )}
                style={{ borderColor: isSelected ? undefined : SECTION_BORDER_COLORS[sec.sectionType] + '40' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: sec.color, border: `1px solid ${SECTION_BORDER_COLORS[sec.sectionType]}` }}
                  />
                  <span className="text-label-sm font-semibold text-on-surface flex-1 truncate">{sec.name}</span>
                  <span className="text-label-sm text-on-surface-variant">{secTables.length}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant mb-1.5">{t.floorPlan[sec.sectionType]}</p>
              </div>
            )
          })}

          {/* Add section */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/40 text-label-sm text-primary hover:bg-primary/5 transition-colors"
            >
              <MaterialIcon name="add" size={16} />
              {fd.addSection}
            </button>
            {showAddMenu && (
              <div className="absolute z-50 inset-x-0 top-full mt-1 p-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 shadow-lg grid grid-cols-2 gap-1">
                {SECTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { addSection(type); setShowAddMenu(false) }}
                    className="px-2 py-1.5 rounded text-label-sm text-on-surface-variant hover:bg-surface-container-high text-start"
                  >
                    {t.floorPlan[type]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Decorative elements */}
          <div className="pt-1">
            <p className="text-label-sm font-semibold text-on-surface-variant mb-1.5 px-1">{fd.decoratives}</p>
            <div className="grid grid-cols-4 gap-1">
              {DECORATIVE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  title={fd[type]}
                  onClick={() => addDecorative(type)}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-md hover:bg-surface-container-high text-on-surface-variant transition-colors"
                >
                  <MaterialIcon name={
                    type === 'kitchen' ? 'skillet' :
                    type === 'bar' ? 'local_bar' :
                    type === 'reception' ? 'desk' :
                    type === 'entrance' ? 'door_front' :
                    type === 'exit' ? 'exit_to_app' :
                    type === 'restroom' ? 'wc' :
                    type === 'stage' ? 'theater_comedy' : 'yard'
                  } size={18} />
                  <span className="text-[9px] truncate w-full text-center">{fd[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Unplaced tables */}
          {unplacedTables.length > 0 && (
            <div className="pt-1">
              <p className="text-label-sm font-semibold text-on-surface-variant mb-1.5 px-1">{fd.unplacedTables}</p>
              <div className="flex flex-wrap gap-1">
                {unplacedTables.map((tb) => (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => {
                      const sec = document.sections[0]
                      if (sec) addTableToSection(sec.id, tb.id)
                    }}
                    className="px-2 py-1 rounded-md bg-surface-container-high text-label-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    T{tb.number}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

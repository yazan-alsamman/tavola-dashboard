import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { cn } from '@/lib/utils'
import type { EditTool } from '@/lib/floorDesigner'

const TOOLS: { id: EditTool; icon: string }[] = [
  { id: 'select', icon: 'near_me' },
  { id: 'marquee', icon: 'select_all' },
  { id: 'pan', icon: 'pan_tool' },
]

export function DesignerToolPalette() {
  const { t } = useLocale()
  const fd = t.floorDesigner
  const { mode, activeTool, setActiveTool } = useFloorDesigner()

  if (mode !== 'edit') return null

  const labels: Record<EditTool, string> = {
    select: fd.toolSelect,
    marquee: fd.toolMarquee,
    pan: fd.toolPan,
  }

  return (
    <div className="absolute top-12 start-2 z-30 flex flex-col gap-0.5 p-1 rounded-lg bg-surface-container-lowest/95 backdrop-blur-sm border border-outline-variant/40 shadow-md">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          title={labels[tool.id]}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-md transition-colors',
            activeTool === tool.id
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
          )}
        >
          <MaterialIcon name={tool.icon} size={20} />
        </button>
      ))}
    </div>
  )
}

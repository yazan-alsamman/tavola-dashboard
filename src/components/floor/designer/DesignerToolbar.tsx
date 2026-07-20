import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { ZOOM_PRESETS } from '@/lib/floorDesigner'
import { cn } from '@/lib/utils'

interface DesignerToolbarProps {
  onSave: () => void
  onReset: () => void
  readOnly?: boolean
}

function ToolBtn({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
        active ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        disabled && 'opacity-40 pointer-events-none',
      )}
    >
      <MaterialIcon name={icon} size={18} />
    </button>
  )
}

export function DesignerToolbar({ onSave, onReset, readOnly = false }: DesignerToolbarProps) {
  const { t } = useLocale()
  const {
    mode,
    setMode,
    zoom,
    setZoom,
    snapEnabled,
    setSnapEnabled,
    showGrid,
    setShowGrid,
    selectedIds,
    alignSelected,
    mergeSelectedTables,
    deleteSelected,
    duplicateSelected,
    undo,
    redo,
    canUndo,
    canRedo,
    fitView,
    zoomToSelection,
    isDirty,
  } = useFloorDesigner()

  const fd = t.floorDesigner
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false)

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-container-low border-b border-outline-variant/30 flex-wrap">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-outline-variant/40 overflow-hidden me-2">
        <button
          type="button"
          onClick={() => setMode('operations')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-label-sm font-semibold transition-colors',
            mode === 'operations' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          <MaterialIcon name="visibility" size={16} />
          {fd.operationsMode}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-label-sm font-semibold transition-colors',
              mode === 'edit' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            <MaterialIcon name="edit" size={16} />
            {fd.editMode}
          </button>
        )}
      </div>

      {mode === 'edit' && (
        <>
          <div className="w-px h-6 bg-outline-variant/40 mx-1" />
          <ToolBtn icon="undo" label={fd.undo} disabled={!canUndo} onClick={undo} />
          <ToolBtn icon="redo" label={fd.redo} disabled={!canRedo} onClick={redo} />
          <ToolBtn icon="content_copy" label={fd.duplicate} disabled={selectedIds.length === 0} onClick={duplicateSelected} />
          <div className="w-px h-6 bg-outline-variant/40 mx-1" />
          <ToolBtn icon="align_horizontal_left" label={fd.alignLeft} disabled={selectedIds.length < 2} onClick={() => alignSelected('left')} />
          <ToolBtn icon="align_horizontal_center" label={fd.alignCenter} disabled={selectedIds.length < 2} onClick={() => alignSelected('center')} />
          <ToolBtn icon="align_horizontal_right" label={fd.alignRight} disabled={selectedIds.length < 2} onClick={() => alignSelected('right')} />
          <ToolBtn icon="align_vertical_top" label={fd.alignTop} disabled={selectedIds.length < 2} onClick={() => alignSelected('top')} />
          <ToolBtn icon="align_vertical_center" label={fd.alignMiddle} disabled={selectedIds.length < 2} onClick={() => alignSelected('middle')} />
          <ToolBtn icon="align_vertical_bottom" label={fd.alignBottom} disabled={selectedIds.length < 2} onClick={() => alignSelected('bottom')} />
          <ToolBtn icon="horizontal_distribute" label={fd.distributeH} disabled={selectedIds.length < 3} onClick={() => alignSelected('distribute-h')} />
          <ToolBtn icon="vertical_distribute" label={fd.distributeV} disabled={selectedIds.length < 3} onClick={() => alignSelected('distribute-v')} />
          <div className="w-px h-6 bg-outline-variant/40 mx-1" />
          <ToolBtn icon="merge" label={fd.mergeTables} disabled={selectedIds.length < 2} onClick={mergeSelectedTables} />
          <ToolBtn icon="delete" label={fd.deleteSelected} disabled={selectedIds.length === 0} onClick={deleteSelected} />
          <div className="w-px h-6 bg-outline-variant/40 mx-1" />
          <ToolBtn icon="grid_on" label={fd.snapToGrid} active={snapEnabled} onClick={() => setSnapEnabled(!snapEnabled)} />
          <ToolBtn icon="grid_view" label={fd.showGrid} active={showGrid} onClick={() => setShowGrid(!showGrid)} />
        </>
      )}

      <div className="flex-1" />

      {/* Zoom controls */}
      <ToolBtn icon="remove" label={fd.zoomOut} onClick={() => setZoom(zoom - 0.1)} />
      <div className="relative">
        <button
          type="button"
          onClick={() => setZoomMenuOpen(!zoomMenuOpen)}
          className="text-label-sm text-on-surface-variant w-12 text-center tabular-nums hover:bg-surface-container-high rounded px-1 py-1"
        >
          {Math.round(zoom * 100)}%
        </button>
        {zoomMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setZoomMenuOpen(false)} />
            <div className="absolute top-full mt-1 end-0 z-50 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/40 shadow-lg min-w-[100px]">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setZoom(preset); setZoomMenuOpen(false) }}
                  className={cn(
                    'w-full px-3 py-1.5 text-start text-label-sm hover:bg-surface-container-high',
                    Math.abs(zoom - preset) < 0.01 && 'text-primary font-semibold',
                  )}
                >
                  {Math.round(preset * 100)}%
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <ToolBtn icon="add" label={fd.zoomIn} onClick={() => setZoom(zoom + 0.1)} />
      <ToolBtn icon="fit_screen" label={fd.fitView} onClick={fitView} />
      {selectedIds.length > 0 && (
        <ToolBtn icon="crop_free" label={fd.zoomToSelection} onClick={zoomToSelection} />
      )}

      <div className="w-px h-6 bg-outline-variant/40 mx-1" />

      {mode === 'edit' && (
        <>
          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1.5 text-label-sm text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-high"
          >
            {t.floorPlan.resetLayout}
          </button>
          <button
            type="button"
            onClick={onSave}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors',
              isDirty ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant',
            )}
          >
            <MaterialIcon name="save" size={16} />
            {t.common.save}
          </button>
        </>
      )}
    </div>
  )
}

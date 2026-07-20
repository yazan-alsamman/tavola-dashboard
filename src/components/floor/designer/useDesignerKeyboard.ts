import { useEffect, useCallback } from 'react'
import { useFloorDesigner } from '@/context/FloorDesignerContext'
import { GRID_SIZE } from '@/lib/floorDesigner'

export function useDesignerKeyboard(enabled: boolean) {
  const {
    mode,
    selectedIds,
    clearSelection,
    selectAll,
    deleteSelected,
    duplicateSelected,
    undo,
    redo,
    nudgeSelected,
    setActiveTool,
    activeTool,
  } = useFloorDesigner()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || mode !== 'edit') return
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    const mod = e.ctrlKey || e.metaKey

    if (e.key === 'Escape') { clearSelection(); return }
    if (mod && e.key === 'a') { e.preventDefault(); selectAll(); return }
    if (mod && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
    if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) { e.preventDefault(); deleteSelected(); return }

    if (e.key === 'v' && !mod) { setActiveTool('select'); return }
    if (e.key === 'h' && !mod) { setActiveTool('pan'); return }
    if (e.key === 'm' && !mod) { setActiveTool('marquee'); return }

    if (!selectedIds.length) return
    const step = e.shiftKey ? GRID_SIZE * 5 : GRID_SIZE
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeSelected(-step, 0) }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudgeSelected(step, 0) }
    if (e.key === 'ArrowUp') { e.preventDefault(); nudgeSelected(0, -step) }
    if (e.key === 'ArrowDown') { e.preventDefault(); nudgeSelected(0, step) }
  }, [
    enabled, mode, selectedIds, clearSelection, selectAll, deleteSelected,
    duplicateSelected, undo, redo, nudgeSelected, setActiveTool,
  ])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { activeTool }
}

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import {
  type FloorDesignerDocument,
  type DesignerSection,
  type DesignerTable,
  type DesignerDecorative,
  type SectionType,
  type DecorativeType,
  type DesignerMode,
  type EditTool,
  createDefaultDocument,
  loadFloorDocument,
  saveFloorDocument,
  alignElements,
  mergeTables,
  snap,
  clampPos,
  SECTION_COLORS,
  DESIGNER_CANVAS,
  GRID_SIZE,
  ZOOM_MIN,
  ZOOM_MAX,
  getElementBounds,
  getElementsInRect,
} from '@/lib/floorDesigner'
import { generateId } from '@/lib/utils'

const HISTORY_LIMIT = 50

interface FloorDesignerContextType {
  document: FloorDesignerDocument
  mode: DesignerMode
  setMode: (mode: DesignerMode) => void
  activeTool: EditTool
  setActiveTool: (tool: EditTool) => void
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  toggleSelect: (id: string, multi?: boolean) => void
  clearSelection: () => void
  selectAll: () => void
  zoom: number
  setZoom: (z: number) => void
  pan: { x: number; y: number }
  setPan: (p: { x: number; y: number }) => void
  snapEnabled: boolean
  setSnapEnabled: (v: boolean) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  updateSection: (id: string, updates: Partial<DesignerSection>) => void
  updateTable: (id: string, updates: Partial<DesignerTable>) => void
  updateDecorative: (id: string, updates: Partial<DesignerDecorative>) => void
  resizeElement: (id: string, updates: { x?: number; y?: number; w?: number; h?: number }) => void
  addSection: (type: SectionType, name?: string) => void
  addDecorative: (type: DecorativeType) => void
  addTableToSection: (sectionId: string, tableId: string, seatCount?: number) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void
  mergeSelectedTables: () => void
  toggleVisibility: (id: string) => void
  toggleLock: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  moveElement: (id: string, x: number, y: number) => void
  finalizeDrag: () => void
  nudgeSelected: (dx: number, dy: number) => void
  selectInRect: (rect: { x: number; y: number; w: number; h: number }, additive?: boolean) => void
  resetDocument: () => void
  saveDocument: (branchId: string) => void
  loadDocument: (branchId: string) => void
  fitView: () => void
  zoomToSelection: () => void
  zoomAtPoint: (newZoom: number, clientX: number, clientY: number, containerRect: DOMRect) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  markClean: () => void
}

const FloorDesignerContext = createContext<FloorDesignerContextType | null>(null)

export function FloorDesignerProvider({ children, branchId }: { children: ReactNode; branchId: string }) {
  const [document, setDocument] = useState<FloorDesignerDocument>(() => loadFloorDocument(branchId))
  const [mode, setMode] = useState<DesignerMode>('operations')
  const [activeTool, setActiveTool] = useState<EditTool>('select')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [zoom, setZoomState] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  const historyRef = useRef<FloorDesignerDocument[]>([])
  const historyIndexRef = useRef(-1)
  const dragDirtyRef = useRef(false)
  const documentRef = useRef(document)
  documentRef.current = document
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const pushHistory = useCallback((doc: FloorDesignerDocument) => {
    const snapshot = JSON.parse(JSON.stringify(doc)) as FloorDesignerDocument
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(snapshot)
    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.shift()
    } else {
      historyIndexRef.current += 1
    }
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const commitDocument = useCallback((updater: (d: FloorDesignerDocument) => FloorDesignerDocument) => {
    setDocument((d) => {
      const next = updater(d)
      pushHistory(next)
      return next
    })
    setIsDirty(true)
  }, [pushHistory])

  useEffect(() => {
    const doc = loadFloorDocument(branchId)
    setDocument(doc)
    historyRef.current = [JSON.parse(JSON.stringify(doc))]
    historyIndexRef.current = 0
    syncHistoryFlags()
    setSelectedIds([])
    setIsDirty(false)
    setPan({ x: 0, y: 0 })
    setZoomState(1)
  }, [branchId, syncHistoryFlags])

  const markClean = useCallback(() => setIsDirty(false), [])

  const setZoom = useCallback((z: number) => {
    setZoomState(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)))
  }, [])

  const toggleSelect = useCallback((id: string, multi = false) => {
    setSelectedIds((prev) => {
      if (multi) return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      return [id]
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const selectAll = useCallback(() => {
    setSelectedIds([
      ...document.sections.map((s) => s.id),
      ...document.tables.filter((t) => t.visible).map((t) => t.id),
      ...document.decoratives.filter((d) => d.visible).map((d) => d.id),
    ])
  }, [document])

  const selectInRect = useCallback((rect: { x: number; y: number; w: number; h: number }, additive = false) => {
    const normalized = {
      x: rect.w < 0 ? rect.x + rect.w : rect.x,
      y: rect.h < 0 ? rect.y + rect.h : rect.y,
      w: Math.abs(rect.w),
      h: Math.abs(rect.h),
    }
    const ids = getElementsInRect(document, normalized)
    setSelectedIds((prev) => additive ? [...new Set([...prev, ...ids])] : ids)
  }, [document])

  const updateSection = useCallback((id: string, updates: Partial<DesignerSection>) => {
    commitDocument((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)) }))
  }, [commitDocument])

  const updateTable = useCallback((id: string, updates: Partial<DesignerTable>) => {
    commitDocument((d) => ({ ...d, tables: d.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))
  }, [commitDocument])

  const updateDecorative = useCallback((id: string, updates: Partial<DesignerDecorative>) => {
    commitDocument((d) => ({ ...d, decoratives: d.decoratives.map((dec) => (dec.id === id ? { ...dec, ...updates } : dec)) }))
  }, [commitDocument])

  const resizeElement = useCallback((id: string, updates: { x?: number; y?: number; w?: number; h?: number }) => {
    const apply = (x: number, y: number, w: number, h: number) => {
      const nw = Math.max(GRID_SIZE, snapEnabled ? snap(updates.w ?? w) : (updates.w ?? w))
      const nh = Math.max(GRID_SIZE, snapEnabled ? snap(updates.h ?? h) : (updates.h ?? h))
      const nx = snapEnabled ? snap(updates.x ?? x) : (updates.x ?? x)
      const ny = snapEnabled ? snap(updates.y ?? y) : (updates.y ?? y)
      const c = clampPos(nx, ny, nw, nh)
      return { x: c.x, y: c.y, w: nw, h: nh }
    }
    commitDocument((d) => ({
      ...d,
      sections: d.sections.map((s) => s.id === id ? { ...s, ...apply(s.x, s.y, s.w, s.h) } : s),
      tables: d.tables.map((t) => t.id === id ? { ...t, ...apply(t.x, t.y, t.w, t.h) } : t),
      decoratives: d.decoratives.map((dec) => dec.id === id ? { ...dec, ...apply(dec.x, dec.y, dec.w, dec.h) } : dec),
    }))
  }, [commitDocument, snapEnabled])

  const addSection = useCallback((type: SectionType, name?: string) => {
    const id = generateId('sec')
    commitDocument((d) => ({
      ...d,
      sections: [...d.sections, {
        id,
        name: name ?? type.charAt(0).toUpperCase() + type.slice(1),
        sectionType: type,
        x: 100, y: 100, w: 300, h: 200,
        color: SECTION_COLORS[type],
        visible: true, locked: false,
        zIndex: d.sections.length + 1,
      }],
    }))
    setSelectedIds([id])
  }, [commitDocument])

  const addDecorative = useCallback((type: DecorativeType) => {
    const id = generateId('dec')
    commitDocument((d) => ({
      ...d,
      decoratives: [...d.decoratives, {
        id, type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        x: 200, y: 200,
        w: type === 'entrance' || type === 'exit' ? 160 : 120,
        h: type === 'entrance' || type === 'exit' ? 40 : 80,
        rotation: 0, visible: true, locked: false, zIndex: 0,
      }],
    }))
    setSelectedIds([id])
  }, [commitDocument])

  const addTableToSection = useCallback((sectionId: string, tableId: string, seatCount?: number) => {
    const id = generateId('dt')
    commitDocument((d) => ({
      ...d,
      tables: [...d.tables, {
        id, tableId, sectionId,
        x: 120, y: 120, w: 72, h: 72,
        shape: 'round', rotation: 0,
        visible: true, locked: false,
        zIndex: d.tables.length + 10,
        seatCount,
      }],
    }))
    setSelectedIds([id])
  }, [commitDocument])

  const deleteSelected = useCallback(() => {
    commitDocument((d) => ({
      ...d,
      sections: d.sections.filter((s) => !selectedIds.includes(s.id)),
      tables: d.tables.filter((t) => !selectedIds.includes(t.id)),
      decoratives: d.decoratives.filter((dec) => !selectedIds.includes(dec.id)),
    }))
    setSelectedIds([])
  }, [selectedIds, commitDocument])

  const duplicateSelected = useCallback(() => {
    if (!selectedIds.length) return
    const newIds: string[] = []
    commitDocument((d) => {
      const newSections = [...d.sections]
      const newTables = [...d.tables]
      const newDecs = [...d.decoratives]
      selectedIds.forEach((sid) => {
        const sec = d.sections.find((s) => s.id === sid)
        if (sec) {
          const nid = generateId('sec')
          newIds.push(nid)
          newSections.push({ ...sec, id: nid, x: sec.x + GRID_SIZE, y: sec.y + GRID_SIZE })
        }
        const tbl = d.tables.find((t) => t.id === sid)
        if (tbl) {
          const nid = generateId('dt')
          newIds.push(nid)
          newTables.push({ ...tbl, id: nid, x: tbl.x + GRID_SIZE, y: tbl.y + GRID_SIZE })
        }
        const dec = d.decoratives.find((dec) => dec.id === sid)
        if (dec) {
          const nid = generateId('dec')
          newIds.push(nid)
          newDecs.push({ ...dec, id: nid, x: dec.x + GRID_SIZE, y: dec.y + GRID_SIZE })
        }
      })
      return { ...d, sections: newSections, tables: newTables, decoratives: newDecs }
    })
    setSelectedIds(newIds)
  }, [selectedIds, commitDocument])

  const alignSelected = useCallback((alignment: Parameters<typeof alignElements>[4]) => {
    const updates = alignElements(selectedIds, document.tables, document.decoratives, document.sections, alignment)
    if (!updates) return
    commitDocument((d) => ({
      ...d,
      sections: d.sections.map((s) => (updates[s.id] ? { ...s, ...updates[s.id] } : s)),
      tables: d.tables.map((t) => (updates[t.id] ? { ...t, ...updates[t.id] } : t)),
      decoratives: d.decoratives.map((dec) => (updates[dec.id] ? { ...dec, ...updates[dec.id] } : dec)),
    }))
  }, [selectedIds, document, commitDocument])

  const mergeSelectedTables = useCallback(() => {
    const tableIds = selectedIds.filter((id) => document.tables.some((t) => t.id === id))
    if (tableIds.length < 2) return
    commitDocument((d) => ({ ...d, tables: mergeTables(d.tables, tableIds) }))
  }, [selectedIds, document.tables, commitDocument])

  const toggleVisibility = useCallback((id: string) => {
    commitDocument((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
      tables: d.tables.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)),
      decoratives: d.decoratives.map((dec) => (dec.id === id ? { ...dec, visible: !dec.visible } : dec)),
    }))
  }, [commitDocument])

  const toggleLock = useCallback((id: string) => {
    commitDocument((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)),
      tables: d.tables.map((t) => (t.id === id ? { ...t, locked: !t.locked } : t)),
      decoratives: d.decoratives.map((dec) => (dec.id === id ? { ...dec, locked: !dec.locked } : dec)),
    }))
  }, [commitDocument])

  const bringForward = useCallback((id: string) => {
    commitDocument((d) => {
      const maxZ = Math.max(
        ...d.sections.map((s) => s.zIndex),
        ...d.tables.map((t) => t.zIndex),
        ...d.decoratives.map((dec) => dec.zIndex),
      )
      return {
        ...d,
        sections: d.sections.map((s) => (s.id === id ? { ...s, zIndex: maxZ + 1 } : s)),
        tables: d.tables.map((t) => (t.id === id ? { ...t, zIndex: maxZ + 1 } : t)),
        decoratives: d.decoratives.map((dec) => (dec.id === id ? { ...dec, zIndex: maxZ + 1 } : dec)),
      }
    })
  }, [commitDocument])

  const sendBackward = useCallback((id: string) => {
    commitDocument((d) => {
      const minZ = Math.min(
        ...d.sections.map((s) => s.zIndex),
        ...d.tables.map((t) => t.zIndex),
        ...d.decoratives.map((dec) => dec.zIndex),
      )
      return {
        ...d,
        sections: d.sections.map((s) => (s.id === id ? { ...s, zIndex: minZ - 1 } : s)),
        tables: d.tables.map((t) => (t.id === id ? { ...t, zIndex: minZ - 1 } : t)),
        decoratives: d.decoratives.map((dec) => (dec.id === id ? { ...dec, zIndex: minZ - 1 } : dec)),
      }
    })
  }, [commitDocument])

  const moveElement = useCallback((id: string, x: number, y: number) => {
    const sx = snapEnabled ? snap(x) : x
    const sy = snapEnabled ? snap(y) : y
    dragDirtyRef.current = true
    setDocument((d) => {
      const sec = d.sections.find((s) => s.id === id)
      if (sec && !sec.locked) {
        const c = clampPos(sx, sy, sec.w, sec.h)
        return { ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, x: c.x, y: c.y } : s)) }
      }
      const tbl = d.tables.find((t) => t.id === id)
      if (tbl && !tbl.locked) {
        const c = clampPos(sx, sy, tbl.w, tbl.h)
        return { ...d, tables: d.tables.map((t) => (t.id === id ? { ...t, x: c.x, y: c.y } : t)) }
      }
      const dec = d.decoratives.find((dec) => dec.id === id)
      if (dec && !dec.locked) {
        const c = clampPos(sx, sy, dec.w, dec.h)
        return { ...d, decoratives: d.decoratives.map((dec) => (dec.id === id ? { ...dec, x: c.x, y: c.y } : dec)) }
      }
      return d
    })
    setIsDirty(true)
  }, [snapEnabled])

  const finalizeDrag = useCallback(() => {
    if (dragDirtyRef.current) {
      pushHistory(documentRef.current)
      dragDirtyRef.current = false
    }
  }, [pushHistory])

  const nudgeSelected = useCallback((dx: number, dy: number) => {
    commitDocument((d) => ({
      ...d,
      sections: d.sections.map((s) => selectedIds.includes(s.id) && !s.locked
        ? { ...s, ...clampPos(s.x + dx, s.y + dy, s.w, s.h) } : s),
      tables: d.tables.map((t) => selectedIds.includes(t.id) && !t.locked
        ? { ...t, ...clampPos(t.x + dx, t.y + dy, t.w, t.h) } : t),
      decoratives: d.decoratives.map((dec) => selectedIds.includes(dec.id) && !dec.locked
        ? { ...dec, ...clampPos(dec.x + dx, dec.y + dy, dec.w, dec.h) } : dec),
    }))
  }, [selectedIds, commitDocument])

  const resetDocument = useCallback(() => {
    const doc = createDefaultDocument()
    setDocument(doc)
    pushHistory(doc)
    setSelectedIds([])
    setIsDirty(true)
  }, [pushHistory])

  const saveDocument = useCallback((bid: string) => {
    saveFloorDocument(bid, document)
    markClean()
  }, [document, markClean])

  const loadDocument = useCallback((bid: string) => {
    const doc = loadFloorDocument(bid)
    setDocument(doc)
    historyRef.current = [JSON.parse(JSON.stringify(doc))]
    historyIndexRef.current = 0
    syncHistoryFlags()
    setSelectedIds([])
    markClean()
  }, [markClean, syncHistoryFlags])

  const fitView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [setZoom])

  const zoomToSelection = useCallback(() => {
    const bounds = getElementBounds(document, selectedIds)
    if (!bounds || bounds.w === 0) return
    const padding = 80
    const scaleX = (DESIGNER_CANVAS.w - padding * 2) / bounds.w
    const scaleY = (DESIGNER_CANVAS.h - padding * 2) / bounds.h
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(scaleX, scaleY, 2)))
    const cx = bounds.x + bounds.w / 2
    const cy = bounds.y + bounds.h / 2
    setZoom(newZoom)
    setPan({
      x: -(cx - DESIGNER_CANVAS.w / 2) * newZoom,
      y: -(cy - DESIGNER_CANVAS.h / 2) * newZoom,
    })
  }, [document, selectedIds, setZoom])

  const zoomAtPoint = useCallback((newZoom: number, clientX: number, clientY: number, containerRect: DOMRect) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom))
    const mx = clientX - containerRect.left - containerRect.width / 2
    const my = clientY - containerRect.top - containerRect.height / 2
    const scale = clamped / zoom
    setPan({ x: pan.x - mx * (scale - 1), y: pan.y - my * (scale - 1) })
    setZoom(clamped)
  }, [zoom, pan, setZoom])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    setDocument(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])))
    syncHistoryFlags()
    setIsDirty(true)
  }, [syncHistoryFlags])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    setDocument(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])))
    syncHistoryFlags()
    setIsDirty(true)
  }, [syncHistoryFlags])

  return (
    <FloorDesignerContext.Provider
      value={{
        document, mode, setMode, activeTool, setActiveTool,
        selectedIds, setSelectedIds, toggleSelect, clearSelection, selectAll,
        zoom, setZoom, pan, setPan, snapEnabled, setSnapEnabled, showGrid, setShowGrid,
        updateSection, updateTable, updateDecorative, resizeElement,
        addSection, addDecorative, addTableToSection,
        deleteSelected, duplicateSelected, alignSelected, mergeSelectedTables,
        toggleVisibility, toggleLock, bringForward, sendBackward,
        moveElement, finalizeDrag, nudgeSelected, selectInRect,
        resetDocument, saveDocument, loadDocument,
        fitView, zoomToSelection, zoomAtPoint,
        undo, redo, canUndo, canRedo, isDirty, markClean,
      }}
    >
      {children}
    </FloorDesignerContext.Provider>
  )
}

export function useFloorDesigner() {
  const ctx = useContext(FloorDesignerContext)
  if (!ctx) throw new Error('useFloorDesigner must be used within FloorDesignerProvider')
  return ctx
}

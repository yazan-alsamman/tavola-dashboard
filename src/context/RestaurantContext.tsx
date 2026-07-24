import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'
import type {
  Reservation,
  Table,
  WaitlistEntry,
  Notification,
  TableStatus,
} from '@/types'
import {
  reservations as initialReservations,
  tables as initialTables,
  waitlist as initialWaitlist,
  notifications as initialNotifications,
  branches as initialBranches,
} from '@/data/mockData'
import { generateId, getTodayISO, normalizeDemoDate } from '@/lib/utils'
import {
  type FloorTableLayout,
  type FloorZone,
  defaultFloorBlueprint,
  defaultFloorZones,
  loadFloorLayout,
  saveFloorLayout,
} from '@/lib/floorLayout'

interface RestaurantContextType {
  reservations: Reservation[]
  tables: Table[]
  waitlist: WaitlistEntry[]
  notifications: Notification[]
  activeBranchId: string
  setActiveBranchId: (id: string) => void
  branches: typeof initialBranches
  todayReservations: Reservation[]
  pendingCount: number
  arrivingSoon: Reservation[]
  stats: {
    todayTotal: number
    expectedGuests: number
    occupancyRate: number
    availableTables: number
    occupiedTables: number
    waitlistCount: number
  }
  getReservation: (id: string) => Reservation | undefined
  search: (query: string) => { reservations: Reservation[]; customers: { name: string; phone: string }[] }
  /** Legacy mock walk-in seating only — not the live reservations API. */
  registerWalkIn: (data: { name: string; phone: string; guestCount: number; tableId: string }) => void
  addToWaitlist: (data: { name: string; phone: string; guestCount: number }) => void
  removeFromWaitlist: (id: string) => void
  assignWaitlistToTable: (waitlistId: string, tableId: string) => void
  updateTableStatus: (tableId: string, status: TableStatus) => void
  updateTableCapacity: (tableId: string, capacity: number) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  unreadNotificationCount: number
  floorBlueprint: FloorTableLayout[]
  floorZones: FloorZone[]
  updateTableLayout: (tableId: string, updates: Partial<Pick<FloorTableLayout, 'x' | 'y' | 'w' | 'h'>>) => void
  updateFloorZone: (zoneId: string, updates: Partial<Pick<FloorZone, 'x' | 'y' | 'w' | 'h'>>) => void
  resetFloorLayout: () => void
  saveFloorLayoutToStorage: () => void
}

const RestaurantContext = createContext<RestaurantContextType | null>(null)

function initReservations(): Reservation[] {
  return initialReservations.map((r) => ({ ...r, date: normalizeDemoDate(r.date) }))
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>(initReservations)
  const [tables, setTables] = useState<Table[]>(() => [...initialTables])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => [...initialWaitlist])
  const [notifications, setNotifications] = useState<Notification[]>(() => [...initialNotifications])
  const [activeBranchId, setActiveBranchId] = useState('b1')
  const [floorBlueprint, setFloorBlueprint] = useState<FloorTableLayout[]>(defaultFloorBlueprint)
  const [floorZones, setFloorZones] = useState<FloorZone[]>(defaultFloorZones)

  const loadBranchFloorLayout = useCallback((branchId: string) => {
    const { blueprint, zones } = loadFloorLayout(branchId)
    setFloorBlueprint(blueprint)
    setFloorZones(zones)
  }, [])

  useEffect(() => {
    loadBranchFloorLayout(activeBranchId)
  }, [activeBranchId, loadBranchFloorLayout])

  const today = getTodayISO()

  const todayReservations = useMemo(
    () => reservations.filter((r) => r.date === today),
    [reservations, today],
  )

  const pendingCount = useMemo(
    () => todayReservations.filter((r) => r.status === 'pending').length,
    [todayReservations],
  )

  const arrivingSoon = useMemo(() => {
    const now = new Date()
    return todayReservations
      .filter((r) => {
        if (!['pending', 'confirmed'].includes(r.status)) return false
        const [h, m] = r.time.split(':').map(Number)
        const resTime = new Date()
        resTime.setHours(h, m, 0, 0)
        const diffMin = (resTime.getTime() - now.getTime()) / 60000
        return diffMin >= -15 && diffMin <= 90
      })
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [todayReservations])

  const stats = useMemo(() => {
    const active = todayReservations.filter((r) => !['cancelled', 'completed', 'no_show'].includes(r.status))
    const expectedGuests = active.reduce((sum, r) => sum + r.guestCount, 0)
    const occupiedTables = tables.filter((t) => t.status === 'occupied').length
    const availableTables = tables.filter((t) => t.status === 'available').length
    const totalSeats = tables.filter((t) => t.status !== 'out_of_service').reduce((s, t) => s + t.capacity, 0)
    const occupiedSeats = tables
      .filter((t) => t.status === 'occupied')
      .reduce((s, t) => s + t.capacity, 0)
    const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0

    return {
      todayTotal: todayReservations.length,
      expectedGuests,
      occupancyRate,
      availableTables,
      occupiedTables,
      waitlistCount: waitlist.length,
    }
  }, [todayReservations, tables, waitlist])

  const getReservation = useCallback((id: string) => reservations.find((r) => r.id === id), [reservations])

  const search = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim()
      if (!q) return { reservations: [], customers: [] }
      const matchedReservations = reservations.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      )
      const customerMap = new Map<string, { name: string; phone: string }>()
      matchedReservations.forEach((r) => customerMap.set(r.phone, { name: r.customerName, phone: r.phone }))
      return { reservations: matchedReservations.slice(0, 8), customers: [...customerMap.values()].slice(0, 4) }
    },
    [reservations],
  )

  const registerWalkIn = useCallback(
    (data: { name: string; phone: string; guestCount: number; tableId: string }) => {
      const table = tables.find((t) => t.id === data.tableId)
      if (!table) return
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const newRes: Reservation = {
        id: generateId('RES'),
        customerName: data.name,
        phone: data.phone,
        email: '',
        date: today,
        time,
        duration: 90,
        guestCount: data.guestCount,
        tableId: data.tableId,
        tableName: table.name,
        status: 'seated',
        createdAt: now.toISOString(),
        notes: 'Walk-in guest',
      }
      setReservations((prev) => [newRes, ...prev])
      setTables((prev) =>
        prev.map((t) =>
          t.id === data.tableId
            ? { ...t, status: 'occupied' as TableStatus, currentReservationId: newRes.id }
            : t,
        ),
      )
    },
    [tables, today],
  )

  const addToWaitlist = useCallback((data: { name: string; phone: string; guestCount: number }) => {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setWaitlist((prev) => [...prev, { id: generateId('W'), ...data, arrivalTime: time }])
  }, [])

  const removeFromWaitlist = useCallback((id: string) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const assignWaitlistToTable = useCallback(
    (waitlistId: string, tableId: string) => {
      const entry = waitlist.find((w) => w.id === waitlistId)
      if (!entry) return
      registerWalkIn({ name: entry.name, phone: entry.phone, guestCount: entry.guestCount, tableId })
      removeFromWaitlist(waitlistId)
    },
    [waitlist, registerWalkIn, removeFromWaitlist],
  )

  const updateTableStatus = useCallback((tableId: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status,
              currentReservationId: status === 'available' ? undefined : t.currentReservationId,
              nextReservationId: status === 'available' ? undefined : t.nextReservationId,
            }
          : t,
      ),
    )
  }, [])

  const updateTableCapacity = useCallback((tableId: string, capacity: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, capacity: Math.max(1, Math.min(20, capacity)) } : t)),
    )
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const unreadNotificationCount = notifications.filter((n) => !n.read).length

  const updateTableLayout = useCallback((tableId: string, updates: Partial<Pick<FloorTableLayout, 'x' | 'y' | 'w' | 'h'>>) => {
    setFloorBlueprint((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, ...updates } : t)),
    )
  }, [])

  const updateFloorZone = useCallback((zoneId: string, updates: Partial<Pick<FloorZone, 'x' | 'y' | 'w' | 'h'>>) => {
    setFloorZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
    )
  }, [])

  const resetFloorLayout = useCallback(() => {
    setFloorBlueprint([...defaultFloorBlueprint])
    setFloorZones([...defaultFloorZones])
  }, [])

  const saveFloorLayoutToStorage = useCallback(() => {
    saveFloorLayout(activeBranchId, floorBlueprint, floorZones)
  }, [activeBranchId, floorBlueprint, floorZones])

  return (
    <RestaurantContext.Provider
      value={{
        reservations,
        tables,
        waitlist,
        notifications,
        activeBranchId,
        setActiveBranchId,
        branches: initialBranches,
        todayReservations,
        pendingCount,
        arrivingSoon,
        stats,
        getReservation,
        search,
        registerWalkIn,
        addToWaitlist,
        removeFromWaitlist,
        assignWaitlistToTable,
        updateTableStatus,
        updateTableCapacity,
        markNotificationRead,
        markAllNotificationsRead,
        unreadNotificationCount,
        floorBlueprint,
        floorZones,
        updateTableLayout,
        updateFloorZone,
        resetFloorLayout,
        saveFloorLayoutToStorage,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext)
  if (!ctx) throw new Error('useRestaurant must be used within RestaurantProvider')
  return ctx
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'out_of_service'

export type TableSection =
  | 'indoor'
  | 'outdoor'
  | 'terrace'
  | 'family'
  | 'vip'
  | 'private'

export type OccasionType =
  | 'birthday'
  | 'anniversary'
  | 'engagement'
  | 'graduation'
  | 'custom'

export type StaffRole = 'owner' | 'manager' | 'receptionist' | 'viewer'

export type AdditionalService =
  | 'cake'
  | 'flowers'
  | 'decoration'
  | 'special_setup'
  | 'candles'

export interface Reservation {
  id: string
  customerName: string
  phone: string
  email: string
  date: string
  time: string
  duration: number
  guestCount: number
  tableId: string
  tableName: string
  status: ReservationStatus
  createdAt: string
  occasion?: OccasionType
  services?: AdditionalService[]
  notes?: string
  cakeTime?: string
}

export interface Table {
  id: string
  name: string
  number: number
  capacity: number
  section: TableSection
  status: TableStatus
  x: number
  y: number
  width: number
  height: number
  features: string[]
  currentReservationId?: string
  nextReservationId?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  reservationCount: number
  visitCount: number
  lastVisit: string
}

export interface WaitlistEntry {
  id: string
  name: string
  phone: string
  guestCount: number
  arrivalTime: string
}

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: StaffRole
  active: boolean
}

export interface Notification {
  id: string
  type: 'new_reservation' | 'updated' | 'cancelled' | 'arrived' | 'occasion'
  title: string
  message: string
  time: string
  read: boolean
}

export interface ActivityLog {
  id: string
  user: string
  action: string
  date: string
  time: string
  entity: string
}

export interface Branch {
  id: string
  name: string
  address: string
  active: boolean
}

export interface DashboardStats {
  todayReservations: number
  upcomingReservations: number
  expectedGuests: number
  occupancyRate: number
  confirmed: number
  pending: number
  cancelled: number
}

export interface SpecialOccasion {
  id: string
  customerName: string
  occasionType: OccasionType
  executionTime: string
  services: AdditionalService[]
  notes: string
  status: 'pending' | 'preparing' | 'ready' | 'completed'
  reservationId: string
}

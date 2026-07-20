import type {
  Reservation,
  Table,
  Customer,
  WaitlistEntry,
  StaffMember,
  Notification,
  ActivityLog,
  Branch,
  DashboardStats,
  SpecialOccasion,
} from '@/types'

export const restaurantInfo = {
  name: 'مطعم نارنج',
  nameEn: 'Naranj Restaurant',
  branch: 'دمشق — المدينة القديمة',
  logo: 'ن',
}

export const dashboardStats: DashboardStats = {
  todayReservations: 24,
  upcomingReservations: 8,
  expectedGuests: 86,
  occupancyRate: 72,
  confirmed: 18,
  pending: 4,
  cancelled: 2,
}

export const reservations: Reservation[] = [
  {
    id: 'RES-1042',
    customerName: 'Ahmad Al-Hassan',
    phone: '+963 944 123 456',
    email: 'ahmad@email.com',
    date: '2026-07-13',
    time: '19:00',
    duration: 120,
    guestCount: 4,
    tableId: 't3',
    tableName: 'Table 3',
    status: 'confirmed',
    createdAt: '2026-07-12T10:30:00',
    occasion: 'birthday',
    services: ['cake', 'candles', 'decoration'],
    notes: 'Chocolate cake with "Happy 30th Birthday Ahmad" message. Please prepare at 20:30.',
    cakeTime: '20:30',
  },
  {
    id: 'RES-1043',
    customerName: 'Sara Khoury',
    phone: '+963 933 987 654',
    email: 'sara.k@email.com',
    date: '2026-07-13',
    time: '19:30',
    duration: 90,
    guestCount: 2,
    tableId: 't7',
    tableName: 'Table 7',
    status: 'pending',
    createdAt: '2026-07-13T08:15:00',
    occasion: 'anniversary',
    services: ['flowers'],
    notes: 'Window seat preferred if available.',
  },
  {
    id: 'RES-1044',
    customerName: 'Omar Fares',
    phone: '+963 955 234 567',
    email: 'omar.f@email.com',
    date: '2026-07-13',
    time: '20:00',
    duration: 120,
    guestCount: 6,
    tableId: 't12',
    tableName: 'VIP 2',
    status: 'confirmed',
    createdAt: '2026-07-11T14:20:00',
    notes: 'Business dinner — quiet area requested.',
  },
  {
    id: 'RES-1045',
    customerName: 'Layla Mansour',
    phone: '+963 966 345 678',
    email: 'layla@email.com',
    date: '2026-07-13',
    time: '18:00',
    duration: 90,
    guestCount: 3,
    tableId: 't1',
    tableName: 'Table 1',
    status: 'seated',
    createdAt: '2026-07-10T09:00:00',
  },
  {
    id: 'RES-1046',
    customerName: 'Khaled Nasser',
    phone: '+963 977 456 789',
    email: 'khaled@email.com',
    date: '2026-07-13',
    time: '21:00',
    duration: 120,
    guestCount: 8,
    tableId: 't15',
    tableName: 'Family 1',
    status: 'confirmed',
    createdAt: '2026-07-09T16:45:00',
    occasion: 'engagement',
    services: ['decoration', 'special_setup', 'flowers'],
    notes: 'Engagement celebration — family of 8. Need high chair for toddler.',
  },
  {
    id: 'RES-1047',
    customerName: 'Rana Deeb',
    phone: '+963 988 567 890',
    email: 'rana@email.com',
    date: '2026-07-13',
    time: '12:30',
    duration: 60,
    guestCount: 2,
    tableId: 't5',
    tableName: 'Table 5',
    status: 'completed',
    createdAt: '2026-07-12T11:00:00',
  },
  {
    id: 'RES-1048',
    customerName: 'Youssef Hamwi',
    phone: '+963 999 678 901',
    email: 'youssef@email.com',
    date: '2026-07-13',
    time: '13:00',
    duration: 90,
    guestCount: 4,
    tableId: 't8',
    tableName: 'Table 8',
    status: 'cancelled',
    createdAt: '2026-07-11T20:30:00',
    notes: 'Cancelled due to travel plans.',
  },
  {
    id: 'RES-1049',
    customerName: 'Maya Tahan',
    phone: '+963 911 789 012',
    email: 'maya@email.com',
    date: '2026-07-14',
    time: '19:00',
    duration: 120,
    guestCount: 5,
    tableId: 't10',
    tableName: 'Terrace 1',
    status: 'confirmed',
    createdAt: '2026-07-13T07:00:00',
    occasion: 'graduation',
    services: ['cake'],
    cakeTime: '20:00',
  },
]

export const tables: Table[] = [
  { id: 't1', name: 'Table 1', number: 1, capacity: 4, section: 'indoor', status: 'occupied', x: 40, y: 40, width: 80, height: 80, features: ['window_view', 'non_smoking'], currentReservationId: 'RES-1045' },
  { id: 't2', name: 'Table 2', number: 2, capacity: 2, section: 'indoor', status: 'available', x: 140, y: 40, width: 60, height: 60, features: ['non_smoking'] },
  { id: 't3', name: 'Table 3', number: 3, capacity: 4, section: 'indoor', status: 'reserved', x: 220, y: 40, width: 80, height: 80, features: ['window_view'], nextReservationId: 'RES-1042' },
  { id: 't4', name: 'Table 4', number: 4, capacity: 6, section: 'indoor', status: 'available', x: 40, y: 140, width: 100, height: 80, features: ['family_friendly'] },
  { id: 't5', name: 'Table 5', number: 5, capacity: 2, section: 'indoor', status: 'available', x: 160, y: 140, width: 60, height: 60, features: ['non_smoking'] },
  { id: 't6', name: 'Table 6', number: 6, capacity: 4, section: 'outdoor', status: 'occupied', x: 40, y: 260, width: 80, height: 80, features: ['smoking_area'], currentReservationId: 'RES-1040' },
  { id: 't7', name: 'Table 7', number: 7, capacity: 2, section: 'outdoor', status: 'reserved', x: 140, y: 260, width: 60, height: 60, features: ['window_view'], nextReservationId: 'RES-1043' },
  { id: 't8', name: 'Table 8', number: 8, capacity: 4, section: 'terrace', status: 'available', x: 220, y: 260, width: 80, height: 80, features: ['window_view', 'non_smoking'] },
  { id: 't10', name: 'Terrace 1', number: 10, capacity: 6, section: 'terrace', status: 'reserved', x: 360, y: 40, width: 100, height: 80, features: ['window_view'], nextReservationId: 'RES-1049' },
  { id: 't12', name: 'VIP 2', number: 12, capacity: 6, section: 'vip', status: 'reserved', x: 360, y: 140, width: 100, height: 80, features: ['non_smoking'], nextReservationId: 'RES-1044' },
  { id: 't15', name: 'Family 1', number: 15, capacity: 8, section: 'family', status: 'reserved', x: 360, y: 260, width: 120, height: 90, features: ['family_friendly', 'wheelchair_accessible'], nextReservationId: 'RES-1046' },
  { id: 't16', name: 'Private 1', number: 16, capacity: 10, section: 'private', status: 'out_of_service', x: 500, y: 40, width: 130, height: 100, features: ['non_smoking'] },
]

export const customers: Customer[] = [
  { id: 'c1', name: 'Ahmad Al-Hassan', phone: '+963 944 123 456', email: 'ahmad@email.com', reservationCount: 12, visitCount: 10, lastVisit: '2026-06-28' },
  { id: 'c2', name: 'Sara Khoury', phone: '+963 933 987 654', email: 'sara.k@email.com', reservationCount: 8, visitCount: 7, lastVisit: '2026-07-01' },
  { id: 'c3', name: 'Omar Fares', phone: '+963 955 234 567', email: 'omar.f@email.com', reservationCount: 15, visitCount: 14, lastVisit: '2026-07-10' },
  { id: 'c4', name: 'Layla Mansour', phone: '+963 966 345 678', email: 'layla@email.com', reservationCount: 5, visitCount: 4, lastVisit: '2026-07-05' },
  { id: 'c5', name: 'Khaled Nasser', phone: '+963 977 456 789', email: 'khaled@email.com', reservationCount: 3, visitCount: 2, lastVisit: '2026-06-15' },
]

export const waitlist: WaitlistEntry[] = [
  { id: 'w1', name: 'Hassan Ali', phone: '+963 922 111 222', guestCount: 3, arrivalTime: '19:15' },
  { id: 'w2', name: 'Nour Barakat', phone: '+963 933 333 444', guestCount: 2, arrivalTime: '19:45' },
  { id: 'w3', name: 'Fadi Saad', phone: '+963 944 555 666', guestCount: 5, arrivalTime: '20:00' },
]

export const staff: StaffMember[] = [
  { id: 's1', name: 'George Naim', email: 'george@naranj.com', phone: '+963 944 000 001', role: 'owner', active: true },
  { id: 's2', name: 'Rita Haddad', email: 'rita@naranj.com', phone: '+963 944 000 002', role: 'manager', active: true },
  { id: 's3', name: 'Samir Kanaan', email: 'samir@naranj.com', phone: '+963 944 000 003', role: 'receptionist', active: true },
  { id: 's4', name: 'Diana Saleh', email: 'diana@naranj.com', phone: '+963 944 000 004', role: 'receptionist', active: true },
  { id: 's5', name: 'Tony Azar', email: 'tony@naranj.com', phone: '+963 944 000 005', role: 'viewer', active: true },
]

export const notifications: Notification[] = [
  { id: 'n1', type: 'new_reservation', title: 'New Reservation', message: 'Maya Tahan booked Terrace 1 for tomorrow at 7:00 PM (5 guests)', time: '07:00', read: false },
  { id: 'n2', type: 'occasion', title: 'Upcoming Occasion', message: 'Birthday cake for Ahmad Al-Hassan at 8:30 PM — prepare chocolate cake', time: '18:00', read: false },
  { id: 'n3', type: 'updated', title: 'Reservation Updated', message: 'Sara Khoury changed guest count from 3 to 2', time: '14:30', read: true },
  { id: 'n4', type: 'cancelled', title: 'Reservation Cancelled', message: 'Youssef Hamwi cancelled Table 8 reservation for 1:00 PM', time: '11:20', read: true },
  { id: 'n5', type: 'arrived', title: 'Customer Arrived', message: 'Layla Mansour checked in at Table 1', time: '17:55', read: true },
]

export const activityLogs: ActivityLog[] = [
  { id: 'a1', user: 'Samir Kanaan', action: 'Reservation Confirmed', date: '2026-07-13', time: '08:30', entity: 'RES-1043' },
  { id: 'a2', user: 'Rita Haddad', action: 'Table Updated', date: '2026-07-13', time: '09:15', entity: 'Private 1 — Out of Service' },
  { id: 'a3', user: 'Samir Kanaan', action: 'Customer Checked In', date: '2026-07-13', time: '17:55', entity: 'RES-1045' },
  { id: 'a4', user: 'Diana Saleh', action: 'Reservation Created', date: '2026-07-13', time: '07:00', entity: 'RES-1049' },
  { id: 'a5', user: 'George Naim', action: 'Settings Changed', date: '2026-07-12', time: '22:00', entity: 'Working Hours' },
]

export const branches: Branch[] = [
  { id: 'b1', name: 'Old City — Main', address: 'Straight Street, Damascus Old City', active: true },
  { id: 'b2', name: 'Malki Branch', address: 'Malki Street, Damascus', active: true },
  { id: 'b3', name: 'Abu Rummaneh', address: 'Abu Rummaneh, Damascus', active: false },
]

export const specialOccasions: SpecialOccasion[] = [
  { id: 'o1', customerName: 'Ahmad Al-Hassan', occasionType: 'birthday', executionTime: '20:30', services: ['cake', 'candles', 'decoration'], notes: 'Chocolate cake — "Happy 30th Birthday Ahmad"', status: 'preparing', reservationId: 'RES-1042' },
  { id: 'o2', customerName: 'Sara Khoury', occasionType: 'anniversary', executionTime: '19:30', services: ['flowers'], notes: 'Red roses bouquet on table', status: 'pending', reservationId: 'RES-1043' },
  { id: 'o3', customerName: 'Khaled Nasser', occasionType: 'engagement', executionTime: '21:15', services: ['decoration', 'special_setup', 'flowers'], notes: 'Engagement setup with candles and floral arrangement', status: 'pending', reservationId: 'RES-1046' },
  { id: 'o4', customerName: 'Maya Tahan', occasionType: 'graduation', executionTime: '20:00', services: ['cake'], notes: 'Graduation cake — vanilla with gold accents', status: 'pending', reservationId: 'RES-1049' },
]

export const occupancyData = [
  { day: 'Mon', rate: 65 },
  { day: 'Tue', rate: 58 },
  { day: 'Wed', rate: 72 },
  { day: 'Thu', rate: 81 },
  { day: 'Fri', rate: 94 },
  { day: 'Sat', rate: 98 },
  { day: 'Sun', rate: 76 },
]

export const reservationTrend = [
  { month: 'Jan', total: 320, cancelled: 28 },
  { month: 'Feb', total: 285, cancelled: 22 },
  { month: 'Mar', total: 410, cancelled: 35 },
  { month: 'Apr', total: 380, cancelled: 30 },
  { month: 'May', total: 445, cancelled: 38 },
  { month: 'Jun', total: 520, cancelled: 42 },
  { month: 'Jul', total: 180, cancelled: 15 },
]

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const h12 = h % 12 || 12
  const suffix = h >= 12 ? 'م' : 'ص'
  return `${h12}:${minutes} ${suffix}`
}

export function formatTimeEn(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getServicePeriod(): 'breakfast' | 'lunch' | 'dinner' | 'late' {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 22) return 'dinner'
  return 'late'
}

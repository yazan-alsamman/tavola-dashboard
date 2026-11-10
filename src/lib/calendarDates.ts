/** Calendar date helpers — all dates are local YYYY-MM-DD strings. */

import { formatDate } from '@/lib/format'

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`)
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + deltaDays)
  return toDateKey(date)
}

/** Monday-first week containing `dateKey`. */
/** Weeks start on Saturday everywhere in the dashboard (CR WJ-R-2026-002). */
export const WEEK_START_DAY = 6 // 0 Sun … 6 Sat

export function startOfWeek(dateKey: string): string {
  const date = parseDateKey(dateKey)
  const back = (date.getDay() - WEEK_START_DAY + 7) % 7
  date.setDate(date.getDate() - back)
  return toDateKey(date)
}

export function endOfWeek(dateKey: string): string {
  return shiftDateKey(startOfWeek(dateKey), 6)
}

export function startOfMonth(dateKey: string): string {
  const date = parseDateKey(dateKey)
  date.setDate(1)
  return toDateKey(date)
}

export function endOfMonth(dateKey: string): string {
  const date = parseDateKey(dateKey)
  date.setMonth(date.getMonth() + 1, 0)
  return toDateKey(date)
}

export function shiftMonth(dateKey: string, deltaMonths: number): string {
  const date = parseDateKey(dateKey)
  date.setMonth(date.getMonth() + deltaMonths, 1)
  return toDateKey(date)
}

export function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = []
  let cursor = from
  while (cursor <= to) {
    keys.push(cursor)
    cursor = shiftDateKey(cursor, 1)
  }
  return keys
}

/** Month grid cells: leading/trailing days from adjacent months (Mon–Sun rows). */
export function monthGridKeys(dateKey: string): string[] {
  const monthStart = startOfMonth(dateKey)
  const monthEnd = endOfMonth(dateKey)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  return eachDateKey(gridStart, gridEnd)
}

export function formatDateLabel(
  dateKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = parseDateKey(dateKey)
  if (Number.isNaN(date.getTime())) return dateKey
  return formatDate(date, locale, options)
}

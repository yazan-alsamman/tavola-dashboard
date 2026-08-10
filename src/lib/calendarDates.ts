/** Calendar date helpers — all dates are local YYYY-MM-DD strings. */

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
export function startOfWeekMonday(dateKey: string): string {
  const date = parseDateKey(dateKey)
  const day = date.getDay() // 0 Sun … 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diffToMonday)
  return toDateKey(date)
}

export function endOfWeekSunday(dateKey: string): string {
  return shiftDateKey(startOfWeekMonday(dateKey), 6)
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
  const gridStart = startOfWeekMonday(monthStart)
  const gridEnd = endOfWeekSunday(monthEnd)
  return eachDateKey(gridStart, gridEnd)
}

export function formatDateLabel(
  dateKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = parseDateKey(dateKey)
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat(locale, options).format(date)
}

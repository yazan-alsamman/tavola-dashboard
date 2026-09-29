/**
 * One display formatter for staff-facing dates, times, ranges, and numbers.
 * Date-only keys (`YYYY-MM-DD`) stay on the local calendar day.
 */

export type DateInput = Date | string | number

function toDate(value: DateInput): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatDate(
  value: DateInput,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value)
  if (!date) return String(value)
  const hasParts = Boolean(options?.weekday || options?.day || options?.month || options?.year)
  return new Intl.DateTimeFormat(locale, {
    ...(hasParts ? {} : { dateStyle: 'medium' as const }),
    ...options,
  }).format(date)
}

export function formatTime(
  value: DateInput,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value)
  if (!date) return String(value)
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short', ...options }).format(date)
}

export function formatDateTime(
  value: DateInput,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value)
  if (!date) return String(value)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date)
}

export function formatDateRange(from: DateInput, to: DateInput, locale: string): string {
  const start = toDate(from)
  const end = toDate(to)
  if (!start || !end) return `${String(from)} – ${String(to)}`
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  if (typeof formatter.formatRange === 'function') return formatter.formatRange(start, end)
  return `${formatDate(start, locale)} – ${formatDate(end, locale)}`
}

/** "in 25 min" / "قبل 25 دقيقة", using the active locale. */
export function formatRelative(value: DateInput, locale: string, now: Date = new Date()): string {
  const date = toDate(value)
  if (!date) return String(value)
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000)
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
  return relative.format(Math.round(hours / 24), 'day')
}

/** Clock-hour label for a calendar axis. Never hardcodes AM/PM English. */
export function formatHour(hour: number, locale: string): string {
  const date = new Date(2000, 0, 1, hour, 0, 0)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(date)
}

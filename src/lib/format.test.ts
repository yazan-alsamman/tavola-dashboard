import { describe, expect, it } from 'vitest'
import { formatDateRange, formatHour, formatNumber, formatRelative } from '@/lib/format'

describe('format', () => {
  const now = new Date(2026, 8, 29, 12, 0, 0)

  it('formats a relative minute offset in English and Arabic', () => {
    const later = new Date(2026, 8, 29, 12, 25, 0)
    expect(formatRelative(later, 'en', now)).toMatch(/25/)
    expect(formatRelative(later, 'ar', now)).toMatch(/25|٢٥/)
    expect(formatRelative(later, 'ar', now)).not.toMatch(/AM|PM/)
  })

  it('localizes a calendar hour instead of writing English AM/PM', () => {
    expect(formatHour(15, 'en-US')).toMatch(/3/)
    expect(formatHour(15, 'ar')).not.toMatch(/PM/)
  })

  it('formats a date range and grouped numbers with the locale', () => {
    const range = formatDateRange('2026-09-01', '2026-09-29', 'en')
    expect(range).toMatch(/Sep/)
    expect(formatNumber(1200, 'en')).toBe('1,200')
    expect(formatNumber(1200, 'de')).toBe('1.200')
  })
})
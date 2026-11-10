import { describe, expect, it } from 'vitest'
import { fallbackHours, hoursForSchedule } from '@/lib/branchHours'

describe('hoursForSchedule', () => {
  it('draws each hour from opening to the last hour before closing', () => {
    expect(hoursForSchedule('12:00', '16:00')).toEqual([12, 13, 14, 15])
    expect(hoursForSchedule('12:00', '16:30')).toEqual([12, 13, 14, 15, 16])
  })

  it('runs to the end of the day when closing is after midnight', () => {
    expect(hoursForSchedule('20:00', '01:00')).toEqual([20, 21, 22, 23])
  })

  it('returns null for a closed day', () => {
    expect(hoursForSchedule(null, null)).toBeNull()
  })

  it('falls back to 10:00–23:00', () => {
    expect(fallbackHours()[0]).toBe(10)
    expect(fallbackHours().at(-1)).toBe(23)
  })
})

import { describe, expect, it } from 'vitest'
import { endOfWeek, monthGridKeys, startOfWeek } from '@/lib/calendarDates'

describe('weeks start on Saturday', () => {
  it('maps any day to the Saturday that opens its week', () => {
    expect(startOfWeek('2026-11-14')).toBe('2026-11-14') // Saturday
    expect(startOfWeek('2026-11-20')).toBe('2026-11-14') // Friday
    expect(startOfWeek('2026-11-15')).toBe('2026-11-14') // Sunday
    expect(endOfWeek('2026-11-16')).toBe('2026-11-20')
  })

  it('pads the month grid from Saturday to Friday', () => {
    const cells = monthGridKeys('2026-11-10')
    expect(cells[0]).toBe('2026-10-31') // Saturday before Nov 1st (Sunday)
    expect(cells.at(-1)).toBe('2026-12-04') // Friday after Nov 30th (Monday)
    expect(cells.length % 7).toBe(0)
  })
})

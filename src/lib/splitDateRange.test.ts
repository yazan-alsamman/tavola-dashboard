import { describe, expect, it } from 'vitest'
import { splitDateRange } from '@/hooks/useReservationQueries'

describe('splitDateRange', () => {
  it('keeps a short range as one window', () => {
    expect(splitDateRange('2026-11-01', '2026-11-30')).toEqual([['2026-11-01', '2026-11-30']])
  })

  it('splits a long range into consecutive windows the API accepts', () => {
    const windows = splitDateRange('2026-07-01', '2027-11-08', 366)
    expect(windows).toEqual([
      ['2026-07-01', '2027-07-01'],
      ['2027-07-02', '2027-11-08'],
    ])
  })
})

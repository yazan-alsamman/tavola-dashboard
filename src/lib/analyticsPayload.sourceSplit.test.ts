import { describe, expect, it } from 'vitest'
import { extractReservationSourceSplit } from './analyticsPayload'

describe('extractReservationSourceSplit', () => {
  it('counts Online as the app and every other source as the dashboard', () => {
    expect(
      extractReservationSourceSplit({
        sourceBreakdown: { Online: 7, Phone: 2, WalkIn: 3, Staff: 1, WaitlistConversion: 1 },
      }),
    ).toEqual({ app: 7, dashboard: 7 })
  })

  it('returns null without a breakdown', () => {
    expect(extractReservationSourceSplit({})).toBeNull()
  })
})

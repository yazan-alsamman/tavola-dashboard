import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { ar } from '@/i18n/ar'
import { reservationStatusLabel } from '@/lib/statusLabel'

describe('reservationStatusLabel', () => {
  it('uses the English label for a known status', () => {
    expect(reservationStatusLabel('Pending', en.status)).toBe('Pending')
    expect(reservationStatusLabel('NoShow', en.status)).toBe('No Show')
  })

  it('uses the Arabic label for the same status', () => {
    expect(reservationStatusLabel('Approved', ar.status)).toBe(ar.status.Approved)
    expect(reservationStatusLabel('Cancelled', ar.status)).toBe(ar.status.Cancelled)
  })

  it('keeps an unknown status visible', () => {
    expect(reservationStatusLabel('SeatedLater', en.status)).toBe('SeatedLater')
  })
})

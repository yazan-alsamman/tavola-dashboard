import { describe, expect, it } from 'vitest'
import { NO_OFFER_CONDITIONS, isOfferEditable, offerCurrency } from '@/api/offers'
import { ar } from '@/i18n/ar'
import { en } from '@/i18n/en'
import {
  offerConditionLabels,
  offerScheduleLabel,
  offerStatusLabel,
  offerTypeLabel,
  offerValueLabel,
} from './offerText'

describe('offer text (ADR-047)', () => {
  it('labels the four kinds in Arabic and keeps an unknown type as sent', () => {
    expect(offerTypeLabel('QuietDays', ar.offers)).toBe('أيام الهدوء')
    expect(offerTypeLabel('Promotion', en.offers)).toBe('Promotion (older)')
    expect(offerTypeLabel('Brand-new', en.offers)).toBe('Brand-new')
  })

  it('labels the ended status', () => {
    expect(offerStatusLabel('Expired', ar.offers)).toBe('منتهٍ')
  })

  it('shows a percentage, or an amount in the branch currency', () => {
    expect(offerValueLabel({ discountType: 'Percentage', discountValue: 20 }, 'SYP', en.offers, 'en')).toBe('20%')
    expect(
      offerValueLabel({ discountType: 'FixedAmount', discountValue: 5000 }, 'SYP', en.offers, 'en'),
    ).toBe('5,000 SYP off')
  })

  it('summarizes days, hours and conditions', () => {
    const conditions = {
      ...NO_OFFER_CONDITIONS,
      daysOfWeek: [2, 1],
      startTime: '18:00',
      endTime: '21:00',
      minPartySize: 4,
      oncePerCustomer: true,
    }
    expect(offerScheduleLabel(conditions, en.offers)).toBe('Mon, Tue · 18:00–21:00')
    expect(offerScheduleLabel(NO_OFFER_CONDITIONS, en.offers)).toBe('Every day · All day')
    expect(offerConditionLabels(conditions, en.offers, 'en')).toEqual(['4+ guests', 'Once per guest'])
  })
})

describe('offer rules mirrored from the backend', () => {
  it('edits Draft and running Published offers only', () => {
    expect(isOfferEditable({ offerId: 'o', status: 'Draft' })).toBe(true)
    expect(isOfferEditable({ offerId: 'o', status: 'Published' })).toBe(true)
    expect(isOfferEditable({ offerId: 'o', status: 'Expired' })).toBe(false)
  })

  it('uses the one currency of the covered branches', () => {
    const branches = [
      { branchId: 'a', currency: 'SYP' },
      { branchId: 'b', currency: 'USD' },
    ]
    expect(offerCurrency(['a'], branches)).toBe('SYP')
    expect(offerCurrency([], branches)).toBeNull()
  })
})

import type { OfferConditions, OfferDto } from '@/api/offers'
import type { TranslationKeys } from '@/i18n/en'
import { formatNumber } from '@/lib/format'

type OfferCopy = TranslationKeys['offers']

/** The type's label in the reader's language; an unknown type shows as sent. */
export function offerTypeLabel(type: string | undefined, copy: OfferCopy): string {
  if (!type) return '—'
  return (copy.types as Record<string, string>)[type] ?? type
}

export function offerStatusLabel(status: string | undefined, copy: OfferCopy): string {
  if (status === 'Draft') return copy.statusDraft
  if (status === 'Published') return copy.statusPublished
  if (status === 'Expired') return copy.statusExpired
  return status ?? '—'
}

/** "20%", "5,000 SYP off", or "5,000 off" when the currency is unknown. */
export function offerValueLabel(
  offer: Pick<OfferDto, 'discountType' | 'discountValue'>,
  currency: string | null,
  copy: OfferCopy,
  locale: string,
): string {
  const value = formatNumber(offer.discountValue ?? 0, locale)
  if (offer.discountType === 'Percentage') return `${value}%`
  return currency
    ? copy.amountOff.replace('{value}', value).replace('{currency}', currency)
    : copy.amountOffNoCurrency.replace('{value}', value)
}

/** "Mon, Tue · 12:00–16:00" or "Every day · All day". */
export function offerScheduleLabel(conditions: OfferConditions, copy: OfferCopy): string {
  const days = conditions.daysOfWeek.length
    ? [...conditions.daysOfWeek]
        .sort((a, b) => a - b)
        .map((day) => copy.weekdaysShort[day])
        .join(copy.daySeparator)
    : copy.everyDay
  const hours =
    conditions.startTime && conditions.endTime
      ? copy.timeWindow.replace('{from}', conditions.startTime).replace('{to}', conditions.endTime)
      : copy.allDay
  return `${days} · ${hours}`
}

/** The restrictions that are set, one short phrase each. */
export function offerConditionLabels(
  conditions: OfferConditions,
  copy: OfferCopy,
  locale: string,
): string[] {
  const labels: string[] = []
  if (conditions.minPartySize) {
    labels.push(copy.minParty.replace('{n}', formatNumber(conditions.minPartySize, locale)))
  }
  if (conditions.branchIds.length) {
    labels.push(copy.branchCount.replace('{n}', formatNumber(conditions.branchIds.length, locale)))
  }
  if (conditions.oncePerCustomer) labels.push(copy.oncePerGuest)
  if (conditions.bookingCap) {
    labels.push(copy.cap.replace('{n}', formatNumber(conditions.bookingCap, locale)))
  }
  return labels
}

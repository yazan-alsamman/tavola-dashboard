import type { TranslationKeys } from '@/i18n/en'

/**
 * One map from a reservation status enum to the staff-facing label.
 * Unknown values stay as returned so a new status is visible rather than blank.
 */
export function reservationStatusLabel(
  status: string,
  labels: TranslationKeys['status'],
): string {
  if (Object.prototype.hasOwnProperty.call(labels, status)) {
    return labels[status as keyof TranslationKeys['status']]
  }
  return status
}

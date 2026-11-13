/**
 * Currencies offered in dropdowns (ISO 4217): Syria first, then the region
 * Tavola serves, then the common reference currencies.
 */
export const SUPPORTED_CURRENCIES = [
  'SYP',
  'USD',
  'EUR',
  'TRY',
  'LBP',
  'JOD',
  'IQD',
  'SAR',
  'AED',
  'QAR',
  'KWD',
  'BHD',
  'OMR',
  'EGP',
  'GBP',
] as const

/** The interface languages a user can pick, as ISO 639-1 codes. */
export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const

/** "الليرة السورية (SYP)" or "Syrian Pound (SYP)", in the selected language. */
export function currencyLabel(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code)
    return name && name !== code ? `${name} (${code})` : code
  } catch {
    return code
  }
}

/** The supported list, plus a saved code that is not in it, so nothing is lost. */
export function currencyOptions(current: string | null | undefined): string[] {
  const list: string[] = [...SUPPORTED_CURRENCIES]
  if (current && !list.includes(current)) list.push(current)
  return list
}

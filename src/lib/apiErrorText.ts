import { isApiError } from '@/api/errors'
import type { TranslationKeys } from '@/i18n/en'

/**
 * The text to show for a failed request, in the selected language. The
 * backend writes its messages in English, so English shows the server's
 * specific message while Arabic shows the translated text for the error
 * `code`. Anything unknown falls back to the caller's translated text.
 */
export function apiErrorText(err: unknown, t: TranslationKeys, fallback: string): string {
  if (!isApiError(err)) return fallback
  if (t.apiErrors.serverMessages === 'show' && err.message) return err.message
  const codes: Record<string, string> = t.apiErrors.codes
  return codes[err.code] ?? fallback
}

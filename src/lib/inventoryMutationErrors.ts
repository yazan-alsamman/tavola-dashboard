import { isApiError } from '@/api/errors'
import type { ApiErrorCode } from '@/api/types'

export interface InventoryErrorMessages {
  unknown: string
  validation: string
  forbidden: string
  notFound: string
  conflict: string
  duplicateTableNumber: string
  invalidStatusTransition: string
  invalidMoveTarget: string
}

/**
 * Maps confirmed stable ApiError codes for inventory mutations.
 * Does not parse backend message strings.
 */
export function mapInventoryMutationError(
  error: unknown,
  messages: InventoryErrorMessages,
): string {
  if (!isApiError(error)) return messages.unknown

  const code = error.code as ApiErrorCode

  switch (code) {
    case 'VALIDATION_ERROR':
      return messages.validation
    case 'FORBIDDEN':
      return messages.forbidden
    case 'NOT_FOUND':
      return messages.notFound
    case 'CONFLICT':
      return messages.conflict
    case 'TABLE_UNAVAILABLE':
      return messages.invalidStatusTransition
    default:
      return messages.unknown
  }
}

/** Field-path errors from VALIDATION_ERROR `errors[]` when present. */
export function extractValidationFieldErrors(
  error: unknown,
): Record<string, string> {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') return {}

  const fields: Record<string, string> = {}
  for (const item of error.errors) {
    if (
      item &&
      typeof item === 'object' &&
      'path' in item &&
      'message' in item
    ) {
      const path = String((item as { path: unknown }).path)
      const message = String((item as { message: unknown }).message)
      if (path) fields[path] = message
    } else if (
      item &&
      typeof item === 'object' &&
      'field' in item &&
      'message' in item
    ) {
      const field = String((item as { field: unknown }).field)
      const message = String((item as { message: unknown }).message)
      if (field) fields[field] = message
    }
  }
  return fields
}

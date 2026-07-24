import type { ApiErrorCode } from './types'

/**
 * Typed error thrown by the API client for every failed backend response
 * and for malformed/network failures at the HTTP boundary.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly errors: unknown[]
  readonly path: string | undefined
  readonly timestamp: string | undefined

  constructor(params: {
    message: string
    status: number
    code: ApiErrorCode
    errors?: unknown[]
    path?: string
    timestamp?: string
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.errors = params.errors ?? []
    this.path = params.path
    this.timestamp = params.timestamp
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

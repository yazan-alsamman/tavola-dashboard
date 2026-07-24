import { ApiError } from './errors'
import { tokenStore } from './tokenStore'
import type {
  ApiErrorCode,
  ApiRequestOptions,
  ApiRequestResult,
  AuthTokenPair,
  HttpMethod,
} from './types'

const AUTH_EXPIRED_TOKEN = 'AUTH_EXPIRED_TOKEN' as const

interface InternalRequestOptions extends ApiRequestOptions {
  /** Skip the single refresh-and-retry (used by the refresh call itself). */
  skipAuthRefresh?: boolean
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * Resolves and validates `VITE_API_BASE_URL`.
 * Accepts absolute `http(s)` URLs, or a path-absolute root (e.g. `/api/v1`)
 * for same-origin Vite proxying during local development.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL

  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(
      'VITE_API_BASE_URL is not configured. Set it in .env.local (see .env.example).',
    )
  }

  const baseUrl = raw.trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(baseUrl) || baseUrl.startsWith('/')) {
    return baseUrl
  }

  throw new Error(
    `VITE_API_BASE_URL must be an absolute http(s) URL or a path starting with "/". Received: "${raw}"`,
  )
}

/** Client-generated UUID for `Idempotency-Key` on required mutations. */
export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

function resolveAbsoluteBaseUrl(baseUrl: string): string {
  if (/^https?:\/\//i.test(baseUrl)) {
    return baseUrl
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://127.0.0.1'

  return `${origin}${baseUrl}`
}

function buildUrl(
  path: string,
  query: ApiRequestOptions['query'],
): string {
  const baseUrl = resolveAbsoluteBaseUrl(getApiBaseUrl())
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${baseUrl}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readErrorCode(value: unknown): ApiErrorCode {
  return typeof value === 'string' && value.length > 0 ? value : 'UNKNOWN_ERROR'
}

function toApiErrorFromEnvelope(
  status: number,
  body: Record<string, unknown>,
): ApiError {
  const message =
    typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : 'Request failed.'

  return new ApiError({
    message,
    status,
    code: readErrorCode(body.code),
    errors: Array.isArray(body.errors) ? body.errors : [],
    path: typeof body.path === 'string' ? body.path : undefined,
    timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
  })
}

function toNetworkApiError(status: number, fallbackMessage: string): ApiError {
  return new ApiError({
    message: fallbackMessage,
    status,
    code: 'UNKNOWN_ERROR',
  })
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError({
      message: 'Received a malformed JSON response from the API.',
      status: response.status,
      code: 'UNKNOWN_ERROR',
    })
  }
}

async function executeFetch(
  path: string,
  options: InternalRequestOptions,
): Promise<Response> {
  const method: HttpMethod = options.method ?? 'GET'
  const headers = new Headers(options.headers)

  const useAuth = options.auth !== false
  if (useAuth) {
    const token = tokenStore.getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined && options.body !== null) {
    if (isFormData(options.body)) {
      // Let the browser set multipart Content-Type + boundary.
      body = options.body
      headers.delete('Content-Type')
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
      body = JSON.stringify(options.body)
    }
  }

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body,
    signal: options.signal,
  })
}

async function parseEnvelopeResponse<T>(
  response: Response,
): Promise<ApiRequestResult<T>> {
  if (response.status === 204) {
    return {
      data: undefined as T,
      meta: {},
      message: '',
    }
  }

  const parsed: unknown = await parseJsonBody(response)

  if (!isRecord(parsed)) {
    if (!response.ok) {
      throw toNetworkApiError(
        response.status,
        `Request failed with status ${response.status}.`,
      )
    }
    throw new ApiError({
      message: 'Unexpected API response shape.',
      status: response.status,
      code: 'UNKNOWN_ERROR',
    })
  }

  if (parsed.success === false || !response.ok) {
    throw toApiErrorFromEnvelope(response.status, parsed)
  }

  if (parsed.success !== true) {
    throw new ApiError({
      message: 'Unexpected API response shape.',
      status: response.status,
      code: 'UNKNOWN_ERROR',
    })
  }

  // Envelope `data` is trusted as T by the calling resource module's contract.
  return {
    data: parsed.data as T,
    meta: isRecord(parsed.meta) ? parsed.meta : {},
    message: typeof parsed.message === 'string' ? parsed.message : '',
  }
}

interface RefreshResponseData {
  accessToken: string
  refreshToken: string
}

function isAuthTokenPair(value: unknown): value is AuthTokenPair {
  if (!isRecord(value)) return false
  return (
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.length > 0
  )
}

async function performTokenRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) {
    return false
  }

  try {
    const response = await executeFetch('/auth/refresh', {
      method: 'POST',
      auth: false,
      skipAuthRefresh: true,
      body: { refreshToken },
    })

    const result = await parseEnvelopeResponse<RefreshResponseData>(response)
    if (!isAuthTokenPair(result.data)) {
      return false
    }

    tokenStore.setTokens({
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Single-flight refresh: concurrent 401s and AuthProvider bootstrap share one attempt.
 * Returns true when a new access token was stored in `tokenStore`.
 */
export async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = performTokenRefresh().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

function shouldAttemptRefresh(
  error: ApiError,
  options: InternalRequestOptions,
): boolean {
  if (options.skipAuthRefresh) return false
  if (options.auth === false) return false
  if (error.status !== 401) return false
  // Backend distinguishes expiry from invalidity — only expiry is refreshable.
  return error.code === AUTH_EXPIRED_TOKEN
}

async function requestWithResult<T>(
  path: string,
  options: InternalRequestOptions = {},
): Promise<ApiRequestResult<T>> {
  try {
    const response = await executeFetch(path, options)
    return await parseEnvelopeResponse<T>(response)
  } catch (error) {
    if (!(error instanceof ApiError)) {
      throw error
    }

    if (!shouldAttemptRefresh(error, options)) {
      throw error
    }

    const refreshed = await refreshSession()
    if (!refreshed) {
      tokenStore.clear()
      tokenStore.notifySessionInvalidated()
      throw error
    }

    const retryResponse = await executeFetch(path, {
      ...options,
      skipAuthRefresh: true,
    })
    return parseEnvelopeResponse<T>(retryResponse)
  }
}

/**
 * Typed HTTP request against the Tavla API.
 * Returns unwrapped `data` from the success envelope.
 * Throws `ApiError` on failure.
 */
export async function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> {
  const result = await requestWithResult<T>(path, options)
  return result.data
}

/**
 * Same as `apiRequest`, but also returns envelope `message` and `meta`
 * for callers that need them (rare — pagination lives in `data`).
 */
export async function apiRequestWithMeta<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<ApiRequestResult<T>> {
  return requestWithResult<T>(path, options)
}

/** Test-only: reset in-flight refresh mutex between cases. */
export function __resetApiClientForTests(): void {
  refreshInFlight = null
}

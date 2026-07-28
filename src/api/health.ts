import { getApiBaseUrl } from './client'

/** Non-envelope Terminus-style health payloads (not `{ success, data }`). */
export interface HealthCheckDto {
  status: string
  info?: Record<string, { status: string }>
  error?: Record<string, unknown>
  details?: Record<string, { status: string }>
}

async function fetchHealthPath<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const base = getApiBaseUrl().replace(/\/+$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const absolute = /^https?:\/\//i.test(base)
    ? url
    : `${typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1'}${url}`

  const response = await fetch(absolute, { method: 'GET', signal })
  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

export async function getHealth(signal?: AbortSignal): Promise<HealthCheckDto> {
  return fetchHealthPath<HealthCheckDto>('/health', signal)
}

export async function getLiveness(signal?: AbortSignal): Promise<unknown> {
  return fetchHealthPath('/health/liveness', signal)
}

export async function getReadiness(signal?: AbortSignal): Promise<unknown> {
  return fetchHealthPath('/health/readiness', signal)
}

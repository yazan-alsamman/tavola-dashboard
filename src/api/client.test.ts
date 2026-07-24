import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  __resetApiClientForTests,
  apiRequest,
  apiRequestWithMeta,
  createIdempotencyKey,
  getApiBaseUrl,
} from './client'
import { ApiError, isApiError } from './errors'
import { tokenStore } from './tokenStore'

const BASE = 'http://127.0.0.1:3999/api/v1'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  tokenStore.clear()
  __resetApiClientForTests()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  tokenStore.clear()
  __resetApiClientForTests()
})

describe('getApiBaseUrl', () => {
  it('returns the configured absolute base URL without a trailing slash', () => {
    expect(getApiBaseUrl()).toBe(BASE)
  })
})

describe('apiRequest success envelope', () => {
  it('unwraps data from a success envelope', async () => {
    server.use(
      http.get(`${BASE}/restaurants`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [{ id: 'r1' }], page: 1, limit: 20, total: 1 },
          meta: {},
        }),
      ),
    )

    const data = await apiRequest<{
      items: Array<{ id: string }>
      page: number
      limit: number
      total: number
    }>('/restaurants', { auth: false })

    expect(data.items).toEqual([{ id: 'r1' }])
    expect(data.total).toBe(1)
  })

  it('returns message and meta via apiRequestWithMeta', async () => {
    server.use(
      http.get(`${BASE}/restaurants/r1`, () =>
        HttpResponse.json({
          success: true,
          message: 'Restaurant fetched.',
          data: { id: 'r1' },
          meta: { source: 'cache' },
        }),
      ),
    )

    const result = await apiRequestWithMeta<{ id: string }>('/restaurants/r1', {
      auth: false,
    })

    expect(result.data).toEqual({ id: 'r1' })
    expect(result.message).toBe('Restaurant fetched.')
    expect(result.meta).toEqual({ source: 'cache' })
  })

  it('treats 204 No Content as undefined data', async () => {
    server.use(
      http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    )

    const data = await apiRequest<undefined>('/auth/logout', { method: 'POST' })
    expect(data).toBeUndefined()
  })
})

describe('apiRequest error mapping', () => {
  it('throws ApiError with backend code and validation errors', async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Validation failed.',
            code: 'VALIDATION_ERROR',
            errors: [{ field: 'email', message: 'Required' }],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/auth/login',
          },
          { status: 400 },
        ),
      ),
    )

    try {
      await apiRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: {},
      })
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(isApiError(error)).toBe(true)
      const apiError = error as ApiError
      expect(apiError.code).toBe('VALIDATION_ERROR')
      expect(apiError.status).toBe(400)
      expect(apiError.message).toBe('Validation failed.')
      expect(apiError.errors).toEqual([{ field: 'email', message: 'Required' }])
      expect(apiError.path).toBe('/api/v1/auth/login')
    }
  })

  it('maps malformed JSON to UNKNOWN_ERROR', async () => {
    server.use(
      http.get(`${BASE}/broken`, () =>
        new HttpResponse('{not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiRequest('/broken', { auth: false })).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      name: 'ApiError',
    })
  })

  it('maps unexpected non-envelope JSON to UNKNOWN_ERROR', async () => {
    server.use(
      http.get(`${BASE}/weird`, () => HttpResponse.json({ hello: 'world' })),
    )

    await expect(apiRequest('/weird', { auth: false })).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
    })
  })
})

describe('authorization header', () => {
  it('attaches Bearer access token when present', async () => {
    tokenStore.setAccessToken('access-abc')

    let authHeader: string | null = null
    server.use(
      http.get(`${BASE}/users/me`, ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { userId: 'u1' },
          meta: {},
        })
      }),
    )

    await apiRequest('/users/me')
    expect(authHeader).toBe('Bearer access-abc')
  })

  it('omits Authorization when auth: false', async () => {
    tokenStore.setAccessToken('access-abc')

    let authHeader: string | null = 'sentinel'
    server.use(
      http.post(`${BASE}/auth/login`, ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ok: true },
          meta: {},
        })
      }),
    )

    await apiRequest('/auth/login', { method: 'POST', auth: false, body: {} })
    expect(authHeader).toBeNull()
  })
})

describe('JSON and FormData bodies', () => {
  it('sends JSON with application/json Content-Type', async () => {
    let contentType: string | null = null
    let rawBody = ''

    server.use(
      http.patch(`${BASE}/users/me`, async ({ request }) => {
        contentType = request.headers.get('Content-Type')
        rawBody = await request.text()
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ok: true },
          meta: {},
        })
      }),
    )

    await apiRequest('/users/me', {
      method: 'PATCH',
      body: { firstName: 'Ada' },
    })

    expect(contentType).toContain('application/json')
    expect(JSON.parse(rawBody)).toEqual({ firstName: 'Ada' })
  })

  it('does not force application/json for FormData', async () => {
    let contentType: string | null = null

    server.use(
      http.post(`${BASE}/users/me/avatar`, ({ request }) => {
        contentType = request.headers.get('Content-Type')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { uploaded: true },
          meta: {},
        })
      }),
    )

    const form = new FormData()
    form.append('file', new Blob(['avatar'], { type: 'image/png' }), 'a.png')

    await apiRequest('/users/me/avatar', {
      method: 'POST',
      body: form,
    })

    expect(contentType).not.toContain('application/json')
    expect(
      contentType == null || /multipart\/form-data/i.test(contentType),
    ).toBe(true)
  })
})

describe('idempotency header', () => {
  it('attaches Idempotency-Key only when provided', async () => {
    let key: string | null = 'sentinel'
    server.use(
      http.post(`${BASE}/reservations`, ({ request }) => {
        key = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          success: true,
          message: 'Created',
          data: { id: 'res-1' },
          meta: {},
        })
      }),
    )

    const idempotencyKey = createIdempotencyKey()
    await apiRequest('/reservations', {
      method: 'POST',
      body: { partySize: 2 },
      idempotencyKey,
    })

    expect(key).toBe(idempotencyKey)
    expect(idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('does not attach Idempotency-Key by default', async () => {
    let key: string | null = 'sentinel'
    server.use(
      http.post(`${BASE}/restaurants`, ({ request }) => {
        key = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          success: true,
          message: 'Created',
          data: { id: 'r1' },
          meta: {},
        })
      }),
    )

    await apiRequest('/restaurants', { method: 'POST', body: { name: 'Naranj' } })
    expect(key).toBeNull()
  })
})

describe('refresh and retry', () => {
  it('refreshes once on AUTH_EXPIRED_TOKEN and retries the original request', async () => {
    tokenStore.setTokens({
      accessToken: 'expired-access',
      refreshToken: 'refresh-1',
    })

    let meCalls = 0
    let refreshCalls = 0
    const authHeaders: string[] = []

    server.use(
      http.get(`${BASE}/users/me`, ({ request }) => {
        meCalls += 1
        authHeaders.push(request.headers.get('Authorization') ?? '')
        if (meCalls === 1) {
          return HttpResponse.json(
            {
              success: false,
              message: 'Token expired.',
              code: 'AUTH_EXPIRED_TOKEN',
              errors: [],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/api/v1/users/me',
            },
            { status: 401 },
          )
        }
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { userId: 'u1' },
          meta: {},
        })
      }),
      http.post(`${BASE}/auth/refresh`, async ({ request }) => {
        refreshCalls += 1
        const body = (await request.json()) as { refreshToken?: string }
        expect(body.refreshToken).toBe('refresh-1')
        return HttpResponse.json({
          success: true,
          message: 'Refreshed',
          data: {
            accessToken: 'new-access',
            refreshToken: 'refresh-2',
          },
          meta: {},
        })
      }),
    )

    const data = await apiRequest<{ userId: string }>('/users/me')
    expect(data.userId).toBe('u1')
    expect(meCalls).toBe(2)
    expect(refreshCalls).toBe(1)
    expect(authHeaders[0]).toBe('Bearer expired-access')
    expect(authHeaders[1]).toBe('Bearer new-access')
    expect(tokenStore.getAccessToken()).toBe('new-access')
    expect(tokenStore.getRefreshToken()).toBe('refresh-2')
  })

  it('does not refresh on AUTH_INVALID_TOKEN', async () => {
    tokenStore.setTokens({
      accessToken: 'bad-access',
      refreshToken: 'refresh-1',
    })

    let refreshCalls = 0
    server.use(
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Invalid token.',
            code: 'AUTH_INVALID_TOKEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/users/me',
          },
          { status: 401 },
        ),
      ),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls += 1
        return HttpResponse.json({ success: true, message: 'nope', data: {}, meta: {} })
      }),
    )

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'AUTH_INVALID_TOKEN',
    })
    expect(refreshCalls).toBe(0)
  })

  it('clears tokens and notifies listeners when refresh fails', async () => {
    tokenStore.setTokens({
      accessToken: 'expired-access',
      refreshToken: 'refresh-1',
    })

    const onInvalidated = vi.fn()
    const unsubscribe = tokenStore.onSessionInvalidated(onInvalidated)

    server.use(
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Token expired.',
            code: 'AUTH_EXPIRED_TOKEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/users/me',
          },
          { status: 401 },
        ),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Invalid refresh token.',
            code: 'AUTH_INVALID_REFRESH_TOKEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/auth/refresh',
          },
          { status: 401 },
        ),
      ),
    )

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'AUTH_EXPIRED_TOKEN',
    })
    expect(tokenStore.getAccessToken()).toBeNull()
    expect(tokenStore.getRefreshToken()).toBeNull()
    expect(onInvalidated).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('shares a single refresh across concurrent expired requests (no refresh loop)', async () => {
    tokenStore.setTokens({
      accessToken: 'expired-access',
      refreshToken: 'refresh-1',
    })

    let refreshCalls = 0
    const meHits = new Map<string, number>()

    server.use(
      http.get(`${BASE}/users/me`, ({ request }) => {
        const auth = request.headers.get('Authorization') ?? ''
        meHits.set(auth, (meHits.get(auth) ?? 0) + 1)
        if (auth === 'Bearer expired-access') {
          return HttpResponse.json(
            {
              success: false,
              message: 'Token expired.',
              code: 'AUTH_EXPIRED_TOKEN',
              errors: [],
              timestamp: '2026-07-23T00:00:00.000Z',
              path: '/api/v1/users/me',
            },
            { status: 401 },
          )
        }
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { userId: 'u1' },
          meta: {},
        })
      }),
      http.post(`${BASE}/auth/refresh`, async () => {
        refreshCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        return HttpResponse.json({
          success: true,
          message: 'Refreshed',
          data: {
            accessToken: 'new-access',
            refreshToken: 'refresh-2',
          },
          meta: {},
        })
      }),
    )

    const [a, b, c] = await Promise.all([
      apiRequest<{ userId: string }>('/users/me'),
      apiRequest<{ userId: string }>('/users/me'),
      apiRequest<{ userId: string }>('/users/me'),
    ])

    expect(a.userId).toBe('u1')
    expect(b.userId).toBe('u1')
    expect(c.userId).toBe('u1')
    expect(refreshCalls).toBe(1)
    expect(meHits.get('Bearer expired-access')).toBe(3)
    expect(meHits.get('Bearer new-access')).toBe(3)
  })

  it('does not retry after a successful refresh if the retry still fails', async () => {
    tokenStore.setTokens({
      accessToken: 'expired-access',
      refreshToken: 'refresh-1',
    })

    let meCalls = 0
    let refreshCalls = 0

    server.use(
      http.get(`${BASE}/users/me`, () => {
        meCalls += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'Token expired.',
            code: 'AUTH_EXPIRED_TOKEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/users/me',
          },
          { status: 401 },
        )
      }),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls += 1
        return HttpResponse.json({
          success: true,
          message: 'Refreshed',
          data: {
            accessToken: 'new-access',
            refreshToken: 'refresh-2',
          },
          meta: {},
        })
      }),
    )

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'AUTH_EXPIRED_TOKEN',
    })
    expect(meCalls).toBe(2)
    expect(refreshCalls).toBe(1)
  })
})

describe('tokenStore storage rules', () => {
  it('keeps the access token in memory only', () => {
    tokenStore.setAccessToken('mem-only')
    expect(sessionStorage.getItem('tavla-refresh-token')).toBeNull()
    expect(localStorage.getItem('tavla-refresh-token')).toBeNull()
    expect(tokenStore.getAccessToken()).toBe('mem-only')
  })

  it('persists the refresh token in sessionStorage only', () => {
    tokenStore.setRefreshToken('refresh-only')
    expect(sessionStorage.getItem('tavla-refresh-token')).toBe('refresh-only')
    expect(localStorage.getItem('tavla-refresh-token')).toBeNull()
  })
})

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, logout, logoutAll } from './auth'
import { getCurrentUser } from './users'
import { __resetApiClientForTests } from './client'
import { ApiError } from './errors'
import { tokenStore } from './tokenStore'

const BASE = 'http://127.0.0.1:3999/api/v1'

const loginData = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: '2026-07-23T12:15:00.000Z',
  refreshTokenExpiresAt: '2026-08-22T12:00:00.000Z',
  user: {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'owner@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    status: 'Active' as const,
    emailVerified: true,
  },
  organization: {
    organizationId: '22222222-2222-2222-2222-222222222222',
    name: 'Naranj Org',
    slug: 'naranj',
    role: 'Owner',
  },
  sessionId: '33333333-3333-3333-3333-333333333333',
  sessionVersion: 1,
  permissionsVersion: 1,
  actorType: 'OrganizationMember' as const,
  requiresPasswordChange: false,
}

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  tokenStore.clear()
  __resetApiClientForTests()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  tokenStore.clear()
  __resetApiClientForTests()
})

describe('auth API', () => {
  it('logs in and returns typed login data', async () => {
    let body: unknown
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: loginData,
          meta: {},
        })
      }),
    )

    const data = await login({
      email: 'owner@example.com',
      password: 'SecurePass123!',
    })

    expect(body).toEqual({
      email: 'owner@example.com',
      password: 'SecurePass123!',
      deviceName: 'Tavola Dashboard',
      deviceType: 'web',
    })
    expect(data.accessToken).toBe('access-token')
    expect(data.user.email).toBe('owner@example.com')
    expect(data.organization?.role).toBe('Owner')
    expect(data.actorType).toBe('OrganizationMember')
  })

  it('maps login failure to ApiError with backend code', async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Invalid email or password.',
            code: 'AUTH_INVALID_CREDENTIALS',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/auth/login',
          },
          { status: 401 },
        ),
      ),
    )

    await expect(
      login({ email: 'bad@example.com', password: 'nope' }),
    ).rejects.toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
    })
  })

  it('calls logout with bearer token and accepts 204', async () => {
    tokenStore.setAccessToken('access-token')
    let auth: string | null = null

    server.use(
      http.post(`${BASE}/auth/logout`, ({ request }) => {
        auth = request.headers.get('Authorization')
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await logout()
    expect(auth).toBe('Bearer access-token')
  })

  it('calls logout-all with bearer token', async () => {
    tokenStore.setAccessToken('access-token')
    let hit = false

    server.use(
      http.post(`${BASE}/auth/logout-all`, () => {
        hit = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await logoutAll()
    expect(hit).toBe(true)
  })
})

describe('users API', () => {
  it('returns typed /users/me profile', async () => {
    tokenStore.setAccessToken('access-token')
    server.use(
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            userId: '11111111-1111-1111-1111-111111111111',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'owner@example.com',
            phone: null,
            language: 'en',
            preferredCurrency: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
          meta: {},
        }),
      ),
    )

    const profile = await getCurrentUser()
    expect(profile.userId).toBe('11111111-1111-1111-1111-111111111111')
    expect(profile.language).toBe('en')
    expect(profile.phone).toBeNull()
  })

  it('throws ApiError on malformed profile envelope', async () => {
    tokenStore.setAccessToken('access-token')
    server.use(
      http.get(`${BASE}/users/me`, () => HttpResponse.json({ hello: 'nope' })),
    )

    await expect(getCurrentUser()).rejects.toBeInstanceOf(ApiError)
  })
})

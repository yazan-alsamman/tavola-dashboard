/** @vitest-environment happy-dom */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ProtectedRoute, PublicRoute } from '@/components/auth/ProtectedRoute'
import { LocaleProvider } from '@/context/LocaleContext'
import { __resetApiClientForTests } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'

const BASE = 'http://127.0.0.1:3999/api/v1'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

const accessToken = makeJwt({
  sub: '11111111-1111-1111-1111-111111111111',
  actorType: 'OrganizationMember',
  organizationId: '22222222-2222-2222-2222-222222222222',
  orgRole: 'Owner',
  permissionsVersion: 1,
  sessionId: '33333333-3333-3333-3333-333333333333',
})

const loginData = {
  accessToken,
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: '2026-07-23T12:15:00.000Z',
  refreshTokenExpiresAt: '2026-08-22T12:00:00.000Z',
  user: {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'owner@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    status: 'Active',
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
  actorType: 'OrganizationMember',
  requiresPasswordChange: false,
}

const meData = {
  userId: '11111111-1111-1111-1111-111111111111',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'owner@example.com',
  phone: null,
  language: 'en',
  preferredCurrency: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

const refreshSuccess = {
  success: true,
  message: 'OK',
  data: {
    accessToken,
    refreshToken: 'refresh-token-2',
    tokenType: 'Bearer',
    accessTokenExpiresAt: '2026-07-23T12:15:00.000Z',
    refreshTokenExpiresAt: '2026-08-22T12:00:00.000Z',
    sessionId: '33333333-3333-3333-3333-333333333333',
    sessionVersion: 1,
    permissionsVersion: 1,
    actorType: 'OrganizationMember',
    issuedAt: '2026-07-23T12:00:00.000Z',
    serverTime: '2026-07-23T12:00:00.000Z',
  },
  meta: {},
}

const server = setupServer()

function Probe() {
  const { user, isAuthenticated, isLoading } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="name">{user?.displayName ?? ''}</span>
      <span data-testid="role">{user?.organization?.role ?? ''}</span>
    </div>
  )
}

function LoginProbe() {
  const { login, logout, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <button
        type="button"
        onClick={() => {
          void login('owner@example.com', 'SecurePass123!').catch(() => undefined)
        }}
      >
        do-login
      </button>
      <button
        type="button"
        onClick={() => {
          void logout()
        }}
      >
        do-logout
      </button>
    </div>
  )
}

function renderWithProviders(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  )
}

function useLoginHandlers(): void {
  server.use(
    http.post(`${BASE}/auth/login`, () =>
      HttpResponse.json({
        success: true,
        message: 'OK',
        data: loginData,
        meta: {},
      }),
    ),
    http.get(`${BASE}/users/me`, () =>
      HttpResponse.json({
        success: true,
        message: 'OK',
        data: meData,
        meta: {},
      }),
    ),
  )
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  tokenStore.clear()
  __resetApiClientForTests()
  sessionStorage.clear()
  localStorage.clear()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  tokenStore.clear()
  __resetApiClientForTests()
  sessionStorage.clear()
  localStorage.clear()
})

describe('AuthProvider bootstrap', () => {
  it('starts loading then resolves unauthenticated when no refresh token', async () => {
    renderWithProviders(<Probe />)

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('authed').textContent).toBe('false')
  })

  it('restores a session when refresh token is valid', async () => {
    tokenStore.setRefreshToken('refresh-token')

    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json(refreshSuccess)),
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: meData,
          meta: {},
        }),
      ),
    )

    renderWithProviders(<Probe />)

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('true')
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('name').textContent).toBe('Ada Lovelace')
    expect(screen.getByTestId('role').textContent).toBe('Owner')
    expect(tokenStore.getAccessToken()).toBe(accessToken)
    expect(localStorage.getItem('tavla-refresh-token')).toBe('refresh-token-2')
    expect(sessionStorage.getItem('tavla-refresh-token')).toBeNull()
    expect(sessionStorage.getItem('tavla-user')).toBeNull()
  })

  it('clears state when restoration fails', async () => {
    tokenStore.setRefreshToken('bad-refresh')

    server.use(
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

    renderWithProviders(<Probe />)

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })
    expect(tokenStore.getRefreshToken()).toBeNull()
  })
})

describe('AuthProvider login/logout', () => {
  it('authenticates on successful login and stores tokens correctly', async () => {
    useLoginHandlers()
    renderWithProviders(<LoginProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })

    await act(async () => {
      screen.getByText('do-login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('true')
    })
    expect(tokenStore.getAccessToken()).toBe(accessToken)
    expect(localStorage.getItem('tavla-refresh-token')).toBe('refresh-token')
    expect(sessionStorage.getItem('tavla-refresh-token')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('tavla-user')).toBeNull()
  })

  it('does not authenticate on failed login', async () => {
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

    renderWithProviders(<LoginProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })

    await act(async () => {
      screen.getByText('do-login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })
    expect(tokenStore.getAccessToken()).toBeNull()
  })

  it('clears local state even when logout network call fails', async () => {
    useLoginHandlers()
    server.use(
      http.post(`${BASE}/auth/logout`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Unavailable',
            code: 'UNKNOWN_ERROR',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/auth/logout',
          },
          { status: 500 },
        ),
      ),
    )

    renderWithProviders(<LoginProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })

    await act(async () => {
      screen.getByText('do-login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('true')
    })

    await act(async () => {
      screen.getByText('do-logout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })
    expect(tokenStore.getAccessToken()).toBeNull()
    expect(tokenStore.getRefreshToken()).toBeNull()
  })

  it('clears authenticated state on session-invalidated events', async () => {
    useLoginHandlers()
    renderWithProviders(<LoginProbe />)

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })

    await act(async () => {
      screen.getByText('do-login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('true')
    })

    act(() => {
      tokenStore.clear()
      tokenStore.notifySessionInvalidated()
    })

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
    })
  })
})

describe('route guards', () => {
  it('ProtectedRoute waits while auth is resolving then redirects when unauthenticated', async () => {
    render(
      <LocaleProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/app']}>
            <Routes>
              <Route path="/login" element={<div>login-page</div>} />
              <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<div>private-page</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </LocaleProvider>,
    )

    expect(screen.queryByText('private-page')).toBeNull()
    await waitFor(() => {
      expect(screen.getByText('login-page')).toBeTruthy()
    })
  })

  it('PublicRoute shows session-resolving UI while bootstrap is in progress', async () => {
    tokenStore.setRefreshToken('refresh-token')

    let release!: (value: ReturnType<typeof HttpResponse.json>) => void
    const gate = new Promise<ReturnType<typeof HttpResponse.json>>((resolve) => {
      release = resolve
    })

    server.use(
      http.post(`${BASE}/auth/refresh`, async () => gate),
      http.get(`${BASE}/users/me`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: meData,
          meta: {},
        }),
      ),
    )

    render(
      <LocaleProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<div>login-page</div>} />
              </Route>
              <Route path="/app" element={<div>home-page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </LocaleProvider>,
    )

    expect(screen.queryByText('login-page')).toBeNull()
    expect(screen.queryByText('home-page')).toBeNull()
    expect(
      screen.getByText(/Restoring your session|جارٍ استعادة جلستك/),
    ).toBeTruthy()

    await act(async () => {
      release(HttpResponse.json(refreshSuccess))
    })

    await waitFor(() => {
      expect(screen.getByText('home-page')).toBeTruthy()
    })
  })
})

/** @vitest-environment happy-dom */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import {
  RestaurantScopeProvider,
  useRestaurantScope,
} from '@/context/RestaurantScopeContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { __resetApiClientForTests } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'
import {
  SCOPE_BRANCH_STORAGE_KEY,
  SCOPE_RESTAURANT_STORAGE_KEY,
} from '@/lib/scopePersistence'

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

const restaurantA = {
  restaurantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Restaurant A',
  slug: 'a',
  logoId: null,
  coverImageId: null,
  description: null,
  cuisineType: null,
  averageRating: null,
  priceLevel: null,
  status: 'Active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const restaurantB = {
  ...restaurantA,
  restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Restaurant B',
  slug: 'b',
}

const branchA1 = {
  branchId: '11111111-1111-1111-1111-111111111111',
  restaurantId: restaurantA.restaurantId,
  city: 'Damascus',
  district: 'Old City',
  address: 'Street 1',
  latitude: null,
  longitude: null,
  countryCode: 'SY',
  currency: 'SYP',
  timezone: 'Asia/Damascus',
  phone: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const branchA2 = {
  ...branchA1,
  branchId: '22222222-2222-2222-2222-222222222222',
  district: 'Malki',
}

const branchB1 = {
  ...branchA1,
  branchId: '33333333-3333-3333-3333-333333333333',
  restaurantId: restaurantB.restaurantId,
  district: 'Abu Rummaneh',
}

const accessToken = makeJwt({
  sub: 'user-1',
  actorType: 'OrganizationMember',
  organizationId: 'org-1',
  orgRole: 'Owner',
})

const loginData = {
  accessToken,
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: '2026-07-23T12:15:00.000Z',
  refreshTokenExpiresAt: '2026-08-22T12:00:00.000Z',
  user: {
    userId: 'user-1',
    email: 'owner@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    status: 'Active',
    emailVerified: true,
  },
  organization: {
    organizationId: 'org-1',
    name: 'Org',
    slug: 'org',
    role: 'Owner',
  },
  sessionId: 'sess-1',
  sessionVersion: 1,
  permissionsVersion: 1,
  actorType: 'OrganizationMember',
  requiresPasswordChange: false,
}

const meData = {
  userId: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'owner@example.com',
  phone: null,
  language: 'en',
  preferredCurrency: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const server = setupServer()

function ScopeProbe() {
  const {
    status,
    selectedRestaurant,
    selectedBranch,
    restaurants,
    branches,
    selectRestaurant,
    selectBranch,
  } = useRestaurantScope()

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="restaurant">{selectedRestaurant?.name ?? ''}</span>
      <span data-testid="branch">{selectedBranch ? `${selectedBranch.city}-${selectedBranch.district}` : ''}</span>
      <span data-testid="restaurant-count">{restaurants.length}</span>
      <span data-testid="branch-count">{branches.length}</span>
      <button type="button" onClick={() => selectRestaurant(restaurantB.restaurantId)}>
        select-b
      </button>
      <button type="button" onClick={() => selectBranch(branchA2.branchId)}>
        select-a2
      </button>
    </div>
  )
}

function LoginButton() {
  const { login, logout, isAuthenticated } = useAuth()
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <button
        type="button"
        onClick={() => {
          void login('owner@example.com', 'pass').catch(() => undefined)
        }}
      >
        login
      </button>
      <button
        type="button"
        onClick={() => {
          void logout()
        }}
      >
        logout
      </button>
    </div>
  )
}

function renderApp(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <AuthProvider>
        <RestaurantScopeProvider>
          <MemoryRouter>
            <LoginButton />
            {ui}
          </MemoryRouter>
        </RestaurantScopeProvider>
      </AuthProvider>
    </LocaleProvider>,
  )
}

function useAuthHandlers(): void {
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
    http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  )
}

function useHappyPathScopeHandlers(): void {
  server.use(
    http.get(`${BASE}/restaurants`, () =>
      HttpResponse.json({
        success: true,
        message: 'OK',
        data: { items: [restaurantA, restaurantB], page: 1, limit: 100, total: 2 },
        meta: {},
      }),
    ),
    http.get(`${BASE}/restaurants/:restaurantId/branches`, ({ params }) => {
      const restaurantId = String(params.restaurantId)
      const items =
        restaurantId === restaurantA.restaurantId
          ? [branchA1, branchA2]
          : [branchB1]
      return HttpResponse.json({
        success: true,
        message: 'OK',
        data: { items, page: 1, limit: 100, total: items.length },
        meta: {},
      })
    }),
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
  localStorage.clear()
  sessionStorage.clear()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  tokenStore.clear()
  __resetApiClientForTests()
  localStorage.clear()
  sessionStorage.clear()
})

describe('RestaurantScopeProvider', () => {
  it('loads restaurants and selects a deterministic restaurant/branch after login', async () => {
    useAuthHandlers()
    useHappyPathScopeHandlers()
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready')
    })
    expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant A')
    expect(screen.getByTestId('branch').textContent).toBe('Damascus-Old City')
    expect(localStorage.getItem(SCOPE_RESTAURANT_STORAGE_KEY)).toBe(restaurantA.restaurantId)
    expect(localStorage.getItem(SCOPE_BRANCH_STORAGE_KEY)).toBe(branchA1.branchId)
  })

  it('restores a persisted valid restaurant/branch selection', async () => {
    localStorage.setItem(SCOPE_RESTAURANT_STORAGE_KEY, restaurantB.restaurantId)
    localStorage.setItem(SCOPE_BRANCH_STORAGE_KEY, branchB1.branchId)
    useAuthHandlers()
    useHappyPathScopeHandlers()
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant B')
      expect(screen.getByTestId('branch').textContent).toBe('Damascus-Abu Rummaneh')
    })
  })

  it('rejects a stale persisted restaurant id', async () => {
    localStorage.setItem(SCOPE_RESTAURANT_STORAGE_KEY, 'stale-restaurant')
    localStorage.setItem(SCOPE_BRANCH_STORAGE_KEY, 'stale-branch')
    useAuthHandlers()
    useHappyPathScopeHandlers()
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant A')
    })
    expect(localStorage.getItem(SCOPE_RESTAURANT_STORAGE_KEY)).toBe(restaurantA.restaurantId)
  })

  it('reloads branches when the restaurant changes and never keeps a foreign branch', async () => {
    useAuthHandlers()
    useHappyPathScopeHandlers()
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready')
    })

    await act(async () => {
      screen.getByText('select-b').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant B')
      expect(screen.getByTestId('branch').textContent).toBe('Damascus-Abu Rummaneh')
      expect(screen.getByTestId('branch-count').textContent).toBe('1')
    })
  })

  it('handles zero restaurants', async () => {
    useAuthHandlers()
    server.use(
      http.get(`${BASE}/restaurants`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [], page: 1, limit: 100, total: 0 },
          meta: {},
        }),
      ),
    )
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('empty_restaurants')
    })
  })

  it('handles zero branches for the selected restaurant', async () => {
    useAuthHandlers()
    server.use(
      http.get(`${BASE}/restaurants`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [restaurantA], page: 1, limit: 100, total: 1 },
          meta: {},
        }),
      ),
      http.get(`${BASE}/restaurants/:restaurantId/branches`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [], page: 1, limit: 100, total: 0 },
          meta: {},
        }),
      ),
    )
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('empty_branches')
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant A')
      expect(screen.getByTestId('branch').textContent).toBe('')
    })
  })

  it('uses an authenticated restaurant hint when persisted id is absent', async () => {
    const hintedAccess = makeJwt({
      sub: 'user-1',
      actorType: 'OrganizationMember',
      organizationId: 'org-1',
      orgRole: 'Owner',
      restaurantId: restaurantB.restaurantId,
    })
    useAuthHandlers()
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { ...loginData, accessToken: hintedAccess },
          meta: {},
        }),
      ),
    )
    useHappyPathScopeHandlers()
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant B')
      expect(screen.getByTestId('branch').textContent).toBe('Damascus-Abu Rummaneh')
    })
  })

  it('handles forbidden restaurant list', async () => {
    useAuthHandlers()
    server.use(
      http.get(`${BASE}/restaurants`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Forbidden',
            code: 'FORBIDDEN',
            errors: [],
            timestamp: '2026-07-23T00:00:00.000Z',
            path: '/api/v1/restaurants',
          },
          { status: 403 },
        ),
      ),
    )
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('forbidden')
    })
  })

  it('clears scope on logout and removes persisted ids', async () => {
    useAuthHandlers()
    useHappyPathScopeHandlers()
    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready')
    })

    await act(async () => {
      screen.getByText('logout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('authed').textContent).toBe('false')
      expect(screen.getByTestId('status').textContent).toBe('idle')
    })
    expect(localStorage.getItem(SCOPE_RESTAURANT_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(SCOPE_BRANCH_STORAGE_KEY)).toBeNull()
  })

  it('ignores a stale branch response after a newer restaurant selection', async () => {
    useAuthHandlers()

    let releaseA!: (value: ReturnType<typeof HttpResponse.json>) => void
    const gateA = new Promise<ReturnType<typeof HttpResponse.json>>((resolve) => {
      releaseA = resolve
    })

    server.use(
      http.get(`${BASE}/restaurants`, () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [restaurantA, restaurantB], page: 1, limit: 100, total: 2 },
          meta: {},
        }),
      ),
      http.get(`${BASE}/restaurants/:restaurantId/branches`, async ({ params }) => {
        const restaurantId = String(params.restaurantId)
        if (restaurantId === restaurantA.restaurantId) {
          return gateA
        }
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [branchB1], page: 1, limit: 100, total: 1 },
          meta: {},
        })
      }),
    )

    renderApp(<ScopeProbe />)

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant-count').textContent).toBe('2')
    })

    await act(async () => {
      screen.getByText('select-b').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant B')
      expect(screen.getByTestId('branch').textContent).toBe('Damascus-Abu Rummaneh')
    })

    await act(async () => {
      releaseA(
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [branchA1, branchA2], page: 1, limit: 100, total: 2 },
          meta: {},
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('restaurant').textContent).toBe('Restaurant B')
      expect(screen.getByTestId('branch').textContent).toBe('Damascus-Abu Rummaneh')
      expect(screen.getByTestId('branch-count').textContent).toBe('1')
    })
  })
})

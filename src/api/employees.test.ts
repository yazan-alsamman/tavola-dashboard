import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { __resetApiClientForTests } from './client'
import { tokenStore } from './tokenStore'
import { isApiError } from './errors'
import { inviteEmployeeForBranch, type EmployeeDto } from './employees'

const BASE = 'http://127.0.0.1:3999/api/v1'
const server = setupServer()

const restaurantId = 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr'
const branchId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const roleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const employeeId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

function employee(overrides: Partial<EmployeeDto> = {}): EmployeeDto {
  return {
    employeeId,
    restaurantId,
    roleId,
    firstName: 'Hana',
    lastName: 'Nasser',
    email: 'hana@example.com',
    phone: null,
    status: 'Invited',
    assignedBranchIds: [],
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    ...overrides,
  }
}

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
  tokenStore.setAccessToken('access-token')
  __resetApiClientForTests()
})

describe('inviteEmployeeForBranch', () => {
  it('invites the employee and then assigns the selected branch', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${BASE}/restaurants/${restaurantId}/employees`, async ({ request }) => {
        calls.push('invite')
        const body = (await request.json()) as { roleId: string; email: string }
        expect(body.roleId).toBe(roleId)
        expect(body.email).toBe('hana@example.com')
        return HttpResponse.json(
          { success: true, message: 'Employee invited', data: employee(), meta: {} },
          { status: 201 },
        )
      }),
      http.post(
        `${BASE}/restaurants/${restaurantId}/employees/${employeeId}/branches`,
        async ({ request }) => {
          calls.push('assign')
          const body = (await request.json()) as { branchId: string }
          expect(body.branchId).toBe(branchId)
          return HttpResponse.json({
            success: true,
            message: 'Assigned',
            data: employee({ assignedBranchIds: [branchId] }),
            meta: {},
          })
        },
      ),
    )

    const result = await inviteEmployeeForBranch(restaurantId, {
      roleId,
      firstName: 'Hana',
      lastName: 'Nasser',
      email: 'hana@example.com',
      branchId,
    })

    expect(calls).toEqual(['invite', 'assign'])
    expect(result.branchAssigned).toBe(true)
    expect(result.employee.assignedBranchIds).toEqual([branchId])
  })

  it('keeps the invited employee when branch assignment is forbidden', async () => {
    server.use(
      http.post(`${BASE}/restaurants/${restaurantId}/employees`, () =>
        HttpResponse.json(
          { success: true, message: 'Employee invited', data: employee(), meta: {} },
          { status: 201 },
        ),
      ),
      http.post(`${BASE}/restaurants/${restaurantId}/employees/${employeeId}/branches`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Forbidden',
            code: 'FORBIDDEN',
            errors: [],
            timestamp: '2026-09-28T00:00:00.000Z',
            path: `/api/v1/restaurants/${restaurantId}/employees/${employeeId}/branches`,
          },
          { status: 403 },
        ),
      ),
    )

    const result = await inviteEmployeeForBranch(restaurantId, {
      roleId,
      firstName: 'Hana',
      lastName: 'Nasser',
      email: 'hana@example.com',
      branchId,
    })

    expect(result.branchAssigned).toBe(false)
    if (!result.branchAssigned) {
      expect(isApiError(result.error)).toBe(true)
      expect(result.employee.employeeId).toBe(employeeId)
      expect(result.employee.assignedBranchIds).toEqual([])
    }
  })
})

import { describe, expect, it } from 'vitest'
import { parseAccessTokenClaims } from './accessTokenClaims'

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

describe('parseAccessTokenClaims', () => {
  it('extracts employee operational claims', () => {
    const token = makeJwt({
      sub: 'user-1',
      actorType: 'Employee',
      employeeId: 'emp-1',
      organizationId: 'org-1',
      restaurantId: 'rest-1',
      branchIds: ['b1', 'b2'],
      permissions: ['tables:manage', 'reservations:approve'],
      permissionsVersion: 3,
      sessionId: 'sess-1',
      sessionVersion: 1,
    })

    const claims = parseAccessTokenClaims(token)
    expect(claims).toMatchObject({
      sub: 'user-1',
      actorType: 'Employee',
      employeeId: 'emp-1',
      restaurantId: 'rest-1',
      branchIds: ['b1', 'b2'],
      permissions: ['tables:manage', 'reservations:approve'],
      orgRole: null,
    })
  })

  it('extracts organization member orgRole', () => {
    const token = makeJwt({
      sub: 'user-2',
      actorType: 'OrganizationMember',
      organizationId: 'org-1',
      orgRole: 'Owner',
      permissionsVersion: 1,
    })

    const claims = parseAccessTokenClaims(token)
    expect(claims?.orgRole).toBe('Owner')
    expect(claims?.permissions).toEqual([])
  })

  it('returns null for malformed tokens', () => {
    expect(parseAccessTokenClaims('not-a-jwt')).toBeNull()
  })
})

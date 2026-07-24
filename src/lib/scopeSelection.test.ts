import { describe, expect, it } from 'vitest'
import { selectBranchId, selectRestaurantId } from './scopeSelection'
import type { BranchDto } from '@/api/branches'
import type { RestaurantDto } from '@/api/restaurants'

function restaurant(
  restaurantId: string,
  status: 'Active' | 'Suspended' = 'Active',
): RestaurantDto {
  return {
    restaurantId,
    name: restaurantId,
    slug: restaurantId,
    logoId: null,
    coverImageId: null,
    description: null,
    cuisineType: null,
    averageRating: null,
    priceLevel: null,
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function branch(branchId: string, restaurantId: string): BranchDto {
  return {
    branchId,
    restaurantId,
    city: 'Damascus',
    district: null,
    address: 'Street',
    latitude: null,
    longitude: null,
    countryCode: 'SY',
    currency: 'SYP',
    timezone: 'Asia/Damascus',
    phone: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('selectRestaurantId', () => {
  it('returns null for an empty list', () => {
    expect(selectRestaurantId([], 'x', 'y')).toBeNull()
  })

  it('prefers a persisted id when accessible', () => {
    const list = [restaurant('r1'), restaurant('r2')]
    expect(selectRestaurantId(list, 'r2', 'r1')).toBe('r2')
  })

  it('rejects a stale persisted id and uses the auth hint when valid', () => {
    const list = [restaurant('r1'), restaurant('r2')]
    expect(selectRestaurantId(list, 'stale', 'r2')).toBe('r2')
  })

  it('falls back to the first Active restaurant', () => {
    const list = [restaurant('r1', 'Suspended'), restaurant('r2', 'Active')]
    expect(selectRestaurantId(list, null, null)).toBe('r2')
  })

  it('falls back to the first restaurant when none are Active', () => {
    const list = [restaurant('r1', 'Suspended'), restaurant('r2', 'Suspended')]
    expect(selectRestaurantId(list, null, null)).toBe('r1')
  })
})

describe('selectBranchId', () => {
  it('returns null for an empty list', () => {
    expect(selectBranchId([], 'x', ['y'])).toBeNull()
  })

  it('prefers a persisted id when accessible', () => {
    const list = [branch('b1', 'r1'), branch('b2', 'r1')]
    expect(selectBranchId(list, 'b2', ['b1'])).toBe('b2')
  })

  it('rejects a stale persisted id and uses the first auth hint in the list', () => {
    const list = [branch('b1', 'r1'), branch('b2', 'r1')]
    expect(selectBranchId(list, 'stale', ['missing', 'b2'])).toBe('b2')
  })

  it('falls back to the first branch', () => {
    const list = [branch('b1', 'r1'), branch('b2', 'r1')]
    expect(selectBranchId(list, null, [])).toBe('b1')
  })
})

import { describe, expect, it } from 'vitest'
import { computeSetupProgress, type SetupFacts } from './setupProgress'

const empty: SetupFacts = {
  hasArabicName: false,
  hasEnglishName: false,
  hasDescription: false,
  hasCuisine: false,
  branchCount: 0,
  hasHours: false,
  hasVenueType: false,
  tableCount: 0,
  menuCount: 0,
  hasPhotos: false,
  employeeCount: 0,
}

describe('computeSetupProgress', () => {
  it('starts at the profile step with nothing done', () => {
    const progress = computeSetupProgress(empty)
    expect(progress.percent).toBe(0)
    expect(progress.next).toBe('profile')
  })

  it('needs both names and a description for the profile step', () => {
    const progress = computeSetupProgress({ ...empty, hasArabicName: true, hasDescription: true })
    expect(progress.done.profile).toBe(false)
  })

  it('points at the first missing step and rounds the percentage', () => {
    const progress = computeSetupProgress({
      ...empty,
      hasArabicName: true,
      hasEnglishName: true,
      hasDescription: true,
      hasCuisine: true,
      branchCount: 1,
    })
    expect(progress.completed).toBe(3)
    expect(progress.percent).toBe(33)
    expect(progress.next).toBe('hours')
  })

  it('reports no next step when everything is done', () => {
    const progress = computeSetupProgress({
      hasArabicName: true,
      hasEnglishName: true,
      hasDescription: true,
      hasCuisine: true,
      branchCount: 2,
      hasHours: true,
      hasVenueType: true,
      tableCount: 6,
      menuCount: 1,
      hasPhotos: true,
      employeeCount: 3,
    })
    expect(progress.percent).toBe(100)
    expect(progress.next).toBeNull()
  })
})

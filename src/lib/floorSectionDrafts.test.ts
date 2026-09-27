import { beforeEach, describe, expect, it } from 'vitest'
import { readSectionDrafts, writeSectionDrafts } from '@/lib/floorSectionDrafts'

describe('floor section drafts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps a drawn outline after the tables are gone', () => {
    const box = { x: 16, y: 32, width: 200, height: 120 }
    writeSectionDrafts('r', 'b', 'plan', { 'area-1': box })
    expect(readSectionDrafts('r', 'b', 'plan')).toEqual({ 'area-1': box })
    expect(readSectionDrafts('r', 'b', 'other')).toEqual({})
  })
})
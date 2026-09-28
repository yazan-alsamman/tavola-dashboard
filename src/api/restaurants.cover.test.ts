import { describe, expect, it } from 'vitest'
import { normalizeRestaurantCover } from './restaurants'

describe('normalizeRestaurantCover', () => {
  it('keeps a signed cover URL only when a cover id is present', () => {
    expect(
      normalizeRestaurantCover({
        coverImageId: 'aa6da0ad-e204-4fc8-b4a4-90dc957d729d',
        coverImageUrl: 'https://media.example/cover.jpg?X-Amz-Signature=1',
      }),
    ).toEqual({
      coverImageId: 'aa6da0ad-e204-4fc8-b4a4-90dc957d729d',
      coverImageUrl: 'https://media.example/cover.jpg?X-Amz-Signature=1',
    })
    expect(
      normalizeRestaurantCover({
        coverImageId: null,
        coverImageUrl: 'https://media.example/cover.jpg',
      }),
    ).toEqual({ coverImageId: null, coverImageUrl: null })
    expect(
      normalizeRestaurantCover({
        coverImageId: 'aa6da0ad-e204-4fc8-b4a4-90dc957d729d',
        coverImageUrl: 'restaurants/cover.jpg',
      }).coverImageUrl,
    ).toBeNull()
  })
})

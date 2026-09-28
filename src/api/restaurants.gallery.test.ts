import { describe, expect, it } from 'vitest'
import { normalizeGalleryItem, normalizeGalleryList } from './restaurants'

describe('normalizeGalleryList', () => {
  it('reads items and the signed image URL from the gallery envelope', () => {
    const items = normalizeGalleryList({
      restaurantId: 'rest-1',
      items: [
        {
          galleryItemId: 'b',
          restaurantId: 'rest-1',
          caption: null,
          sortOrder: 2,
          imageUrl: 'https://media.example/b.jpg?X-Amz-Signature=1',
          createdAt: '2026-09-27T00:00:00.000Z',
          updatedAt: '2026-09-27T00:00:00.000Z',
        },
        {
          galleryItemId: 'a',
          sortOrder: 0,
          imageUrl: 'https://media.example/a.jpg?X-Amz-Signature=1',
        },
      ],
    })

    expect(items.map((item) => item.galleryItemId)).toEqual(['a', 'b'])
    expect(items[0]?.imageUrl).toBe('https://media.example/a.jpg?X-Amz-Signature=1')
    expect(normalizeGalleryItem({ imageUrl: 'https://media.example/x.jpg' })).toBeNull()
    expect(normalizeGalleryList([])).toEqual([])
  })
})

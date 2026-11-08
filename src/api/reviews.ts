import { apiRequest } from './client'
import type { PaginatedData } from './types'

export interface ReviewImageDto {
  reviewImageId?: string
  imageId?: string
  id?: string
  url?: string | null
  imageUrl?: string | null
  [key: string]: unknown
}

export interface ReviewDto {
  reviewId?: string
  id?: string
  restaurantId?: string
  rating?: number
  comment?: string | null
  reviewerUsername?: string | null
  /**
   * The restaurant's reply text. The API sends `reply` as an object
   * `{ comment, createdAt }`; {@link normalizeReview} flattens it here so the
   * UI never renders an object (which crashes React).
   */
  reply?: string | null
  replyCreatedAt?: string | null
  images?: ReviewImageDto[]
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

/** Flattens the API's `reply: { comment, createdAt } | null` into display fields. */
export function normalizeReview(raw: ReviewDto): ReviewDto {
  const reply: unknown = raw.reply
  if (reply && typeof reply === 'object') {
    const record = reply as { comment?: unknown; createdAt?: unknown }
    return {
      ...raw,
      reply: typeof record.comment === 'string' ? record.comment : null,
      replyCreatedAt: typeof record.createdAt === 'string' ? record.createdAt : null,
    }
  }
  return { ...raw, reply: typeof reply === 'string' ? reply : null }
}

export interface ListRestaurantReviewsParams {
  page?: number
  /** Preferred query name on live API (`limit`). `pageSize` is accepted as an alias. */
  pageSize?: number
  limit?: number
}

export interface ReplyToReviewRequest {
  comment: string
}

export async function listRestaurantReviews(
  restaurantId: string,
  params: ListRestaurantReviewsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<ReviewDto>> {
  const limit = params.limit ?? params.pageSize ?? 20
  const data = await apiRequest<PaginatedData<ReviewDto>>(
    `/restaurants/${restaurantId}/reviews`,
    {
      query: {
        page: params.page ?? 1,
        limit,
      },
      signal,
    },
  )
  return { ...data, items: (data.items ?? []).map(normalizeReview) }
}

export async function getReview(
  reviewId: string,
  signal?: AbortSignal,
): Promise<ReviewDto> {
  return normalizeReview(await apiRequest<ReviewDto>(`/reviews/${reviewId}`, { signal }))
}

/** Domain Action — Organization Owner/Admin only. */
export async function replyToReview(
  reviewId: string,
  body: ReplyToReviewRequest,
): Promise<ReviewDto> {
  return normalizeReview(
    await apiRequest<ReviewDto>(`/reviews/${reviewId}/reply`, {
      method: 'POST',
      body,
    }),
  )
}

/** Soft-delete (Domain Action). */
export async function deleteReview(reviewId: string): Promise<void> {
  await apiRequest<undefined>(`/reviews/${reviewId}`, {
    method: 'DELETE',
  })
}

function reviewImageUploadBody(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

/** Multipart — Customer | Employee. */
export async function uploadReviewImage(
  reviewId: string,
  file: File,
): Promise<ReviewImageDto> {
  return apiRequest<ReviewImageDto>(`/reviews/${reviewId}/images`, {
    method: 'POST',
    body: reviewImageUploadBody(file),
  })
}

/** Customer | Employee. */
export async function removeReviewImage(
  reviewId: string,
  reviewImageId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `/reviews/${reviewId}/images/${reviewImageId}`,
    { method: 'DELETE' },
  )
}

export function reviewImageId(image: ReviewImageDto): string {
  return image.reviewImageId ?? image.imageId ?? image.id ?? ''
}

export function reviewImageUrl(image: ReviewImageDto): string | null {
  const url = image.url ?? image.imageUrl
  return typeof url === 'string' && url.trim() ? url : null
}

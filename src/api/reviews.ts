import { apiRequest } from './client'
import type { PaginatedData } from './types'

export interface ReviewDto {
  reviewId?: string
  id?: string
  restaurantId?: string
  rating?: number
  comment?: string | null
  reply?: string | null
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
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
  return apiRequest<PaginatedData<ReviewDto>>(
    `/restaurants/${restaurantId}/reviews`,
    {
      query: {
        page: params.page ?? 1,
        limit,
      },
      signal,
    },
  )
}

export async function getReview(
  reviewId: string,
  signal?: AbortSignal,
): Promise<ReviewDto> {
  return apiRequest<ReviewDto>(`/reviews/${reviewId}`, { signal })
}

/** Domain Action — Organization Owner/Admin only. */
export async function replyToReview(
  reviewId: string,
  body: ReplyToReviewRequest,
): Promise<ReviewDto> {
  return apiRequest<ReviewDto>(`/reviews/${reviewId}/reply`, {
    method: 'POST',
    body,
  })
}

/** Soft-delete (Domain Action). */
export async function deleteReview(reviewId: string): Promise<void> {
  await apiRequest<undefined>(`/reviews/${reviewId}`, {
    method: 'DELETE',
  })
}

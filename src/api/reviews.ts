import { apiRequest } from './client'
import type { PaginatedData } from './types'

/** The three things a guest rates after a visit (backend ADR-045). */
export const REVIEW_AXES = ['service', 'place', 'food'] as const
export type ReviewAxis = (typeof REVIEW_AXES)[number]

export interface ReviewAxisDto {
  rating: number
  comment: string | null
}

export type ReviewAxesDto = Record<ReviewAxis, ReviewAxisDto>

export interface ReviewImageDto {
  reviewImageId: string
  imageUrl: string
  sortOrder: number
}

export interface ReviewReplyDto {
  comment: string
  createdAt: string
}

/**
 * `GET /restaurants/:id/reviews` (public) and `/reviews/manage` (Owner/Admin,
 * adds `privateNote`). `reply` is an object on the wire; it must never be
 * rendered directly.
 */
export interface ReviewDto {
  reviewId: string
  restaurantId: string
  reservationId: string
  reviewerUsername: string | null
  /** Whole stars (the rounded score for a three-axis review). */
  rating: number
  comment: string | null
  /** Average of the three axes, or `rating` for a single-rating review. */
  score: number
  /** Null for a single-rating review (app 1.0.2). */
  axes: ReviewAxesDto | null
  /** Owner/Admin list only: the guest's note to the restaurant, never published. */
  privateNote?: string | null
  /** The restaurant opened it; the guest may rate again. */
  openForRerating: boolean
  reratedAt: string | null
  images: ReviewImageDto[]
  reply: ReviewReplyDto | null
  createdAt: string
  updatedAt: string
}

export interface ListRestaurantReviewsParams {
  page?: number
  pageSize?: number
  /** With `stars`: that axis's stars. Alone: reviews that have axes. */
  axis?: ReviewAxis
  /** Alone: whole-star rating. */
  stars?: number
}

export interface ReplyToReviewRequest {
  comment: string
}

function listQuery(params: ListRestaurantReviewsParams) {
  return {
    page: params.page ?? 1,
    limit: params.pageSize ?? 20,
    axis: params.axis,
    stars: params.stars,
  }
}

/** Public list - no private notes. For actors without Owner/Admin. */
export async function listRestaurantReviews(
  restaurantId: string,
  params: ListRestaurantReviewsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<ReviewDto>> {
  return apiRequest<PaginatedData<ReviewDto>>(`/restaurants/${restaurantId}/reviews`, {
    query: listQuery(params),
    signal,
  })
}

/** Owner/Admin list, with each guest's private note. */
export async function listRestaurantReviewsForStaff(
  restaurantId: string,
  params: ListRestaurantReviewsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<ReviewDto>> {
  return apiRequest<PaginatedData<ReviewDto>>(`/restaurants/${restaurantId}/reviews/manage`, {
    query: listQuery(params),
    signal,
  })
}

/** Domain Action - Owner/Admin. Zero or one reply per review; it cannot be changed. */
export async function replyToReview(
  reviewId: string,
  body: ReplyToReviewRequest,
): Promise<ReviewDto> {
  return apiRequest<ReviewDto>(`/reviews/${reviewId}/reply`, { method: 'POST', body })
}

/** Domain Action - Owner/Admin. Lets the guest rate again; idempotent while open. */
export async function reopenReview(reviewId: string): Promise<ReviewDto> {
  return apiRequest<ReviewDto>(`/reviews/${reviewId}/reopen`, { method: 'POST' })
}

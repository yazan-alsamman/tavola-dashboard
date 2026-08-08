import { useQuery } from '@tanstack/react-query'
import { getReview, listRestaurantReviews } from '@/api/reviews'
import { normalizePaginated } from '@/lib/pagination'
import { reviewKeys } from '@/lib/queryKeys'

export function useRestaurantReviewsQuery(
  restaurantId: string | undefined,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: reviewKeys.restaurant(restaurantId ?? '', page, pageSize),
    queryFn: async ({ signal }) => {
      const data = await listRestaurantReviews(
        restaurantId!,
        { page, pageSize },
        signal,
      )
      return normalizePaginated(data)
    },
    enabled: enabled && Boolean(restaurantId),
  })
}

export function useReviewDetailQuery(reviewId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.detail(reviewId ?? ''),
    queryFn: ({ signal }) => getReview(reviewId!, signal),
    enabled: Boolean(reviewId),
  })
}

import { useQuery } from '@tanstack/react-query'
import {
  listRestaurantReviews,
  listRestaurantReviewsForStaff,
  type ListRestaurantReviewsParams,
} from '@/api/reviews'
import { normalizePaginated } from '@/lib/pagination'
import { reviewKeys } from '@/lib/queryKeys'

/**
 * The restaurant's reviews. Owner/Admin (`staffView`) read the managed list,
 * which adds each guest's private note; everyone else reads the public list.
 */
export function useRestaurantReviewsQuery(
  restaurantId: string | undefined,
  params: ListRestaurantReviewsParams,
  staffView: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: reviewKeys.restaurant(restaurantId ?? '', staffView, params),
    queryFn: async ({ signal }) => {
      const list = staffView ? listRestaurantReviewsForStaff : listRestaurantReviews
      return normalizePaginated(await list(restaurantId!, params, signal))
    },
    enabled: enabled && Boolean(restaurantId),
    placeholderData: (previous) => previous,
  })
}

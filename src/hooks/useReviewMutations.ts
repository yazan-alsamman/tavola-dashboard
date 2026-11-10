import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reopenReview, replyToReview, type ReplyToReviewRequest } from '@/api/reviews'
import { analyticsKeys, reviewKeys } from '@/lib/queryKeys'

export interface ReviewMutationScope {
  restaurantId: string
}

async function invalidateReviews(
  queryClient: ReturnType<typeof useQueryClient>,
  scope: ReviewMutationScope,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
    queryClient.invalidateQueries({
      queryKey: analyticsKeys.reviewsSummary(scope.restaurantId),
    }),
  ])
}

export function useReplyToReviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewMutationScope & { reviewId: string; body: ReplyToReviewRequest }) =>
      replyToReview(input.reviewId, input.body),
    onSuccess: (_data, vars) => invalidateReviews(queryClient, vars),
  })
}

/** Opens a review for its guest to rate again (Owner/Admin). */
export function useReopenReviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewMutationScope & { reviewId: string }) => reopenReview(input.reviewId),
    onSuccess: (_data, vars) => invalidateReviews(queryClient, vars),
  })
}

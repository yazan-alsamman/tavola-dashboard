import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteReview,
  replyToReview,
  type ReplyToReviewRequest,
} from '@/api/reviews'
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
    mutationFn: (
      input: ReviewMutationScope & {
        reviewId: string
        body: ReplyToReviewRequest
      },
    ) => replyToReview(input.reviewId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateReviews(queryClient, vars)
      await queryClient.invalidateQueries({
        queryKey: reviewKeys.detail(vars.reviewId),
      })
    },
  })
}

export function useDeleteReviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReviewMutationScope & { reviewId: string }) =>
      deleteReview(input.reviewId),
    onSuccess: async (_data, vars) => {
      await invalidateReviews(queryClient, vars)
      queryClient.removeQueries({
        queryKey: reviewKeys.detail(vars.reviewId),
      })
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createOffer,
  deleteOffer,
  publishOffer,
  updateOffer,
  type CreateOfferRequest,
  type UpdateOfferRequest,
} from '@/api/offers'
import { offerKeys } from '@/lib/queryKeys'

export interface OfferMutationScope {
  restaurantId: string
}

async function invalidateOffers(
  queryClient: ReturnType<typeof useQueryClient>,
  restaurantId: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: offerKeys.all,
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey[1] === restaurantId,
  })
}

export function useCreateOfferMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OfferMutationScope & { body: CreateOfferRequest }) =>
      createOffer(input.restaurantId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateOffers(queryClient, vars.restaurantId)
    },
  })
}

export function useUpdateOfferMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: OfferMutationScope & { offerId: string; body: UpdateOfferRequest },
    ) => updateOffer(input.restaurantId, input.offerId, input.body),
    onSuccess: async (_data, vars) => {
      await invalidateOffers(queryClient, vars.restaurantId)
    },
  })
}

export function usePublishOfferMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OfferMutationScope & { offerId: string }) =>
      publishOffer(input.restaurantId, input.offerId),
    onSuccess: async (_data, vars) => {
      await invalidateOffers(queryClient, vars.restaurantId)
    },
  })
}

export function useDeleteOfferMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OfferMutationScope & { offerId: string }) =>
      deleteOffer(input.restaurantId, input.offerId),
    onSuccess: async (_data, vars) => {
      await invalidateOffers(queryClient, vars.restaurantId)
    },
  })
}

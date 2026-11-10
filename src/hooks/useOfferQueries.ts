import { useQuery } from '@tanstack/react-query'
import { getOfferImpact, listOffers } from '@/api/offers'
import { isApiError } from '@/api/errors'
import { normalizePaginated } from '@/lib/pagination'
import { offerKeys } from '@/lib/queryKeys'

export function useOffersListQuery(
  restaurantId: string | undefined,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: offerKeys.list(restaurantId ?? '', page, pageSize),
    queryFn: async ({ signal }) => {
      const data = await listOffers(restaurantId!, { page, pageSize }, signal)
      return normalizePaginated(data)
    },
    enabled: enabled && Boolean(restaurantId),
    retry: (failureCount, error) => {
      if (isApiError(error) && error.code === 'FORBIDDEN') {
        return false
      }
      return failureCount < 2
    },
  })
}

/** The impact card of one offer; fetched only while the card is open. */
export function useOfferImpactQuery(
  restaurantId: string | undefined,
  offerId: string | undefined,
) {
  return useQuery({
    queryKey: offerKeys.impact(restaurantId ?? '', offerId ?? ''),
    queryFn: ({ signal }) => getOfferImpact(restaurantId!, offerId!, signal),
    enabled: Boolean(restaurantId && offerId),
  })
}

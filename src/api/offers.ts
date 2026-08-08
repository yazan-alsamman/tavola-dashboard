import { apiRequest } from './client'
import type { PaginatedData } from './types'

export type OfferType = 'Promotion' | (string & {})
export type OfferDiscountType = 'Percentage' | 'FixedAmount' | (string & {})
export type OfferStatus = 'Draft' | 'Published' | (string & {})

export interface OfferDto {
  offerId: string
  restaurantId?: string
  type?: OfferType
  title?: string
  description?: string | null
  discountType?: OfferDiscountType
  discountValue?: number
  startsAt?: string
  endsAt?: string
  status?: OfferStatus
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface CreateOfferRequest {
  type: OfferType
  title: string
  description: string
  discountType: OfferDiscountType
  discountValue: number
  startsAt: string
  endsAt: string
}

export type UpdateOfferRequest = CreateOfferRequest

export interface ListOffersParams {
  page?: number
  pageSize?: number
  limit?: number
}

export async function createOffer(
  restaurantId: string,
  body: CreateOfferRequest,
): Promise<OfferDto> {
  return apiRequest<OfferDto>(`/restaurants/${restaurantId}/offers`, {
    method: 'POST',
    body,
  })
}

export async function listOffers(
  restaurantId: string,
  params: ListOffersParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<OfferDto>> {
  const limit = params.limit ?? params.pageSize ?? 20
  return apiRequest<PaginatedData<OfferDto>>(
    `/restaurants/${restaurantId}/offers`,
    {
      query: {
        page: params.page ?? 1,
        limit,
      },
      signal,
    },
  )
}

export async function updateOffer(
  restaurantId: string,
  offerId: string,
  body: UpdateOfferRequest,
): Promise<OfferDto> {
  return apiRequest<OfferDto>(
    `/restaurants/${restaurantId}/offers/${offerId}`,
    {
      method: 'PATCH',
      body,
    },
  )
}

/** Domain Action — Draft offers only. */
export async function publishOffer(
  restaurantId: string,
  offerId: string,
): Promise<OfferDto> {
  return apiRequest<OfferDto>(
    `/restaurants/${restaurantId}/offers/${offerId}/publish`,
    { method: 'POST' },
  )
}

/** Soft-delete. */
export async function deleteOffer(
  restaurantId: string,
  offerId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `/restaurants/${restaurantId}/offers/${offerId}`,
    { method: 'DELETE' },
  )
}

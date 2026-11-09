import { apiRequest } from './client'
import type { PaginatedData } from './types'

/**
 * ADR-047: the four kinds the CR names. `Promotion`, `Coupon` and `Event`
 * stay valid for older offers; the dashboard no longer creates them.
 */
export const CURRENT_OFFER_TYPES = ['BillDiscount', 'FreeItem', 'GroupPrice', 'QuietDays'] as const
export const LEGACY_OFFER_TYPES = ['Promotion', 'Coupon', 'Event'] as const
export type CurrentOfferType = (typeof CURRENT_OFFER_TYPES)[number]
export type OfferType =
  | CurrentOfferType
  | (typeof LEGACY_OFFER_TYPES)[number]
  | (string & {})
export type OfferDiscountType = 'Percentage' | 'FixedAmount' | (string & {})
/** The backend reports the status as of now: a Published offer past its end reads Expired. */
export type OfferStatus = 'Draft' | 'Published' | 'Expired' | (string & {})

/** 0 = Sunday ... 6 = Saturday (the backend's numbering). */
export const OFFER_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

/** ADR-047 booking conditions. Empty lists and nulls mean "no restriction". */
export interface OfferConditions {
  daysOfWeek: number[]
  /** "HH:mm", branch-local; both or neither. */
  startTime: string | null
  endTime: string | null
  minPartySize: number | null
  /** Empty = every branch. */
  branchIds: string[]
  oncePerCustomer: boolean
  bookingCap: number | null
}

export const NO_OFFER_CONDITIONS: OfferConditions = {
  daysOfWeek: [],
  startTime: null,
  endTime: null,
  minPartySize: null,
  branchIds: [],
  oncePerCustomer: false,
  bookingCap: null,
}

export interface OfferDto extends Partial<OfferConditions> {
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

export interface CreateOfferRequest extends OfferConditions {
  type: OfferType
  title: string
  description: string
  discountType: OfferDiscountType
  discountValue: number
  startsAt: string
  endsAt: string
}

/** Full replace. A Draft or a still-running Published offer may be edited (ADR-047). */
export type UpdateOfferRequest = CreateOfferRequest

export interface ListOffersParams {
  page?: number
  pageSize?: number
  limit?: number
}

export interface OfferEstimatedCostDto {
  currency: string | null
  amount: number
  /** Some visits were at a branch with no reference price yet, so the amount is low. */
  partial: boolean
}

/** `GET /restaurants/:id/offers/:offerId/impact` (ADR-047). */
export interface OfferImpactDto {
  offerId: string
  views: number
  bookings: number
  persons: number
  attended: number
  newCustomerPercent: number | null
  comparison: {
    from: string | null
    to: string | null
    bookingsInOfferSlots: number
    usualBookings: number | null
    liftPercent: number | null
    baselineWeeks: number
  }
  estimatedCost: OfferEstimatedCostDto[]
  generatedAt: string
}

/** The conditions of an offer as the form edits them. */
export function offerConditions(offer: OfferDto): OfferConditions {
  return {
    daysOfWeek: offer.daysOfWeek ?? [],
    startTime: offer.startTime ?? null,
    endTime: offer.endTime ?? null,
    minPartySize: offer.minPartySize ?? null,
    branchIds: offer.branchIds ?? [],
    oncePerCustomer: offer.oncePerCustomer ?? false,
    bookingCap: offer.bookingCap ?? null,
  }
}

/** Draft, or Published and not yet over. Mirrors the backend's edit rule. */
export function isOfferEditable(offer: OfferDto): boolean {
  return offer.status === 'Draft' || offer.status === 'Published'
}

/**
 * The currency a fixed-amount offer is in (CR: "an amount in the branch
 * currency"): the one currency of the branches it covers, else null.
 */
export function offerCurrency(
  branchIds: readonly string[],
  branches: ReadonlyArray<{ branchId: string; currency: string | null }>,
): string | null {
  const covered = branchIds.length
    ? branches.filter((branch) => branchIds.includes(branch.branchId))
    : branches
  const currencies = new Set(covered.map((branch) => branch.currency).filter(Boolean))
  return currencies.size === 1 ? [...currencies][0]! : null
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

/** Owner/Admin. The impact card's figures (ADR-047). */
export async function getOfferImpact(
  restaurantId: string,
  offerId: string,
  signal?: AbortSignal,
): Promise<OfferImpactDto> {
  return apiRequest<OfferImpactDto>(
    `/restaurants/${restaurantId}/offers/${offerId}/impact`,
    { signal },
  )
}

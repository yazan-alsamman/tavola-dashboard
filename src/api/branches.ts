import { apiRequest } from './client'
import type { PaginatedData } from './types'
import type { WorkingHoursDto } from './restaurants'

/** Backend ADR-053: what kind of place a branch is. */
export const BRANCH_VENUE_TYPES = ['Restaurant', 'Cafe', 'Patisserie', 'Brunch'] as const
export type BranchVenueType = (typeof BRANCH_VENUE_TYPES)[number]

/** Backend ADR-053: branch amenities. */
export const BRANCH_FEATURES = [
  'Shisha',
  'OutdoorSeating',
  'Heating',
  'Parking',
  'FamilyFriendly',
  'PrivateRoom',
] as const
export type BranchFeature = (typeof BRANCH_FEATURES)[number]

/** Backend ADR-053: derived from the trial end and the paused flag. */
export type BranchSubscriptionStatus = 'Trial' | 'Active' | 'Paused'

/**
 * Confirmed `BranchResponseDto` from live Swagger / Postman.
 * Branches have no `name` or `status` field — soft-delete is the only inactive signal.
 */
export interface BranchDto {
  branchId: string
  restaurantId: string
  city: string
  district: string | null
  address: string
  latitude: number | null
  longitude: number | null
  countryCode: string
  currency: string | null
  timezone: string
  phone: string | null
  /**
   * ADR-046: average price of the branch menu's items ranked 2 to 11.
   * Computed by the backend; never written by the dashboard.
   */
  referencePrice?: number | null
  /** ADR-046: 1-4, the quartile of `referencePrice` among same-currency branches. */
  priceLevel?: number | null
  /** Backend ADR-051: File id of the branch's own cover; null shows the restaurant cover. */
  coverImageId?: string | null
  /** Backend ADR-053 */
  venueType?: BranchVenueType | null
  features?: BranchFeature[]
  subscriptionStatus?: BranchSubscriptionStatus
  trialEndsAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ListBranchesParams {
  page?: number
  limit?: number
}

/** Create / update body from Postman (full-replace on PATCH). */
export interface BranchWriteRequest {
  city: string
  district?: string | null
  address: string
  latitude?: number | null
  longitude?: number | null
  countryCode: string
  currency?: string | null
  timezone: string
  phone?: string | null
  /** Backend ADR-053: omitted on update keeps the stored value. */
  venueType?: BranchVenueType | null
  features?: BranchFeature[]
}

export async function listBranches(
  restaurantId: string,
  params: ListBranchesParams = {},
): Promise<PaginatedData<BranchDto>> {
  return apiRequest<PaginatedData<BranchDto>>(
    `/restaurants/${restaurantId}/branches`,
    {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  )
}

export async function getBranch(
  restaurantId: string,
  branchId: string,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(
    `/restaurants/${restaurantId}/branches/${branchId}`,
  )
}

export async function createBranch(
  restaurantId: string,
  body: BranchWriteRequest,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(`/restaurants/${restaurantId}/branches`, {
    method: 'POST',
    body,
  })
}

export async function updateBranch(
  restaurantId: string,
  branchId: string,
  body: BranchWriteRequest,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(
    `/restaurants/${restaurantId}/branches/${branchId}`,
    {
      method: 'PATCH',
      body,
    },
  )
}

/** Soft-delete. Not idempotent. */
export async function deleteBranch(
  restaurantId: string,
  branchId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `/restaurants/${restaurantId}/branches/${branchId}`,
    { method: 'DELETE' },
  )
}

export async function getBranchWorkingHours(
  restaurantId: string,
  branchId: string,
): Promise<WorkingHoursDto> {
  return apiRequest<WorkingHoursDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/working-hours`,
  )
}

export async function updateBranchWorkingHours(
  restaurantId: string,
  branchId: string,
  body: WorkingHoursDto,
): Promise<WorkingHoursDto> {
  return apiRequest<WorkingHoursDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/working-hours`,
    {
      method: 'PATCH',
      body,
    },
  )
}

/** Backend ADR-051: each branch has its own reservation rules. */
export interface BranchSettingsDto {
  branchId: string
  reservationIntervalMinutes: number
  maxGuestsPerReservation: number
  cancellationWindowMinutes: number
  pendingReservationTimeoutMinutes: number
  defaultReservationDurationMinutes: number
  autoApproval: boolean
  reservationReminderMinutesBefore: number
  lateArrivalGraceMinutes: number
  /** Backend ADR-053: auto-approval only up to this party size; null = any size. */
  autoApprovalMaxGuests: number | null
  /** Online bookings must start at least this many minutes from now. */
  minLeadTimeMinutes: number
  /** Furthest day ahead to book online; null = the platform limit (90). */
  maxDaysAhead: number | null
  /** Most guests accepted online on one day; null = no cap. */
  dailyGuestCap: number | null
  updatedAt: string
}

export type BranchSettingsWriteRequest = Omit<BranchSettingsDto, 'branchId' | 'updatedAt'>

export async function getBranchSettings(
  restaurantId: string,
  branchId: string,
  signal?: AbortSignal,
): Promise<BranchSettingsDto> {
  return apiRequest<BranchSettingsDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/settings`,
    { signal },
  )
}

/** Full replace of this branch's rules; other branches keep theirs. */
export async function updateBranchSettings(
  restaurantId: string,
  branchId: string,
  body: BranchSettingsWriteRequest,
): Promise<BranchSettingsDto> {
  return apiRequest<BranchSettingsDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/settings`,
    { method: 'PATCH', body },
  )
}

export async function listAllBranches(
  restaurantId: string,
  pageSize = 100,
  signal?: AbortSignal,
): Promise<BranchDto[]> {
  const items: BranchDto[] = []
  let page = 1
  let total = Infinity
  const maxPages = 50

  while (items.length < total && page <= maxPages) {
    const result = await apiRequest<PaginatedData<BranchDto>>(
      `/restaurants/${restaurantId}/branches`,
      {
        query: { page, limit: pageSize },
        signal,
      },
    )
    items.push(...result.items)
    total = result.total
    if (result.items.length === 0) break
    page += 1
  }

  return items
}

/** Presentation label — branches have no dedicated name field. */
export function formatBranchLabel(branch: BranchDto): string {
  if (branch.district && branch.district.trim().length > 0) {
    return `${branch.city} — ${branch.district}`
  }
  return branch.city
}

/** Backend ADR-053: dates a branch takes no online bookings. */
export interface BranchClosureDto {
  closureId: string
  branchId: string
  /** Inclusive branch-local dates, YYYY-MM-DD. */
  startDate: string
  endDate: string
  reason: string | null
  createdAt: string
}

export interface BranchClosureWriteRequest {
  startDate: string
  endDate: string
  reason?: string | null
}

/** Closures that have not ended yet, earliest first. */
export async function listBranchClosures(
  restaurantId: string,
  branchId: string,
  signal?: AbortSignal,
): Promise<BranchClosureDto[]> {
  return apiRequest<BranchClosureDto[]>(
    `/restaurants/${restaurantId}/branches/${branchId}/closures`,
    { signal },
  )
}

export async function createBranchClosure(
  restaurantId: string,
  branchId: string,
  body: BranchClosureWriteRequest,
): Promise<BranchClosureDto> {
  return apiRequest<BranchClosureDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/closures`,
    { method: 'POST', body },
  )
}

export async function deleteBranchClosure(
  restaurantId: string,
  branchId: string,
  closureId: string,
): Promise<void> {
  await apiRequest<undefined>(
    `/restaurants/${restaurantId}/branches/${branchId}/closures/${closureId}`,
    { method: 'DELETE' },
  )
}

/** Backend ADR-053: hide the branch from guests and stop online bookings, or undo it. */
export async function setBranchPaused(
  restaurantId: string,
  branchId: string,
  paused: boolean,
): Promise<BranchDto> {
  return apiRequest<BranchDto>(
    `/restaurants/${restaurantId}/branches/${branchId}/${paused ? 'pause' : 'resume'}`,
    { method: 'POST' },
  )
}

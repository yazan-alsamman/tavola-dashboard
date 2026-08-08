import { apiRequest } from './client'

/** Preset windows supported by live AnalyticsDateRangeQueryDto. */
export type AnalyticsRangePreset = 'today' | 'last7d' | 'last30d' | 'thisMonth'

/**
 * Analytics date filters — live OpenAPI uses `dateFrom` / `dateTo` / `range`
 * (not `from` / `to`).
 */
export interface AnalyticsDateRangeParams {
  /** Inclusive YYYY-MM-DD. */
  dateFrom?: string
  /** Inclusive YYYY-MM-DD. */
  dateTo?: string
  /** Preset window; preferred when no custom dates. */
  range?: AnalyticsRangePreset
  /** Optional branch filter where the backend DTO supports it. */
  branchId?: string
}

/** @deprecated Prefer {@link AnalyticsDateRangeParams} with dateFrom/dateTo/range. */
export type LegacyAnalyticsDateRange = {
  from: string
  to: string
  branchId?: string
}

export type AnalyticsPayload = Record<string, unknown>

function toAnalyticsQuery(
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
): Record<string, string | undefined> {
  const legacy = params as LegacyAnalyticsDateRange
  const modern = params as AnalyticsDateRangeParams

  const dateFrom = modern.dateFrom ?? legacy.from
  const dateTo = modern.dateTo ?? legacy.to
  const range = modern.range
  const branchId = params.branchId

  if (range) {
    return { range, branchId }
  }

  return {
    dateFrom,
    dateTo,
    branchId,
  }
}

export async function getCustomerInsights(
  restaurantId: string,
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    `/restaurants/${restaurantId}/analytics/customers`,
    {
      query: toAnalyticsQuery(params),
      signal,
    },
  )
}

export async function getReservationSummary(
  restaurantId: string,
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    `/restaurants/${restaurantId}/analytics/reservations/summary`,
    {
      query: toAnalyticsQuery(params),
      signal,
    },
  )
}

export async function getBranchReservationTrends(
  restaurantId: string,
  branchId: string,
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    `/restaurants/${restaurantId}/analytics/branches/${branchId}/reservations/trends`,
    {
      query: toAnalyticsQuery({ ...params, branchId: undefined }),
      signal,
    },
  )
}

export async function getBranchPeakHours(
  restaurantId: string,
  branchId: string,
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    `/restaurants/${restaurantId}/analytics/branches/${branchId}/peak-hours`,
    {
      query: toAnalyticsQuery({ ...params, branchId: undefined }),
      signal,
    },
  )
}

export async function getWaitlistAnalytics(
  restaurantId: string,
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    `/restaurants/${restaurantId}/analytics/waitlist`,
    {
      query: toAnalyticsQuery(params),
      signal,
    },
  )
}

export async function getReviewsSummary(
  restaurantId: string,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    `/restaurants/${restaurantId}/analytics/reviews-summary`,
    { signal },
  )
}

export async function getOrganizationReservationSummary(
  params: AnalyticsDateRangeParams | LegacyAnalyticsDateRange,
  signal?: AbortSignal,
): Promise<AnalyticsPayload> {
  return apiRequest<AnalyticsPayload>(
    '/organization/analytics/reservations/summary',
    {
      query: toAnalyticsQuery(params),
      signal,
    },
  )
}

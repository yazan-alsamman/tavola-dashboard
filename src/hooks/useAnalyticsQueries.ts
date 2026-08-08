import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getBranchPeakHours,
  getBranchReservationTrends,
  getCustomerInsights,
  getOrganizationReservationSummary,
  getReservationSummary,
  getReviewsSummary,
  getWaitlistAnalytics,
} from '@/api/analytics'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { defaultAnalyticsRange } from '@/lib/dateRange'
import { analyticsKeys } from '@/lib/queryKeys'

function useAnalyticsScope() {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  const ready = status === 'ready' && Boolean(selectedRestaurantId)
  const branchReady = ready && Boolean(selectedBranchId)

  return {
    restaurantId: selectedRestaurantId,
    branchId: selectedBranchId,
    ready,
    branchReady,
  }
}

export function useAnalyticsDateRange() {
  const defaults = defaultAnalyticsRange()
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)

  return {
    from,
    to,
    setFrom,
    setTo,
    reset: () => {
      const range = defaultAnalyticsRange()
      setFrom(range.from)
      setTo(range.to)
    },
  }
}

export function useReservationSummaryQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { restaurantId, branchId, ready } = useAnalyticsScope()

  return useQuery({
    queryKey: analyticsKeys.reservationsSummary(restaurantId ?? '', from, to),
    queryFn: ({ signal }) =>
      getReservationSummary(restaurantId!, {
        from,
        to,
        branchId: branchId ?? undefined,
      }, signal),
    enabled: enabled && ready,
  })
}

export function useOrgReservationSummaryQuery(
  from: string,
  to: string,
  enabled = true,
) {
  return useQuery({
    queryKey: analyticsKeys.orgReservationsSummary(from, to),
    queryFn: ({ signal }) =>
      getOrganizationReservationSummary({ from, to }, signal),
    enabled,
  })
}

export function useReservationTrendsQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { restaurantId, branchId, branchReady } = useAnalyticsScope()

  return useQuery({
    queryKey: analyticsKeys.trends(
      restaurantId ?? '',
      branchId ?? '',
      from,
      to,
    ),
    queryFn: ({ signal }) =>
      getBranchReservationTrends(restaurantId!, branchId!, { from, to }, signal),
    enabled: enabled && branchReady,
  })
}

export function usePeakHoursQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { restaurantId, branchId, branchReady } = useAnalyticsScope()

  return useQuery({
    queryKey: analyticsKeys.peakHours(
      restaurantId ?? '',
      branchId ?? '',
      from,
      to,
    ),
    queryFn: ({ signal }) =>
      getBranchPeakHours(restaurantId!, branchId!, { from, to }, signal),
    enabled: enabled && branchReady,
  })
}

export function useCustomerInsightsQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { restaurantId, branchId, ready } = useAnalyticsScope()

  return useQuery({
    queryKey: analyticsKeys.customers(restaurantId ?? '', from, to),
    queryFn: ({ signal }) =>
      getCustomerInsights(restaurantId!, {
        from,
        to,
        branchId: branchId ?? undefined,
      }, signal),
    enabled: enabled && ready,
  })
}

export function useWaitlistAnalyticsQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { restaurantId, ready } = useAnalyticsScope()

  return useQuery({
    queryKey: analyticsKeys.waitlist(restaurantId ?? '', from, to),
    queryFn: ({ signal }) =>
      getWaitlistAnalytics(restaurantId!, { from, to }, signal),
    enabled: enabled && ready,
  })
}

export function useReviewsSummaryQuery(enabled = true) {
  const { restaurantId, ready } = useAnalyticsScope()

  return useQuery({
    queryKey: analyticsKeys.reviewsSummary(restaurantId ?? ''),
    queryFn: ({ signal }) => getReviewsSummary(restaurantId!, signal),
    enabled: enabled && ready,
  })
}

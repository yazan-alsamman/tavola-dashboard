import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import {
  getMyReservation,
  listBranchReservations,
  listMyReservations,
  type ReservationDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { normalizePaginated } from '@/lib/pagination'
import { reservationKeys } from '@/lib/queryKeys'
import { toReservationViews, type ReservationView } from '@/lib/reservationView'

function asViews(items: ReservationDto[]): ReservationView[] {
  return toReservationViews(items)
}

export function useMyReservationsQuery(page: number, pageSize: number) {
  return useQuery({
    queryKey: reservationKeys.list(page, pageSize),
    queryFn: async ({ signal }) => {
      const data = await listMyReservations({ page, pageSize }, signal)
      const normalized = normalizePaginated(data)
      return { ...normalized, items: asViews(normalized.items) }
    },
  })
}

async function fetchOwnedReservations(
  signal: AbortSignal | undefined,
  selectedRestaurantId: string | null,
): Promise<ReservationView[]> {
  const pageSize = 50
  const maxPages = 8
  const items: ReservationView[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await listMyReservations({ page, pageSize }, signal)
    const normalized = normalizePaginated(data)
    items.push(...asViews(normalized.items))
    if (
      normalized.items.length === 0 ||
      items.length >= normalized.total ||
      normalized.items.length < pageSize
    ) {
      break
    }
  }

  if (!selectedRestaurantId) return items
  return items.filter((r) => r.restaurantId === selectedRestaurantId)
}

async function fetchAllBranchReservations(
  signal: AbortSignal | undefined,
  restaurantId: string,
  branchId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ReservationView[]> {
  const pageSize = 100
  const maxPages = 20
  const items: ReservationView[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await listBranchReservations(
      {
        restaurantId,
        branchId,
        dateFrom,
        dateTo,
        page,
        pageSize,
      },
      signal,
    )
    const normalized = normalizePaginated(data)
    items.push(...asViews(normalized.items))
    if (
      normalized.items.length === 0 ||
      items.length >= normalized.total ||
      normalized.items.length < pageSize
    ) {
      break
    }
  }

  return items
}

function reservationDayKey(reservation: ReservationView): string {
  return reservation.reservationDate.slice(0, 10)
}

function filterOwnedByRange(
  items: ReservationView[],
  from: string,
  to: string,
): ReservationView[] {
  return items.filter((reservation) => {
    const day = reservationDayKey(reservation)
    return day >= from && day <= to
  })
}

export type CalendarReservationsSource = 'branch' | 'ownership-fallback'

export interface CalendarReservationsResult {
  items: ReservationView[]
  source: CalendarReservationsSource
}

/** Branch calendar. Owner/Admin and assigned Employees receive rows. 403 falls back to the caller's own reservations. */
export function useCalendarRangeReservationsQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { selectedRestaurantId, selectedBranchId } = useRestaurantScope()

  return useQuery({
    queryKey: reservationKeys.calendarRange(
      from,
      to,
      selectedRestaurantId,
      selectedBranchId,
    ),
    enabled:
      enabled &&
      Boolean(from) &&
      Boolean(to) &&
      Boolean(selectedRestaurantId) &&
      Boolean(selectedBranchId),
    queryFn: async ({ signal }): Promise<CalendarReservationsResult> => {
      try {
        const items = await fetchAllBranchReservations(
          signal,
          selectedRestaurantId!,
          selectedBranchId!,
          from,
          to,
        )
        return { items, source: 'branch' }
      } catch (err) {
        const forbidden =
          isApiError(err) &&
          (err.status === 403 ||
            err.code === 'FORBIDDEN' ||
            err.code === 'EMPLOYEE_BRANCH_NOT_ASSIGNED')
        if (!forbidden) throw err

        const owned = await fetchOwnedReservations(signal, selectedRestaurantId)
        return {
          items: filterOwnedByRange(owned, from, to),
          source: 'ownership-fallback',
        }
      }
    },
  })
}

/** @deprecated Prefer {@link useCalendarRangeReservationsQuery}. */
export function useCalendarDayReservationsQuery(date: string, enabled = true) {
  return useCalendarRangeReservationsQuery(date, date, enabled)
}

/**
 * Staff hub list: branch date-window when scope ready, else ownership pages.
 */
export function useBranchReservationsWindowQuery(
  dateFrom: string,
  dateTo: string,
  page: number,
  pageSize: number,
  enabled = true,
) {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  const scopeReady =
    status === 'ready' && Boolean(selectedRestaurantId) && Boolean(selectedBranchId)

  return useQuery({
    queryKey: reservationKeys.branchWindow(
      selectedRestaurantId,
      selectedBranchId,
      dateFrom,
      dateTo,
      page,
      pageSize,
    ),
    enabled: enabled && scopeReady && Boolean(dateFrom) && Boolean(dateTo),
    queryFn: async ({ signal }) => {
      try {
        const data = await listBranchReservations(
          {
            restaurantId: selectedRestaurantId!,
            branchId: selectedBranchId!,
            dateFrom,
            dateTo,
            page,
            pageSize,
          },
          signal,
        )
        const normalized = normalizePaginated(data)
        return {
          ...normalized,
          items: asViews(normalized.items),
          source: 'branch' as const,
        }
      } catch (err) {
        const forbidden =
          isApiError(err) &&
          (err.status === 403 ||
            err.code === 'FORBIDDEN' ||
            err.code === 'EMPLOYEE_BRANCH_NOT_ASSIGNED')
        if (!forbidden) throw err

        const data = await listMyReservations({ page, pageSize }, signal)
        const normalized = normalizePaginated(data)
        const items = asViews(normalized.items).filter((r) => {
          const day = reservationDayKey(r)
          return (
            r.restaurantId === selectedRestaurantId &&
            day >= dateFrom &&
            day <= dateTo
          )
        })
        return {
          items,
          total: items.length,
          page,
          pageSize,
          source: 'ownership-fallback' as const,
        }
      }
    },
  })
}

function readCachedReservation(
  client: QueryClient,
  reservationId: string,
): ReservationView | undefined {
  const entries = client.getQueriesData<{ items?: ReservationView[] }>({
    queryKey: reservationKeys.all,
  })
  for (const [, data] of entries) {
    const match = data?.items?.find((item) => item?.reservationId === reservationId)
    if (match) return match
  }
  return undefined
}

/** Branch-list row already loaded in this session, including guest name and table. */
export function useCachedReservation(
  reservationId: string | undefined,
): ReservationView | undefined {
  const client = useQueryClient()
  return useSyncExternalStore(
    (onStoreChange) => client.getQueryCache().subscribe(onStoreChange),
    () => (reservationId ? readCachedReservation(client, reservationId) : undefined),
    () => undefined,
  )
}

export function useMyReservationDetailQuery(reservationId: string | undefined) {
  return useQuery({
    queryKey: reservationKeys.detail(reservationId ?? ''),
    queryFn: ({ signal }) => getMyReservation(reservationId!, signal),
    enabled: Boolean(reservationId),
    retry: (failureCount, error) => {
      if (isApiError(error) && error.code === 'NOT_FOUND') {
        return false
      }
      return failureCount < 2
    },
  })
}

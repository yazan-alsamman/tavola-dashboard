import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import {
  getBranchDaySchedule,
  getMyReservation,
  listBranchReservations,
  listMyReservations,
  type ReservationDto,
  type ReservationStatusDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { normalizePaginated } from '@/lib/pagination'
import { reservationKeys } from '@/lib/queryKeys'
import { shiftDateKey } from '@/lib/calendarDates'
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

/** The API rejects branch reservation windows longer than this many days. */
const BRANCH_RESERVATIONS_MAX_RANGE_DAYS = 366

/**
 * Splits an inclusive YYYY-MM-DD range into consecutive windows the API accepts,
 * so a long range ("all dates") is fetched in full instead of being rejected.
 */
export function splitDateRange(
  dateFrom: string,
  dateTo: string,
  maxDays = BRANCH_RESERVATIONS_MAX_RANGE_DAYS,
): Array<[string, string]> {
  const windows: Array<[string, string]> = []
  let cursor = dateFrom
  while (cursor <= dateTo) {
    const candidateEnd = shiftDateKey(cursor, maxDays - 1)
    const end = candidateEnd < dateTo ? candidateEnd : dateTo
    windows.push([cursor, end])
    cursor = shiftDateKey(end, 1)
  }
  return windows
}

/** Optional server-side narrowing on top of the date window. */
interface BranchReservationFilters {
  status?: ReservationStatusDto
  customerKey?: string
}

async function fetchAllBranchReservations(
  signal: AbortSignal | undefined,
  restaurantId: string,
  branchId: string,
  dateFrom: string,
  dateTo: string,
  filters: BranchReservationFilters = {},
): Promise<ReservationView[]> {
  const items: ReservationView[] = []
  for (const [windowFrom, windowTo] of splitDateRange(dateFrom, dateTo)) {
    items.push(
      ...(await fetchBranchReservationsWindow(
        signal,
        restaurantId,
        branchId,
        windowFrom,
        windowTo,
        filters,
      )),
    )
  }
  return items
}

async function fetchBranchReservationsWindow(
  signal: AbortSignal | undefined,
  restaurantId: string,
  branchId: string,
  dateFrom: string,
  dateTo: string,
  filters: BranchReservationFilters = {},
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
        ...filters,
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

/**
 * No reservation can predate the platform itself (its first database
 * migration ran in July 2026), so this is a safe lower bound for "all dates".
 */
export const RESERVATIONS_EPOCH = '2026-07-01'
/** How far ahead "upcoming" and "all dates" look. */
export const FUTURE_HORIZON_DAYS = 365

/** Every booking of one customer at this branch (customer page). */
export function useCustomerReservationsQuery(customerKey: string | undefined, today: string) {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  const to = shiftDateKey(today, FUTURE_HORIZON_DAYS)
  return useQuery({
    queryKey: reservationKeys.customer(selectedRestaurantId, selectedBranchId, customerKey ?? ''),
    enabled:
      status === 'ready' &&
      Boolean(customerKey) &&
      Boolean(selectedRestaurantId) &&
      Boolean(selectedBranchId),
    queryFn: ({ signal }) =>
      fetchAllBranchReservations(
        signal,
        selectedRestaurantId!,
        selectedBranchId!,
        RESERVATIONS_EPOCH,
        to,
        { customerKey },
      ),
  })
}

/** How often the shell re-checks for new bookings waiting for approval. */
export const PENDING_WATCH_INTERVAL_MS = 30_000
/** How far ahead the pending watch looks. */
const PENDING_WATCH_HORIZON_DAYS = 90

/**
 * Pending bookings of the selected branch, refreshed in the background so the
 * shell can chime on a new one and warn before an approval deadline passes.
 * A 403 (no branch access) simply yields nothing to watch.
 */
export function usePendingReservationsWatchQuery(today: string, enabled = true) {
  const { selectedRestaurantId, selectedBranchId, status } = useRestaurantScope()
  return useQuery({
    queryKey: reservationKeys.pendingWatch(selectedRestaurantId, selectedBranchId),
    enabled:
      enabled &&
      status === 'ready' &&
      Boolean(selectedRestaurantId) &&
      Boolean(selectedBranchId),
    refetchInterval: PENDING_WATCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await fetchAllBranchReservations(
          signal,
          selectedRestaurantId!,
          selectedBranchId!,
          shiftDateKey(today, -1),
          shiftDateKey(today, PENDING_WATCH_HORIZON_DAYS),
          { status: 'Pending' },
        )
      } catch (err) {
        if (isApiError(err) && err.status === 403) return []
        throw err
      }
    },
  })
}

/**
 * Opening hours of the selected branch on `date` (today or later). Past
 * dates are not asked for: the API rejects them.
 */
export function useBranchDayScheduleQuery(date: string, today: string) {
  const { selectedBranchId, status } = useRestaurantScope()
  return useQuery({
    queryKey: reservationKeys.daySchedule(selectedBranchId, date),
    enabled: status === 'ready' && Boolean(selectedBranchId) && date >= today,
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: ({ signal }) => getBranchDaySchedule(selectedBranchId!, date, signal),
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

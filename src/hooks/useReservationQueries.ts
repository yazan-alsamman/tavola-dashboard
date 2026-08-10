import { useQuery } from '@tanstack/react-query'
import {
  getMyReservation,
  listMyReservations,
  type ReservationDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { normalizePaginated } from '@/lib/pagination'
import { reservationKeys } from '@/lib/queryKeys'

export function useMyReservationsQuery(page: number, pageSize: number) {
  return useQuery({
    queryKey: reservationKeys.list(page, pageSize),
    queryFn: async ({ signal }) => {
      const data = await listMyReservations({ page, pageSize }, signal)
      return normalizePaginated(data)
    },
  })
}

async function fetchOwnedReservations(
  signal: AbortSignal | undefined,
  selectedRestaurantId: string | null,
): Promise<ReservationDto[]> {
  const pageSize = 50
  const maxPages = 8
  const items: ReservationDto[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await listMyReservations({ page, pageSize }, signal)
    const normalized = normalizePaginated(data)
    items.push(...normalized.items)
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

function reservationDayKey(reservation: ReservationDto): string {
  return reservation.reservationDate.slice(0, 10)
}

/** Ownership reservations for one calendar day (client-filtered from list pages). */
export function useCalendarDayReservationsQuery(date: string, enabled = true) {
  const { selectedRestaurantId } = useRestaurantScope()

  return useQuery({
    queryKey: reservationKeys.calendarDay(date, selectedRestaurantId),
    enabled: enabled && Boolean(date),
    queryFn: async ({ signal }) => {
      const items = await fetchOwnedReservations(signal, selectedRestaurantId)
      const dayKey = date.slice(0, 10)
      return items.filter((reservation) => reservationDayKey(reservation) === dayKey)
    },
  })
}

/** Ownership reservations within an inclusive YYYY-MM-DD range. */
export function useCalendarRangeReservationsQuery(
  from: string,
  to: string,
  enabled = true,
) {
  const { selectedRestaurantId } = useRestaurantScope()

  return useQuery({
    queryKey: reservationKeys.calendarRange(from, to, selectedRestaurantId),
    enabled: enabled && Boolean(from) && Boolean(to),
    queryFn: async ({ signal }) => {
      const items = await fetchOwnedReservations(signal, selectedRestaurantId)
      return items.filter((reservation) => {
        const day = reservationDayKey(reservation)
        return day >= from && day <= to
      })
    },
  })
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

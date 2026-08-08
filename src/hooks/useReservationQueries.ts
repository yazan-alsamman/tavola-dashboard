import { useQuery } from '@tanstack/react-query'
import { getMyReservation, listMyReservations } from '@/api/reservations'
import { isApiError } from '@/api/errors'
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

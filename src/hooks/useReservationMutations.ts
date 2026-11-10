import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReservationInternalNote } from '@/api/reservations'
import { reservationKeys } from '@/lib/queryKeys'

/** Saves (or clears) the staff-only note, then refreshes every reservation list. */
export function useUpdateReservationInternalNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reservationId, internalNote }: { reservationId: string; internalNote: string | null }) =>
      updateReservationInternalNote(reservationId, internalNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelWaitlistEntry,
  joinWaitlist,
  listBranchWaitlist,
  promoteWaitlistEntry,
  type JoinWaitlistRequest,
} from '@/api/waitlist'
import { isApiError } from '@/api/errors'
import { waitlistKeys } from '@/lib/queryKeys'

/** The branch's queue for one day, refreshed every 30 s so other staff's changes show up. */
export function useBranchWaitlistQuery(
  restaurantId: string | null | undefined,
  branchId: string | null | undefined,
  date: string,
) {
  return useQuery({
    queryKey: waitlistKeys.branchDay(restaurantId ?? '', branchId ?? '', date),
    queryFn: ({ signal }) => listBranchWaitlist(restaurantId!, branchId!, { date }, signal),
    enabled: Boolean(restaurantId && branchId && date),
    refetchInterval: 30_000,
    retry: (failureCount, error) => {
      if (isApiError(error) && (error.status === 403 || error.status === 404)) {
        return false
      }
      return failureCount < 2
    },
  })
}

function useInvalidateWaitlist() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: waitlistKeys.all })
}

export function useJoinWaitlistMutation() {
  const invalidate = useInvalidateWaitlist()
  return useMutation({
    mutationFn: (body: JoinWaitlistRequest) => joinWaitlist(body),
    onSuccess: invalidate,
  })
}

export function usePromoteWaitlistEntryMutation() {
  const invalidate = useInvalidateWaitlist()
  return useMutation({
    mutationFn: (entryId: string) => promoteWaitlistEntry(entryId),
    onSuccess: invalidate,
  })
}

export function useCancelWaitlistEntryMutation() {
  const invalidate = useInvalidateWaitlist()
  return useMutation({
    mutationFn: (entryId: string) => cancelWaitlistEntry(entryId),
    onSuccess: invalidate,
  })
}

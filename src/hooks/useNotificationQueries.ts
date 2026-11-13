import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications'
import { notificationKeys } from '@/lib/queryKeys'

export function useNotificationsList(
  page = 1,
  pageSize = 20,
  unread?: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: notificationKeys.list(page, pageSize, unread),
    queryFn: ({ signal }) =>
      listNotifications({ page, pageSize, unread }, signal),
    enabled,
  })
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: ({ signal }) => getUnreadNotificationCount(signal),
    select: (data) => data.count,
    enabled,
  })
}

/** How often the shell re-checks for new notifications (customer messages). */
export const NOTIFICATION_WATCH_INTERVAL_MS = 20_000
/** Unread notifications looked at per check, newest first. */
const NOTIFICATION_WATCH_PAGE_SIZE = 20

/**
 * The newest unread notifications, refreshed in the background so the shell
 * can chime when a customer writes. The server has no staff socket feed yet,
 * so this polls.
 */
export function useUnreadNotificationsWatchQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.watch(),
    queryFn: ({ signal }) =>
      listNotifications(
        { page: 1, pageSize: NOTIFICATION_WATCH_PAGE_SIZE, unread: true },
        signal,
      ),
    select: (data) => data.items,
    enabled,
    refetchInterval: NOTIFICATION_WATCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: false,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}


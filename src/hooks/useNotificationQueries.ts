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

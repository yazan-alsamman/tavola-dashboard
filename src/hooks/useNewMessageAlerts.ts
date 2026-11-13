import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isStaffMessageReceived } from '@/api/notifications'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { useUnreadNotificationsWatchQuery } from '@/hooks/useNotificationQueries'
import { playChime } from '@/lib/chime'
import { messagingKeys, notificationKeys } from '@/lib/queryKeys'

/**
 * Chimes and shows an alert when a customer sends a message, then refreshes
 * the inbox, any open conversation and the notification badge. The first
 * load only records what is already unread, so opening the dashboard never
 * replays old messages.
 */
export function useNewMessageAlerts(): void {
  const { t } = useLocale()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useUnreadNotificationsWatchQuery(Boolean(user))
  const seenRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    const items = query.data
    if (!items) return
    if (seenRef.current === null) {
      seenRef.current = new Set(items.map((item) => item.id))
      return
    }
    const fresh = items.filter((item) => !seenRef.current!.has(item.id))
    if (fresh.length === 0) return
    fresh.forEach((item) => seenRef.current!.add(item.id))

    void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    void queryClient.invalidateQueries({ queryKey: [...notificationKeys.all, 'list'] })

    if (!fresh.some(isStaffMessageReceived)) return
    void queryClient.invalidateQueries({ queryKey: messagingKeys.all })
    playChime()
    toast('info', t.messaging.alerts.newTitle, t.messaging.alerts.newBody)
  }, [query.data, queryClient, t, toast])
}

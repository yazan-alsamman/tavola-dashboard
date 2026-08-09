import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOneSignalIdentityToken } from '@/api/notifications'
import { useAuth } from '@/context/AuthContext'

/**
 * Fetches OneSignal identity token after auth when `VITE_ONESIGNAL_APP_ID` is set.
 * Does not load a push SDK — only warms the identity endpoint for future integration.
 */
export function useOneSignalIdentityBootstrap(): void {
  const { isAuthenticated } = useAuth()
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() ?? ''
  const enabled = isAuthenticated && appId.length > 0

  const query = useQuery({
    queryKey: ['notifications', 'onesignal-identity', appId],
    queryFn: ({ signal }) => getOneSignalIdentityToken(signal),
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  useEffect(() => {
    if (!enabled || !query.data) return
    if (typeof window === 'undefined') return
    ;(window as Window & { __tavolaOneSignalIdentity?: unknown }).__tavolaOneSignalIdentity =
      query.data
  }, [enabled, query.data])
}

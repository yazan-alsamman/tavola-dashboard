import { useQuery } from '@tanstack/react-query'
import {
  getOrganizationSubscription,
  getOrganizationSubscriptionUsage,
} from '@/api/organizations'
import { useAuth } from '@/context/AuthContext'
import { orgKeys } from '@/lib/queryKeys'

function useCanViewOrganizationSubscription(): boolean {
  const { user } = useAuth()
  const role = user?.organization?.role
  return role === 'Owner' || role === 'Admin'
}

export function useOrganizationSubscriptionQuery(enabled = true) {
  const canView = useCanViewOrganizationSubscription()

  return useQuery({
    queryKey: orgKeys.subscription(),
    queryFn: ({ signal }) => getOrganizationSubscription(signal),
    enabled: enabled && canView,
  })
}

export function useOrganizationUsageQuery(enabled = true) {
  const canView = useCanViewOrganizationSubscription()

  return useQuery({
    queryKey: orgKeys.usage(),
    queryFn: ({ signal }) => getOrganizationSubscriptionUsage(signal),
    enabled: enabled && canView,
  })
}

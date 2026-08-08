import { apiRequest } from './client'

export interface OrganizationSubscriptionDto {
  [key: string]: unknown
}

export interface OrganizationSubscriptionUsageDto {
  [key: string]: unknown
}

export async function getOrganizationSubscription(
  signal?: AbortSignal,
): Promise<OrganizationSubscriptionDto> {
  return apiRequest<OrganizationSubscriptionDto>('/organizations/subscription', {
    signal,
  })
}

export async function getOrganizationSubscriptionUsage(
  signal?: AbortSignal,
): Promise<OrganizationSubscriptionUsageDto> {
  return apiRequest<OrganizationSubscriptionUsageDto>(
    '/organizations/subscription/usage',
    { signal },
  )
}

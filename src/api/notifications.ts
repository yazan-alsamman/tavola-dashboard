import { apiRequest } from './client'
import type { PaginatedData } from './types'

/** Notification list item — Postman captures `items[0].id` as notificationId. */
export interface NotificationDto {
  id: string
  title?: string | null
  body?: string | null
  type?: string | null
  readAt?: string | null
  createdAt?: string
  [key: string]: unknown
}

export interface ListNotificationsParams {
  page?: number
  pageSize?: number
  /** When true, only unread notifications. */
  unread?: boolean
}

export interface UnreadNotificationCountDto {
  count: number
}

export interface OneSignalIdentityTokenDto {
  /** May be null if Identity Verification is not configured. */
  token: string | null
}

export async function listNotifications(
  params: ListNotificationsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedData<NotificationDto>> {
  const limit = params.pageSize ?? 20
  return apiRequest<PaginatedData<NotificationDto>>('/notifications', {
    query: {
      page: params.page ?? 1,
      limit,
      // Only send when filtering; string "false" can fail boolean query validation.
      ...(params.unread === true ? { unread: true } : {}),
    },
    signal,
  })
}

export async function getUnreadNotificationCount(
  signal?: AbortSignal,
): Promise<UnreadNotificationCountDto> {
  return apiRequest<UnreadNotificationCountDto>('/notifications/unread-count', {
    signal,
  })
}

export async function getOneSignalIdentityToken(
  signal?: AbortSignal,
): Promise<OneSignalIdentityTokenDto> {
  return apiRequest<OneSignalIdentityTokenDto>('/notifications/identity-token', {
    signal,
  })
}

/** Idempotent. Non-owned / missing → 404. */
export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationDto | void> {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}

export async function markAllNotificationsRead(): Promise<unknown> {
  return apiRequest('/notifications/read-all', {
    method: 'PATCH',
  })
}

export interface BroadcastRestaurantNotificationRequest {
  title: string
  body: string
}

export interface BroadcastRestaurantNotificationResultDto {
  broadcastId: string
  totalRecipients: number
  [key: string]: unknown
}

/**
 * Owner/Admin — queue an in-app broadcast (202 Accepted).
 * Audience is platform-wide eligible customers; restaurantId is for auth/audit.
 */
export async function broadcastRestaurantNotification(
  restaurantId: string,
  body: BroadcastRestaurantNotificationRequest,
): Promise<BroadcastRestaurantNotificationResultDto> {
  return apiRequest<BroadcastRestaurantNotificationResultDto>(
    `/restaurants/${restaurantId}/notifications/broadcast`,
    {
      method: 'POST',
      body: {
        title: body.title,
        body: body.body,
      },
    },
  )
}

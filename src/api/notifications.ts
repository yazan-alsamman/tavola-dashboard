import { apiRequest } from './client'
import type { PaginatedData } from './types'

/** Notification list item — Postman captures `items[0].id` as notificationId. */
export interface NotificationDto {
  id: string
  title?: string | null
  body?: string | null
  type?: string | null
  /** Ids the notification points at, e.g. `conversationId`, `reservationId`. */
  data?: Record<string, unknown> | null
  readAt?: string | null
  createdAt?: string
  [key: string]: unknown
}

/**
 * Backend ADR-049: a customer wrote in one of the restaurant's conversations.
 * In-App only; `data.conversationId` names the conversation.
 */
export const STAFF_MESSAGE_RECEIVED = 'StaffMessageReceived'

export function isStaffMessageReceived(notification: NotificationDto): boolean {
  return notification.type === STAFF_MESSAGE_RECEIVED
}

/** The conversation a notification points at, if any. */
export function notificationConversationId(notification: NotificationDto): string | null {
  const value = notification.data?.conversationId
  return typeof value === 'string' && value.length > 0 ? value : null
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


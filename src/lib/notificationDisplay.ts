import {
  isStaffMessageReceived,
  notificationConversationId,
  type NotificationDto,
} from '@/api/notifications'
import type { TranslationKeys as Translations } from '@/i18n/en'

type StaffType = keyof Translations['notifications']['staff']

function isStaffType(
  type: string | null | undefined,
  t: Translations,
): type is StaffType {
  return type != null && Object.prototype.hasOwnProperty.call(t.notifications.staff, type)
}

function dataString(notification: NotificationDto, key: string): string | null {
  const value = notification.data?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Title and body to show for a notification. Restaurant-side types (backend
 * ADR-041/045/049) are written in the dashboard's language rather than the
 * recipient's profile language the server rendered them in, and a new
 * message names the customer who wrote (`data.senderName`). Anything else
 * keeps the server's text.
 */
export function notificationText(
  notification: NotificationDto,
  t: Translations,
): { title: string; body: string | null } {
  const senderName = isStaffMessageReceived(notification)
    ? dataString(notification, 'senderName')
    : null
  if (senderName) {
    return {
      title: t.notifications.messageFrom.replace('{name}', senderName),
      body: t.notifications.messageFromBody.replace('{name}', senderName),
    }
  }
  if (isStaffType(notification.type, t)) {
    return t.notifications.staff[notification.type]
  }
  return {
    title: notification.title ?? t.notifications.untitled,
    body: notification.body ?? null,
  }
}

/** Dashboard route a notification opens, or `null` when it points nowhere. */
export function notificationTarget(notification: NotificationDto): string | null {
  if (isStaffMessageReceived(notification)) {
    const conversationId = notificationConversationId(notification)
    return conversationId
      ? `/app/messaging?conversation=${encodeURIComponent(conversationId)}`
      : '/app/messaging'
  }
  switch (notification.type) {
    case 'StaffReservationCreated':
    case 'StaffReservationCancelled': {
      const reservationId = dataString(notification, 'reservationId')
      return reservationId
        ? `/app/reservations/${encodeURIComponent(reservationId)}`
        : '/app/reservations'
    }
    case 'StaffWaitlistEntryCreated':
      return '/app/reservations?tab=waitlist'
    case 'StaffReviewCreated':
    case 'StaffLowReviewCreated':
      return '/app/reviews'
    default:
      return null
  }
}

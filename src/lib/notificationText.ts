import type { NotificationDto } from '@/api/notifications'

/**
 * Restaurant-side notification types the backend creates from fixed seeded
 * templates (backend ADR-041/045/049). The server snapshots their title/body
 * in the recipient account's stored language at creation time, which does not
 * follow the dashboard's language switch, so the dashboard words them itself.
 */
export const KNOWN_STAFF_NOTIFICATION_TYPES = [
  'StaffReservationCreated',
  'StaffReservationCancelled',
  'StaffWaitlistEntryCreated',
  'StaffReviewCreated',
  'StaffLowReviewCreated',
  'StaffMessageReceived',
] as const
export type KnownStaffNotificationType = (typeof KNOWN_STAFF_NOTIFICATION_TYPES)[number]

export type NotificationTypeWords = Record<
  KnownStaffNotificationType,
  { title: string; body: string }
>

function isKnown(type: string | null | undefined): type is KnownStaffNotificationType {
  return (
    typeof type === 'string' &&
    (KNOWN_STAFF_NOTIFICATION_TYPES as readonly string[]).includes(type)
  )
}

/**
 * Title and body in the selected language. Free-text notifications (platform
 * or organization broadcasts) and any type the dashboard does not know yet
 * keep the text the server sends.
 */
export function notificationText(
  notification: Pick<NotificationDto, 'type' | 'title' | 'body'>,
  words: NotificationTypeWords,
  untitled: string,
): { title: string; body: string | null } {
  if (isKnown(notification.type)) {
    return words[notification.type]
  }
  return {
    title: notification.title || untitled,
    body: notification.body || null,
  }
}

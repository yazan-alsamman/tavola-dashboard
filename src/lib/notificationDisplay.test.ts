import { describe, expect, it } from 'vitest'
import { ar } from '@/i18n/ar'
import { en } from '@/i18n/en'
import type { NotificationDto } from '@/api/notifications'
import { notificationTarget, notificationText } from '@/lib/notificationDisplay'

const message = (data: Record<string, unknown>): NotificationDto => ({
  id: 'n1',
  type: 'StaffMessageReceived',
  title: 'New message',
  body: 'A customer sent you a message.',
  data,
})

describe('notificationText', () => {
  it('names the customer who wrote, in the dashboard language', () => {
    const n = message({ conversationId: 'c1', senderName: 'Lina Haddad' })
    expect(notificationText(n, ar).title).toBe('رسالة جديدة من Lina Haddad')
    expect(notificationText(n, en).title).toBe('New message from Lina Haddad')
  })

  it('falls back to the localized generic text when the sender is unknown', () => {
    expect(notificationText(message({ conversationId: 'c1' }), ar)).toEqual({
      title: 'رسالة جديدة',
      body: 'أرسل لك زبون رسالة.',
    })
  })

  it('keeps the server text for types the dashboard does not know', () => {
    const n: NotificationDto = { id: 'n2', type: 'PlatformAdminBroadcast', title: 'Hi', body: 'B' }
    expect(notificationText(n, ar)).toEqual({ title: 'Hi', body: 'B' })
  })
})

describe('notificationTarget', () => {
  it('opens the conversation of a new message', () => {
    expect(notificationTarget(message({ conversationId: 'c 1' }))).toBe(
      '/app/messaging?conversation=c%201',
    )
  })

  it('opens the booking, the waitlist or the reviews', () => {
    expect(
      notificationTarget({ id: 'a', type: 'StaffReservationCreated', data: { reservationId: 'r1' } }),
    ).toBe('/app/reservations/r1')
    expect(notificationTarget({ id: 'b', type: 'StaffWaitlistEntryCreated' })).toBe(
      '/app/reservations?tab=waitlist',
    )
    expect(notificationTarget({ id: 'c', type: 'StaffLowReviewCreated' })).toBe('/app/reviews')
    expect(notificationTarget({ id: 'd', type: 'PlatformAdminBroadcast' })).toBeNull()
  })
})

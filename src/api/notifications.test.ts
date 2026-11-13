import { describe, expect, it } from 'vitest'
import {
  STAFF_MESSAGE_RECEIVED,
  isStaffMessageReceived,
  notificationConversationId,
  type NotificationDto,
} from './notifications'

const conversationId = '11111111-1111-4111-8111-111111111111'

function notification(overrides: Partial<NotificationDto>): NotificationDto {
  return { id: 'n1', title: 'New message', body: 'A customer sent you a message.', ...overrides }
}

describe('staff message notifications (backend ADR-049)', () => {
  it('recognises a customer message and reads its conversation', () => {
    const item = notification({
      type: STAFF_MESSAGE_RECEIVED,
      data: { conversationId, restaurantId: 'r1' },
    })
    expect(isStaffMessageReceived(item)).toBe(true)
    expect(notificationConversationId(item)).toBe(conversationId)
  })

  it('ignores other types and missing or malformed data', () => {
    expect(isStaffMessageReceived(notification({ type: 'StaffReservationCreated' }))).toBe(false)
    expect(notificationConversationId(notification({ data: null }))).toBeNull()
    expect(notificationConversationId(notification({ data: { conversationId: 42 } }))).toBeNull()
    expect(notificationConversationId(notification({}))).toBeNull()
  })
})

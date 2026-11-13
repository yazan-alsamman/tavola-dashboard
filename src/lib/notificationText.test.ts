import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { ar } from '@/i18n/ar'
import { KNOWN_STAFF_NOTIFICATION_TYPES, notificationText } from './notificationText'

describe('notificationText', () => {
  it('words a known staff type in the selected language, ignoring the stored English text', () => {
    const n = { type: 'StaffReservationCreated', title: 'New reservation', body: 'A customer booked a table from the app.' }
    expect(notificationText(n, ar.notifications.types, ar.notifications.untitled)).toEqual(
      ar.notifications.types.StaffReservationCreated,
    )
    expect(notificationText(n, en.notifications.types, en.notifications.untitled)).toEqual(
      en.notifications.types.StaffReservationCreated,
    )
  })

  it('has Arabic and English words for every known type', () => {
    for (const type of KNOWN_STAFF_NOTIFICATION_TYPES) {
      expect(ar.notifications.types[type].title).not.toBe('')
      expect(en.notifications.types[type].title).not.toBe('')
    }
  })

  it('keeps the server text for a broadcast or an unknown type', () => {
    const n = { type: 'PlatformAdminBroadcast', title: 'Maintenance tonight', body: 'Back at 2am' }
    expect(notificationText(n, ar.notifications.types, ar.notifications.untitled)).toEqual({
      title: 'Maintenance tonight',
      body: 'Back at 2am',
    })
  })

  it('falls back to the untitled label when the server sends no title', () => {
    expect(notificationText({ type: null, title: null, body: null }, ar.notifications.types, 'إشعار')).toEqual({
      title: 'إشعار',
      body: null,
    })
  })
})

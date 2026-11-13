import type { WorkingHoursEntry } from '@/api/restaurants'

/** One weekday in the editor. A closed day is sent to the backend as no row. */
export interface WeekdayHours {
  dayOfWeek: number
  open: boolean
  openingTime: string
  closingTime: string
  breakStartTime: string | null
  breakEndTime: string | null
}

const DEFAULT_OPENING = '09:00'
const DEFAULT_CLOSING = '22:00'

/** Days 0 (Sunday) to 6 (Saturday), the backend's numbering; a day with no row is closed. */
export function entriesToWeek(entries: WorkingHoursEntry[]): WeekdayHours[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const found = entries.find((e) => e.dayOfWeek === dayOfWeek)
    return found
      ? {
          dayOfWeek,
          open: true,
          openingTime: found.openingTime,
          closingTime: found.closingTime,
          breakStartTime: found.breakStartTime,
          breakEndTime: found.breakEndTime,
        }
      : {
          dayOfWeek,
          open: false,
          openingTime: DEFAULT_OPENING,
          closingTime: DEFAULT_CLOSING,
          breakStartTime: null,
          breakEndTime: null,
        }
  })
}

/** The full-replace body: one entry per open day. */
export function weekToEntries(week: WeekdayHours[]): WorkingHoursEntry[] {
  return week
    .filter((day) => day.open)
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      openingTime: day.openingTime,
      closingTime: day.closingTime,
      breakStartTime: day.breakStartTime,
      breakEndTime: day.breakEndTime,
    }))
}

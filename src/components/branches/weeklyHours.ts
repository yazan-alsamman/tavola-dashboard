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

/**
 * The order the editor shows the days in: the week starts on Saturday, as in
 * Syria and the region. Numbers are the backend's, 0 (Sunday) to 6 (Saturday).
 */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const

/** One row per day in `WEEK_ORDER`; a day with no backend row is closed. */
export function entriesToWeek(entries: WorkingHoursEntry[]): WeekdayHours[] {
  return WEEK_ORDER.map((dayOfWeek) => {
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

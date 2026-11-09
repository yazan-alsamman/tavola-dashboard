/** Shown when the branch's hours for the day are unknown (past dates, no access). */
export const FALLBACK_HOURS = { from: 10, to: 23 } as const

function hourOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return null
  return Number(match[1])
}

/**
 * Whole hours to draw for a day from the branch's `HH:mm` opening and
 * closing times. A closing time after midnight (e.g. 01:00) runs the day to
 * 23:00. Returns null when the branch is closed or the times are unusable.
 */
export function hoursForSchedule(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
): number[] | null {
  if (!openingTime || !closingTime) return null
  const open = hourOf(openingTime)
  const close = hourOf(closingTime)
  if (open === null || close === null) return null
  const closeMinutes = Number(closingTime.slice(-2))
  const last = close <= open ? 23 : closeMinutes > 0 ? close : close - 1
  const hours: number[] = []
  for (let hour = open; hour <= Math.min(last, 23); hour += 1) hours.push(hour)
  return hours.length > 0 ? hours : null
}

export function fallbackHours(): number[] {
  return Array.from(
    { length: FALLBACK_HOURS.to - FALLBACK_HOURS.from + 1 },
    (_, i) => FALLBACK_HOURS.from + i,
  )
}

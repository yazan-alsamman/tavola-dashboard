/**
 * Convert a wall-clock datetime in a specific IANA timezone to an ISO UTC string.
 * `localDateTime` is `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` (no offset).
 *
 * Strategy: binary-search the UTC instant whose formatted parts in `timeZone`
 * match the requested wall clock (handles DST). Timestamps are stored in UTC
 * on the backend; branch timezone is the operational clock for staff UX.
 */
export function branchLocalDateTimeToUtcIso(
  localDateTime: string,
  timeZone: string,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    localDateTime.trim(),
  )
  if (!match) {
    throw new Error(`Invalid local datetime: "${localDateTime}"`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? '0')

  const targetAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second)

  let lo = targetAsUtcMs - 14 * 60 * 60 * 1000
  let hi = targetAsUtcMs + 14 * 60 * 60 * 1000

  for (let i = 0; i < 40; i += 1) {
    const mid = Math.floor((lo + hi) / 2)
    const parts = getZonedParts(mid, timeZone)
    const cmp = compareParts(parts, { year, month, day, hour, minute, second })
    if (cmp === 0) {
      return new Date(mid).toISOString()
    }
    if (cmp < 0) lo = mid + 1
    else hi = mid - 1
  }

  throw new Error(
    `Could not resolve "${localDateTime}" in timezone "${timeZone}"`,
  )
}

/** Format a UTC ISO instant for display in a branch timezone. */
export function formatInstantInTimeZone(
  isoUtc: string,
  timeZone: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(isoUtc)
  if (Number.isNaN(date.getTime())) return isoUtc
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date)
}

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getZonedParts(utcMs: number, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const map = Object.fromEntries(
    formatter.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]),
  )
  let hour = Number(map.hour)
  if (hour === 24) hour = 0
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

function compareParts(a: ZonedParts, b: ZonedParts): number {
  return (
    a.year - b.year ||
    a.month - b.month ||
    a.day - b.day ||
    a.hour - b.hour ||
    a.minute - b.minute ||
    a.second - b.second
  )
}

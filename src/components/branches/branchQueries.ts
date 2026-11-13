/** Query keys for per-branch resources (rules, closures). */
export function branchSettingsKey(restaurantId: string, branchId: string) {
  return ['restaurants', restaurantId, 'branches', branchId, 'settings'] as const
}

export function branchClosuresKey(restaurantId: string, branchId: string) {
  return ['restaurants', restaurantId, 'branches', branchId, 'closures'] as const
}

/** A calendar date (YYYY-MM-DD) shown in the user's language, never shifted by time zone. */
export function formatCalendarDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  )
}

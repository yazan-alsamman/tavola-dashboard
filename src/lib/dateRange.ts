/** Default analytics window: last 30 days through today (UTC dates YYYY-MM-DD). */

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function defaultAnalyticsRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 30)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

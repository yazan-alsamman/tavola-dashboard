/** Words for a length of time, from `t.common.durations` in the selected language. */
export interface DurationWords {
  minutes: string
  hour: string
  hourAndHalf: string
  twoHours: string
  twoHoursAndHalf: string
  hoursFew: string
  hoursMany: string
  hoursAndHalf: string
  day: string
  days: string
}

function fill(template: string, n: number): string {
  return template.replace('{n}', String(n))
}

/**
 * A natural label for a preset length: "30 دقيقة", "ساعة ونصف", "ساعتان",
 * "3 ساعات", "يوم". `hoursFew` covers 3-10 (Arabic plural), `hoursMany` 11+.
 */
export function formatDuration(minutes: number, words: DurationWords): string {
  if (minutes > 0 && minutes % 1440 === 0) {
    const days = minutes / 1440
    return days === 1 ? words.day : fill(words.days, days)
  }
  if (minutes < 60 || minutes % 30 !== 0) return fill(words.minutes, minutes)
  const hours = Math.floor(minutes / 60)
  const half = minutes % 60 === 30
  if (half) {
    if (hours === 1) return words.hourAndHalf
    if (hours === 2) return words.twoHoursAndHalf
    return fill(words.hoursAndHalf, hours)
  }
  if (hours === 1) return words.hour
  if (hours === 2) return words.twoHours
  return fill(hours <= 10 ? words.hoursFew : words.hoursMany, hours)
}

/** The presets, plus the saved value when it is not one of them, sorted. */
export function withCurrent(presets: readonly number[], current: number): number[] {
  return presets.includes(current) ? [...presets] : [...presets, current].sort((a, b) => a - b)
}

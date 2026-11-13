import { describe, expect, it } from 'vitest'
import { formatDuration, withCurrent, type DurationWords } from './durationLabel'

const ar: DurationWords = {
  minutes: '{n} دقيقة',
  hour: 'ساعة',
  hourAndHalf: 'ساعة ونصف',
  twoHours: 'ساعتان',
  twoHoursAndHalf: 'ساعتان ونصف',
  hoursFew: '{n} ساعات',
  hoursMany: '{n} ساعة',
  hoursAndHalf: '{n} ساعات ونصف',
  day: 'يوم',
  days: '{n} أيام',
}

describe('formatDuration', () => {
  it('reads like the spec in Arabic', () => {
    expect(formatDuration(15, ar)).toBe('15 دقيقة')
    expect(formatDuration(60, ar)).toBe('ساعة')
    expect(formatDuration(90, ar)).toBe('ساعة ونصف')
    expect(formatDuration(120, ar)).toBe('ساعتان')
    expect(formatDuration(180, ar)).toBe('3 ساعات')
    expect(formatDuration(150, ar)).toBe('ساعتان ونصف')
    expect(formatDuration(210, ar)).toBe('3 ساعات ونصف')
    expect(formatDuration(720, ar)).toBe('12 ساعة')
    expect(formatDuration(1440, ar)).toBe('يوم')
    expect(formatDuration(45, ar)).toBe('45 دقيقة')
  })

  it('keeps a saved value that is not a preset', () => {
    expect(withCurrent([15, 30], 20)).toEqual([15, 20, 30])
    expect(withCurrent([15, 30], 30)).toEqual([15, 30])
  })
})

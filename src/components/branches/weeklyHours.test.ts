import { describe, expect, it } from 'vitest'
import { entriesToWeek, weekToEntries } from './weeklyHours'

describe('weekly hours', () => {
  it('marks weekdays without a row as closed and sends only open days back', () => {
    const week = entriesToWeek([
      {
        dayOfWeek: 5,
        openingTime: '12:00',
        closingTime: '01:00',
        breakStartTime: null,
        breakEndTime: null,
      },
    ])

    expect(week).toHaveLength(7)
    expect(week.filter((day) => day.open).map((day) => day.dayOfWeek)).toEqual([5])
    expect(weekToEntries(week)).toEqual([
      {
        dayOfWeek: 5,
        openingTime: '12:00',
        closingTime: '01:00',
        breakStartTime: null,
        breakEndTime: null,
      },
    ])
  })

  it('sends a newly opened day with its times', () => {
    const week = entriesToWeek([]).map((day) =>
      day.dayOfWeek === 0 ? { ...day, open: true } : day,
    )
    expect(weekToEntries(week)).toEqual([
      {
        dayOfWeek: 0,
        openingTime: '09:00',
        closingTime: '22:00',
        breakStartTime: null,
        breakEndTime: null,
      },
    ])
  })
})

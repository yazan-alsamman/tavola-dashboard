import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import type { WeekdayHours } from './weeklyHours'

interface WeeklyHoursEditorProps {
  value: WeekdayHours[]
  onChange: (next: WeekdayHours[]) => void
  disabled?: boolean
}

/** Seven rows, one per weekday, each with an open switch and opening/closing times. */
export function WeeklyHoursEditor({ value, onChange, disabled }: WeeklyHoursEditorProps) {
  const { t } = useLocale()
  const labels = t.branches.hours

  const update = (dayOfWeek: number, patch: Partial<WeekdayHours>) => {
    onChange(value.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)))
  }

  return (
    <div className="space-y-2">
      {value.map((day) => (
        <div
          key={day.dayOfWeek}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/60 px-3 py-2"
        >
          <span className="w-24 text-sm font-medium text-on-surface">
            {labels.weekdays[day.dayOfWeek]}
          </span>
          <label className="flex min-h-11 items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={day.open}
              disabled={disabled}
              onChange={(e) => update(day.dayOfWeek, { open: e.target.checked })}
            />
            {day.open ? labels.open : labels.closed}
          </label>
          {day.open && (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                aria-label={labels.opensAt}
                value={day.openingTime}
                className="w-32"
                disabled={disabled}
                required
                onChange={(e) => update(day.dayOfWeek, { openingTime: e.target.value })}
              />
              <span className="text-sm text-on-surface-variant">{t.branches.to}</span>
              <Input
                type="time"
                aria-label={labels.closesAt}
                value={day.closingTime}
                className="w-32"
                disabled={disabled}
                required
                onChange={(e) => update(day.dayOfWeek, { closingTime: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}
      <p className="text-label-sm text-on-surface-variant">{labels.overnightHint}</p>
    </div>
  )
}

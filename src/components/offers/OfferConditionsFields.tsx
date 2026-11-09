import { OFFER_WEEK_DAYS, type OfferConditions } from '@/api/offers'
import type { BranchDto } from '@/api/branches'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'

interface OfferConditionsFieldsProps {
  value: OfferConditions
  onChange: (next: OfferConditions) => void
  branches: BranchDto[]
  formatBranchLabel: (branch: BranchDto) => string
}

function toPositiveIntOrNull(raw: string): number | null {
  const value = Number(raw)
  return raw.trim() && Number.isInteger(value) && value >= 1 ? value : null
}

/** ADR-047: days, hours and booking conditions of an offer. */
export function OfferConditionsFields({
  value,
  onChange,
  branches,
  formatBranchLabel,
}: OfferConditionsFieldsProps) {
  const { t } = useLocale()
  const copy = t.offers
  const fields = copy.fields
  const hasHours = value.startTime !== null && value.endTime !== null

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

  return (
    <>
      <fieldset className="space-y-3 rounded-xl border border-outline-variant/40 p-4">
        <legend className="px-1 text-sm font-semibold text-on-surface">{fields.daysTitle}</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label={fields.daysTitle}>
          {OFFER_WEEK_DAYS.map((day) => {
            const active = value.daysOfWeek.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...value, daysOfWeek: toggle(value.daysOfWeek, day) })}
                className={cn(
                  'min-h-11 rounded-lg px-3 text-label-md transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high',
                )}
              >
                {copy.weekdaysShort[day]}
              </button>
            )
          })}
        </div>
        <p className="text-label-sm text-on-surface-variant">{fields.daysHint}</p>

        <label className="flex min-h-11 items-center gap-2 text-body-md text-on-surface">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={!hasHours}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { ...value, startTime: null, endTime: null }
                  : { ...value, startTime: '12:00', endTime: '16:00' },
              )
            }
          />
          {fields.allDay}
        </label>
        {hasHours && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{fields.startTime}</span>
              <Input
                type="time"
                value={value.startTime ?? ''}
                onChange={(e) => onChange({ ...value, startTime: e.target.value || null })}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{fields.endTime}</span>
              <Input
                type="time"
                value={value.endTime ?? ''}
                onChange={(e) => onChange({ ...value, endTime: e.target.value || null })}
                required
              />
            </label>
            <p className="col-span-2 text-label-sm text-on-surface-variant">{fields.hoursHint}</p>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-outline-variant/40 p-4">
        <legend className="px-1 text-sm font-semibold text-on-surface">
          {fields.conditionsTitle}
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">{fields.minPartySize}</span>
            <Input
              type="number"
              min={1}
              step={1}
              value={value.minPartySize ?? ''}
              placeholder="—"
              onChange={(e) => onChange({ ...value, minPartySize: toPositiveIntOrNull(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-on-surface-variant">{fields.bookingCap}</span>
            <Input
              type="number"
              min={1}
              step={1}
              value={value.bookingCap ?? ''}
              placeholder={fields.noLimit}
              onChange={(e) => onChange({ ...value, bookingCap: toPositiveIntOrNull(e.target.value) })}
            />
          </label>
        </div>

        <label className="flex min-h-11 items-center gap-2 text-body-md text-on-surface">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={value.oncePerCustomer}
            onChange={(e) => onChange({ ...value, oncePerCustomer: e.target.checked })}
          />
          {fields.oncePerCustomer}
        </label>

        {branches.length > 1 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-on-surface-variant">{fields.branches}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={fields.branches}>
              <button
                type="button"
                aria-pressed={value.branchIds.length === 0}
                onClick={() => onChange({ ...value, branchIds: [] })}
                className={cn(
                  'min-h-11 rounded-lg px-3 text-label-md',
                  value.branchIds.length === 0
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant',
                )}
              >
                {fields.allBranches}
              </button>
              {branches.map((branch) => {
                const active = value.branchIds.includes(branch.branchId)
                return (
                  <button
                    key={branch.branchId}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChange({ ...value, branchIds: toggle(value.branchIds, branch.branchId) })
                    }
                    className={cn(
                      'min-h-11 rounded-lg px-3 text-label-md',
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant',
                    )}
                  >
                    {formatBranchLabel(branch)}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <p className="text-label-sm text-on-surface-variant">{fields.conditionsHint}</p>
      </fieldset>
    </>
  )
}

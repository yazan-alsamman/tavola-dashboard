import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBranchSettings,
  updateBranchSettings,
  type BranchSettingsWriteRequest,
} from '@/api/branches'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { ErrorState } from '@/components/ui/ErrorState'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { apiErrorText } from '@/lib/apiErrorText'
import { formatDuration, withCurrent } from '@/lib/durationLabel'

/** Preset choices from the product spec, in minutes. */
const DURATIONS = [60, 90, 120, 150, 180] as const
const INTERVALS = [15, 30] as const
const CANCELLATION_WINDOWS = [0, 60, 120, 180, 360, 720, 1440] as const
const PENDING_TIMEOUTS = [5, 10, 15, 30, 60] as const
const REMINDERS = [30, 60, 120, 180, 1440] as const
const LATE_GRACE = [5, 10, 15, 20, 30] as const

function branchSettingsKey(restaurantId: string, branchId: string) {
  return ['restaurants', restaurantId, 'branches', branchId, 'settings'] as const
}

interface BranchRulesFormProps {
  restaurantId: string
  branchId: string
  onDone: () => void
}

/** One branch's reservation rules (backend ADR-051), with ready-made choices. */
export function BranchRulesForm({ restaurantId, branchId, onDone }: BranchRulesFormProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const labels = t.branches.rules
  const words = t.common.durations
  const [form, setForm] = useState<BranchSettingsWriteRequest | null>(null)

  const query = useQuery({
    queryKey: branchSettingsKey(restaurantId, branchId),
    queryFn: ({ signal }) => getBranchSettings(restaurantId, branchId, signal),
  })

  useEffect(() => {
    if (!query.data) return
    const { branchId: _branchId, updatedAt: _updatedAt, ...rules } = query.data
    setForm(rules)
  }, [query.data])

  const mutation = useMutation({
    mutationFn: (body: BranchSettingsWriteRequest) =>
      updateBranchSettings(restaurantId, branchId, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(branchSettingsKey(restaurantId, branchId), saved)
      toast('success', t.common.save)
      onDone()
    },
    onError: (err) => toast('error', apiErrorText(err, t, t.login.errors.unknown)),
  })

  if (query.isError) {
    return (
      <ErrorState
        size="inline"
        title={labels.title}
        description={apiErrorText(query.error, t, t.login.errors.unknown)}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!form) {
    return <p className="py-6 text-center text-sm text-on-surface-variant">{t.common.loading}</p>
  }

  const set = <K extends keyof BranchSettingsWriteRequest>(
    key: K,
    value: BranchSettingsWriteRequest[K],
  ) => setForm({ ...form, [key]: value })

  const minutesSelect = (
    key:
      | 'defaultReservationDurationMinutes'
      | 'reservationIntervalMinutes'
      | 'cancellationWindowMinutes'
      | 'pendingReservationTimeoutMinutes'
      | 'reservationReminderMinutesBefore'
      | 'lateArrivalGraceMinutes',
    label: string,
    presets: readonly number[],
    optionLabel: (minutes: number) => string = (m) => formatDuration(m, words),
  ) => (
    <Select
      label={label}
      value={form[key]}
      disabled={mutation.isPending}
      onChange={(e) => set(key, Number(e.target.value))}
    >
      {withCurrent(presets, form[key]).map((minutes) => (
        <option key={minutes} value={minutes}>
          {optionLabel(minutes)}
        </option>
      ))}
    </Select>
  )

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate(form)
      }}
    >
      <p className="text-sm text-on-surface-variant">{labels.subtitle}</p>
      <Input
        label={labels.maxGuests}
        type="number"
        min={1}
        max={100}
        required
        value={form.maxGuestsPerReservation}
        disabled={mutation.isPending}
        onChange={(e) => set('maxGuestsPerReservation', Number(e.target.value) || 1)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {minutesSelect('defaultReservationDurationMinutes', labels.duration, DURATIONS)}
        {minutesSelect('reservationIntervalMinutes', labels.interval, INTERVALS)}
      </div>
      {minutesSelect(
        'cancellationWindowMinutes',
        labels.cancellationWindow,
        CANCELLATION_WINDOWS,
        (m) =>
          m === 0
            ? labels.cancelAnyTime
            : labels.cancelUntil.replace('{d}', formatDuration(m, words)),
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {minutesSelect(
          'pendingReservationTimeoutMinutes',
          labels.pendingTimeout,
          PENDING_TIMEOUTS,
        )}
        {minutesSelect('lateArrivalGraceMinutes', labels.lateGrace, LATE_GRACE)}
      </div>
      {minutesSelect(
        'reservationReminderMinutesBefore',
        labels.reminder,
        REMINDERS,
        (m) => labels.reminderBefore.replace('{d}', formatDuration(m, words)),
      )}
      <label className="flex min-h-11 items-center gap-2 text-sm text-on-surface">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={form.autoApproval}
          disabled={mutation.isPending}
          onChange={(e) => set('autoApproval', e.target.checked)}
        />
        {labels.autoApproval}
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  )
}

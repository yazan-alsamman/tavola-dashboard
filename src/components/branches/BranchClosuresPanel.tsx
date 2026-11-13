import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBranchClosure,
  deleteBranchClosure,
  listBranchClosures,
  type BranchClosureDto,
} from '@/api/branches'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { apiErrorText } from '@/lib/apiErrorText'
import { branchClosuresKey, formatCalendarDate } from './branchQueries'

interface BranchClosuresPanelProps {
  restaurantId: string
  branchId: string
}

/** Backend ADR-053: close a branch for some dates without editing its weekly hours. */
export function BranchClosuresPanel({ restaurantId, branchId }: BranchClosuresPanelProps) {
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const labels = t.branches.closures
  const key = branchClosuresKey(restaurantId, branchId)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listBranchClosures(restaurantId, branchId, signal),
  })

  const onError = (err: unknown) => toast('error', apiErrorText(err, t, t.login.errors.unknown))
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: () =>
      createBranchClosure(restaurantId, branchId, {
        startDate,
        endDate: endDate || startDate,
        reason: reason.trim() || null,
      }),
    onSuccess: () => {
      setStartDate('')
      setEndDate('')
      setReason('')
      toast('success', labels.added)
      void refresh()
    },
    onError,
  })

  const remove = useMutation({
    mutationFn: (closureId: string) => deleteBranchClosure(restaurantId, branchId, closureId),
    onSuccess: () => {
      toast('success', labels.removed)
      void refresh()
    },
    onError,
  })

  const rangeLabel = (closure: BranchClosureDto) =>
    closure.startDate === closure.endDate
      ? formatCalendarDate(closure.startDate, locale)
      : labels.range
          .replace('{from}', formatCalendarDate(closure.startDate, locale))
          .replace('{to}', formatCalendarDate(closure.endDate, locale))

  const invalidRange = Boolean(endDate) && endDate < startDate

  return (
    <div className="space-y-5">
      <p className="text-sm text-on-surface-variant">{labels.subtitle}</p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!startDate || invalidRange) return
          create.mutate()
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={labels.start}
            type="date"
            required
            value={startDate}
            disabled={create.isPending}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label={labels.end}
            type="date"
            min={startDate || undefined}
            value={endDate}
            disabled={create.isPending}
            error={invalidRange ? labels.invalidRange : undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Input
          label={labels.reason}
          maxLength={200}
          value={reason}
          disabled={create.isPending}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={create.isPending || !startDate || invalidRange}>
            {create.isPending ? t.common.loading : labels.add}
          </Button>
        </div>
      </form>

      <section aria-label={labels.listTitle} className="space-y-2">
        <h3 className="text-sm font-semibold text-on-surface">{labels.listTitle}</h3>
        {query.isError ? (
          <ErrorState
            size="inline"
            title={labels.listTitle}
            description={apiErrorText(query.error, t, t.login.errors.unknown)}
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading ? (
          <p className="text-sm text-on-surface-variant">{t.common.loading}</p>
        ) : (query.data ?? []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">{labels.empty}</p>
        ) : (
          <ul className="divide-y divide-outline-variant/60 rounded-lg border border-outline-variant/60">
            {(query.data ?? []).map((closure) => (
              <li key={closure.closureId} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface">{rangeLabel(closure)}</p>
                  {closure.reason && (
                    <p className="text-sm text-on-surface-variant truncate">{closure.reason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(closure.closureId)}
                >
                  {labels.remove}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

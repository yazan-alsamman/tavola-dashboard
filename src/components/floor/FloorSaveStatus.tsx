import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'

export type FloorSaveState = 'saved' | 'unsaved' | 'saving' | 'failed'

interface FloorSaveStatusProps {
  state: FloorSaveState
  onRetry?: () => void
  retryLabel?: string
}

export function FloorSaveStatus({ state, onRetry, retryLabel }: FloorSaveStatusProps) {
  const { t } = useLocale()
  const label = {
    saved: t.floorPlan.saveSaved,
    unsaved: t.floorPlan.saveUnsaved,
    saving: t.floorPlan.saveSaving,
    failed: t.floorPlan.saveFailed,
  }[state]
  const icon = {
    saved: 'check_circle',
    unsaved: 'edit',
    saving: 'sync',
    failed: 'error',
  }[state]

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold',
        state === 'saved' && 'bg-success/10 text-success',
        state === 'unsaved' && 'bg-warning-light text-warning',
        state === 'saving' && 'bg-primary/10 text-primary',
        state === 'failed' && 'bg-error/10 text-error',
      )}
      role="status"
      data-save-state={state}
    >
      <MaterialIcon
        name={icon}
        size={16}
        className={state === 'saving' ? 'animate-spin' : undefined}
      />
      {label}
      {state === 'failed' && onRetry && retryLabel && (
        <button type="button" className="ms-1 min-h-11 underline underline-offset-2" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </p>
  )
}

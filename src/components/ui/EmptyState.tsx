import { MaterialIcon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  /** Secondary escape hatch, e.g. "Clear filters". */
  secondaryAction?: React.ReactNode
  /** `compact` sits inside a card. `inline` fills a table. `page` is a blank screen. */
  size?: 'compact' | 'inline' | 'page'
  className?: string
}

/**
 * Explains what is missing and what to do next — never just "no results".
 * The icon sits on a soft brand wash so the block reads as intentional
 * rather than as a failed render.
 */
export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
  secondaryAction,
  size = 'inline',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        size === 'page' && 'py-20',
        size === 'inline' && 'py-14',
        size === 'compact' && 'py-6',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-primary-subtle text-primary',
          'ring-1 ring-primary-border/60',
          size === 'page' && 'h-16 w-16',
          size === 'inline' && 'h-12 w-12',
          size === 'compact' && 'h-8 w-8',
        )}
      >
        <MaterialIcon name={icon} size={size === 'page' ? 28 : size === 'compact' ? 16 : 22} />
      </div>

      <h3
        className={cn(
          'text-on-surface',
          size === 'page' && 'text-headline-md mt-5',
          size === 'inline' && 'text-headline-sm mt-5',
          size === 'compact' && 'text-label-lg mt-3',
        )}
      >
        {title}
      </h3>

      {description && (
        <p className="text-body-md text-on-surface-variant mt-2 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

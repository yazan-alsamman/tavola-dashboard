import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  trend?: { value: number; label: string }
  /** Set when a decrease is the good outcome (no-shows, cancellations). */
  trendPolarity?: 'up-is-good' | 'down-is-good'
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  /** Quiet metrics recede. Loud is the one number that needs a decision. */
  emphasis?: 'quiet' | 'default' | 'loud'
  /** Contextual action, e.g. a link into the underlying list. */
  action?: React.ReactNode
  className?: string
}

const iconAccent = {
  default: 'text-on-surface-variant',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/**
 * Reads label → value → change → context, so the number leads and everything
 * else supports it. The icon is a quiet wayfinding cue, not the focal point;
 * colour is reserved for the delta, where it carries meaning.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPolarity = 'up-is-good',
  variant = 'default',
  emphasis = 'default',
  action,
  className,
}: StatCardProps) {
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[%\s,]/g, ''))
  const quietZero = Number.isFinite(numeric) && numeric === 0 && emphasis !== 'loud'
  const level = quietZero ? 'quiet' : emphasis
  const isGood =
    trend === undefined
      ? null
      : trendPolarity === 'up-is-good'
        ? trend.value >= 0
        : trend.value <= 0

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border bg-surface-container-lowest p-5',
        'transition-[border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-standard)]',
        'hover:elev-2',
        level === 'loud' && 'border-primary-border elev-2',
        level === 'default' && 'border-outline-variant/60 elev-1',
        level === 'quiet' && 'border-outline-variant/40 bg-surface-container-low/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-overline text-on-surface-variant">{title}</p>
        <MaterialIcon
          name={icon}
          size={16}
          className={cn('mt-px opacity-60', iconAccent[variant])}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            'nums text-on-surface',
            level === 'loud' && 'text-display-lg',
            level === 'default' && 'text-display',
            level === 'quiet' && 'text-headline-md text-on-surface-variant',
          )}
        >
          {value}
        </span>

        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-label-sm font-semibold',
              isGood ? 'text-on-success-subtle' : 'text-on-danger-subtle',
            )}
          >
            <MaterialIcon
              name={trend.value >= 0 ? 'expand_less' : 'expand_more'}
              size={14}
              className="shrink-0"
            />
            <span className="nums">{Math.abs(trend.value)}%</span>
          </span>
        )}
      </div>

      {(trend?.label || subtitle) && (
        <p className="text-body-sm text-on-surface-variant mt-2">{trend?.label ?? subtitle}</p>
      )}

      {trend?.label && subtitle && (
        <p className="text-body-sm text-on-surface-variant/80 mt-0.5">{subtitle}</p>
      )}

      {action && <div className="mt-4 pt-4 border-t border-outline-variant/40">{action}</div>}
    </div>
  )
}

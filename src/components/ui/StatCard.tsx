import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  trend?: { value: number; label: string }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const iconVariants = {
  default: 'bg-surface-container text-on-surface-variant',
  primary: 'bg-primary-container/10 text-primary',
  success: 'bg-tertiary-container/10 text-tertiary',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-error-container/40 text-error',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm p-5',
        'hover:border-primary/30 transition-colors duration-200 flex flex-col justify-between',
        className,
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn('p-2 rounded-lg', iconVariants[variant])}>
          <MaterialIcon name={icon} size={20} />
        </div>
        {trend && (
          <span className={cn('text-label-sm', trend.value >= 0 ? 'text-tertiary-container' : 'text-error')}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-label-md text-on-surface-variant uppercase tracking-wider">{title}</p>
        <p className="text-display text-primary mt-1">{value}</p>
        {subtitle && <p className="text-label-sm text-on-surface-variant mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

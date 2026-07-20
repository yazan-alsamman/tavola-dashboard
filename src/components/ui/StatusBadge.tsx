import { cn } from '@/lib/utils'
import type { ReservationStatus, TableStatus } from '@/types'

const reservationStatusStyles: Record<ReservationStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  confirmed: 'bg-success/10 text-success',
  checked_in: 'bg-primary/10 text-primary',
  seated: 'bg-secondary/10 text-secondary',
  completed: 'bg-tertiary-container/10 text-tertiary-container',
  cancelled: 'bg-error/10 text-error',
  no_show: 'bg-surface-variant text-on-surface-variant',
}

const tableStatusStyles: Record<TableStatus, string> = {
  available: 'bg-surface-variant text-on-surface-variant',
  reserved: 'bg-primary/10 text-primary',
  occupied: 'bg-primary text-on-primary',
  out_of_service: 'bg-error/10 text-error',
}

interface StatusBadgeProps {
  status: ReservationStatus | TableStatus | string
  label: string
  type?: 'reservation' | 'table' | 'custom'
  className?: string
}

export function StatusBadge({ status, label, type = 'reservation', className }: StatusBadgeProps) {
  const style =
    type === 'table'
      ? tableStatusStyles[status as TableStatus] ?? 'bg-surface-variant text-on-surface-variant'
      : reservationStatusStyles[status as ReservationStatus] ?? 'bg-surface-variant text-on-surface-variant'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-medium',
        style,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', style.includes('text-warning') ? 'bg-warning' : style.includes('text-success') ? 'bg-success' : style.includes('text-error') ? 'bg-error' : 'bg-current')} />
      {label}
    </span>
  )
}

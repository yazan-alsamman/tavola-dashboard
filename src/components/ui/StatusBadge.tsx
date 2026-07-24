import { cn } from '@/lib/utils'
import type { ReservationStatus, TableStatus } from '@/types'
import type { TableStatusDto } from '@/api/tables'

const reservationStatusStyles: Record<ReservationStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  confirmed: 'bg-success/10 text-success',
  checked_in: 'bg-primary/10 text-primary',
  seated: 'bg-secondary/10 text-secondary',
  completed: 'bg-tertiary-container/10 text-tertiary-container',
  cancelled: 'bg-error/10 text-error',
  no_show: 'bg-surface-variant text-on-surface-variant',
}

/** Mock table statuses (legacy demo surfaces). */
const mockTableStatusStyles: Record<TableStatus, string> = {
  available: 'bg-surface-variant text-on-surface-variant',
  reserved: 'bg-primary/10 text-primary',
  occupied: 'bg-primary text-on-primary',
  out_of_service: 'bg-error/10 text-error',
}

/** Backend table statuses (live inventory). */
const backendTableStatusStyles: Record<TableStatusDto, string> = {
  Available: 'bg-surface-variant text-on-surface-variant',
  Occupied: 'bg-primary text-on-primary',
  Cleaning: 'bg-warning/10 text-warning',
  Disabled: 'bg-error/10 text-error',
}

interface StatusBadgeProps {
  status: ReservationStatus | TableStatus | TableStatusDto | string
  label: string
  type?: 'reservation' | 'table' | 'custom'
  className?: string
}

export function StatusBadge({ status, label, type = 'reservation', className }: StatusBadgeProps) {
  let style = 'bg-surface-variant text-on-surface-variant'
  if (type === 'table') {
    style =
      backendTableStatusStyles[status as TableStatusDto] ??
      mockTableStatusStyles[status as TableStatus] ??
      style
  } else if (type === 'reservation') {
    style = reservationStatusStyles[status as ReservationStatus] ?? style
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-medium',
        style,
        className,
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          style.includes('text-warning')
            ? 'bg-warning'
            : style.includes('text-success')
              ? 'bg-success'
              : style.includes('text-error')
                ? 'bg-error'
                : 'bg-current',
        )}
      />
      {label}
    </span>
  )
}

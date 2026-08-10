import { cn } from '@/lib/utils'
import type { ReservationStatus, TableStatus } from '@/types'
import type { ReservationStatusDto } from '@/api/reservations'
import type { TableStatusDto } from '@/api/tables'

const reservationStatusStyles: Record<ReservationStatus, string> = {
  pending: 'bg-warning-light text-warning',
  confirmed: 'bg-success-light text-success',
  checked_in: 'bg-info-light text-info',
  seated: 'bg-success-light text-success',
  completed: 'bg-success-light text-success',
  cancelled: 'bg-danger-light text-danger',
  no_show: 'bg-danger-light text-danger',
}

/** Live API reservation statuses. */
const backendReservationStatusStyles: Record<ReservationStatusDto, string> = {
  Pending: 'bg-warning-light text-warning',
  Approved: 'bg-success-light text-success',
  Rejected: 'bg-danger-light text-danger',
  Cancelled: 'bg-danger-light text-danger',
  Completed: 'bg-success-light text-success',
  Expired: 'bg-surface-variant text-on-surface-variant',
  NoShow: 'bg-danger-light text-danger',
}

/** Mock table statuses (legacy demo surfaces). */
const mockTableStatusStyles: Record<TableStatus, string> = {
  available: 'bg-success-light text-success',
  reserved: 'bg-info-light text-info',
  occupied: 'bg-warning-light text-warning',
  out_of_service: 'bg-danger-light text-danger',
}

/** Backend table statuses (live inventory). */
const backendTableStatusStyles: Record<TableStatusDto, string> = {
  Available: 'bg-success-light text-success',
  Occupied: 'bg-warning-light text-warning',
  Cleaning: 'bg-info-light text-info',
  Disabled: 'bg-danger-light text-danger',
}

interface StatusBadgeProps {
  status: ReservationStatus | ReservationStatusDto | TableStatus | TableStatusDto | string
  label: string
  type?: 'reservation' | 'table' | 'custom'
  className?: string
}

function resolveStyle(
  status: string,
  type: StatusBadgeProps['type'],
): string {
  if (type === 'table') {
    return (
      backendTableStatusStyles[status as TableStatusDto] ??
      mockTableStatusStyles[status as TableStatus] ??
      'bg-surface-variant text-on-surface-variant'
    )
  }

  return (
    backendReservationStatusStyles[status as ReservationStatusDto] ??
    reservationStatusStyles[status as ReservationStatus] ??
    'bg-surface-variant text-on-surface-variant'
  )
}

function dotClass(style: string): string {
  if (style.includes('text-warning')) return 'bg-warning'
  if (style.includes('text-success')) return 'bg-success'
  if (style.includes('text-danger') || style.includes('text-error')) return 'bg-danger'
  if (style.includes('text-info')) return 'bg-info'
  return 'bg-current'
}

export function StatusBadge({
  status,
  label,
  type = 'reservation',
  className,
}: StatusBadgeProps) {
  const style =
    type === 'custom'
      ? resolveStyle(String(status), 'reservation')
      : resolveStyle(String(status), type)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-medium',
        style,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotClass(style))} />
      {label}
    </span>
  )
}

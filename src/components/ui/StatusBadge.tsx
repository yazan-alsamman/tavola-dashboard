import { Badge, type BadgeTone } from '@/components/ui/Badge'
import type { ReservationStatus, TableStatus } from '@/types'
import type { ReservationStatusDto } from '@/api/reservations'
import type { TableStatusDto } from '@/api/tables'

/**
 * Status → tone is the single mapping for the whole product. Visual styling
 * lives in `Badge`, so a colour change never has to be repeated per domain.
 */
const reservationTones: Record<ReservationStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  checked_in: 'info',
  seated: 'success',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
}

/** Live API reservation statuses. */
const backendReservationTones: Record<ReservationStatusDto, BadgeTone> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'danger',
  Completed: 'success',
  Expired: 'neutral',
  NoShow: 'danger',
}

/** Mock table statuses (legacy demo surfaces). */
const mockTableTones: Record<TableStatus, BadgeTone> = {
  available: 'success',
  reserved: 'info',
  occupied: 'warning',
  out_of_service: 'danger',
}

/** Backend table statuses (live inventory). */
const backendTableTones: Record<TableStatusDto, BadgeTone> = {
  Available: 'success',
  Occupied: 'warning',
  Cleaning: 'info',
  Disabled: 'danger',
  Reserved: 'info',
  Merged: 'neutral',
}

interface StatusBadgeProps {
  status: ReservationStatus | ReservationStatusDto | TableStatus | TableStatusDto | string
  label: string
  type?: 'reservation' | 'table' | 'custom'
  className?: string
}

function resolveStatusTone(status: string, type: StatusBadgeProps['type']): BadgeTone {
  if (type === 'table') {
    return (
      backendTableTones[status as TableStatusDto] ??
      mockTableTones[status as TableStatus] ??
      'neutral'
    )
  }

  return (
    backendReservationTones[status as ReservationStatusDto] ??
    reservationTones[status as ReservationStatus] ??
    'neutral'
  )
}

export function StatusBadge({ status, label, type = 'reservation', className }: StatusBadgeProps) {
  const tone = resolveStatusTone(String(status), type === 'custom' ? 'reservation' : type)

  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  )
}



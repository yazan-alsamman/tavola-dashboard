import { Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import {
  approvalMinutesLeft,
  autoCloseMinutesLeft,
  customerPagePath,
  isAutoClosed,
  isReturningCustomer,
  previousVisits,
} from '@/lib/reservationInsights'
import type { ReservationView } from '@/lib/reservationView'

/**
 * Why a booking ended where it did: who cancelled or declined it and the
 * reason given, or that the system closed it because reception did not.
 */
export function ReservationStatusChangeNote({ reservation }: { reservation: ReservationView }) {
  const { t } = useLocale()
  const change = reservation.statusChange
  if (!change) return null

  if (isAutoClosed(reservation)) {
    return (
      <p className="flex items-center gap-1.5 text-label-sm text-warning">
        <MaterialIcon name="schedule" size={14} className="shrink-0" />
        {t.reservations.autoClosed}
      </p>
    )
  }
  if (change.status !== 'Cancelled' && change.status !== 'Rejected') return null

  const who = t.reservations.changedBy[change.changedBy]
  const headline = (
    change.status === 'Cancelled' ? t.reservations.cancelledBy : t.reservations.rejectedBy
  ).replace('{who}', who)
  return (
    <p className="text-label-sm text-error">
      <span className="font-semibold">{headline}</span>
      {' · '}
      {change.reason
        ? t.reservations.reasonLine.replace('{reason}', change.reason)
        : t.reservations.noReasonGiven}
    </p>
  )
}

/** "Returning customer · N visits", plus no-shows when there are any. */
export function ReturningCustomerBadge({ reservation }: { reservation: ReservationView }) {
  const { t } = useLocale()
  const returning = isReturningCustomer(reservation)
  if (!returning && reservation.noShowCount === 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {returning && (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-label-sm font-semibold text-success">
          <MaterialIcon name="star" size={14} className="shrink-0" />
          {t.reservations.returning.replace('{n}', String(previousVisits(reservation)))}
        </span>
      )}
      {reservation.noShowCount > 0 && (
        <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-0.5 text-label-sm font-semibold text-error">
          {t.reservations.noShowCount.replace('{n}', String(reservation.noShowCount))}
        </span>
      )}
    </span>
  )
}

/** Countdown for a pending answer, or for the automatic close of a finished table. */
export function ReservationTimingHint({
  reservation,
  now,
}: {
  reservation: ReservationView
  now: number
}) {
  const { t } = useLocale()
  const approval = approvalMinutesLeft(reservation, now)
  if (approval !== null) {
    const urgent = approval <= 10
    return (
      <p
        className={
          urgent
            ? 'flex items-center gap-1.5 text-label-sm font-semibold text-error'
            : 'flex items-center gap-1.5 text-label-sm text-on-surface-variant'
        }
      >
        <MaterialIcon name="hourglass_empty" size={14} className="shrink-0" />
        {approval > 0
          ? t.reservations.approvalDue.replace('{n}', String(approval))
          : t.reservations.approvalDuePassed}
      </p>
    )
  }
  const autoClose = autoCloseMinutesLeft(reservation, now)
  if (autoClose === null) return null
  return (
    <p className="flex items-center gap-1.5 text-label-sm font-semibold text-warning">
      <MaterialIcon name="timer" size={14} className="shrink-0" />
      {t.reservations.autoCloseSoon.replace('{n}', String(autoClose))}
    </p>
  )
}

/** Link to every booking of this customer at the branch. */
export function CustomerPageLink({ customerKey }: { customerKey: string | null }) {
  const { t } = useLocale()
  if (!customerKey) return null
  return (
    <Link
      to={customerPagePath(customerKey)}
      className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
    >
      <MaterialIcon name="person" size={16} />
      {t.reservations.openCustomer}
    </Link>
  )
}

import { useState, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  approveReservation,
  cancelReservation,
  completeReservation,
  createIdempotencyKey,
  markReservationNoShow,
  markReservationTableReady,
  rejectReservation,
  type ReservationStatusDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { reservationKeys } from '@/lib/queryKeys'

type ActionKey = 'approve' | 'reject' | 'complete' | 'noshow' | 'arrived' | 'cancel'

const arrivedIds = new Set<string>()
const arrivedListeners = new Set<() => void>()

function rememberArrived(reservationId: string): void {
  arrivedIds.add(reservationId)
  arrivedListeners.forEach((listener) => listener())
}

function useGuestArrived(reservationId: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      arrivedListeners.add(onStoreChange)
      return () => arrivedListeners.delete(onStoreChange)
    },
    () => arrivedIds.has(reservationId),
    () => false,
  )
}

function canConfirm(status: ReservationStatusDto): boolean {
  return status === 'Pending'
}

function canFinish(status: ReservationStatusDto): boolean {
  return status === 'Approved'
}

interface ReservationActionsProps {
  reservationId: string
  status: ReservationStatusDto
  /** Board cards only show confirm, arrived, finished, and no-show. */
  compact?: boolean
}

/**
 * Staff lifecycle controls. Arrived calls table-ready and does not change status.
 * Finished calls complete and moves an approved booking to Completed.
 */
export function ReservationActions({
  reservationId,
  status,
  compact = false,
}: ReservationActionsProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<ActionKey | null>(null)
  const [reason, setReason] = useState('')
  const guestArrived = useGuestArrived(reservationId)

  const run = async (action: ActionKey, mutation: () => Promise<unknown>): Promise<void> => {
    if (busy) return
    setBusy(action)
    try {
      await mutation()
      if (action === 'arrived') rememberArrived(reservationId)
      await queryClient.invalidateQueries({ queryKey: reservationKeys.all })
      const message =
        action === 'approve'
          ? t.reservations.actions.approveSuccess
          : action === 'reject'
            ? t.reservations.actions.rejectSuccess
            : action === 'complete'
              ? t.reservations.actions.completeSuccess
              : action === 'noshow'
                ? t.reservations.actions.noShowSuccess
                : action === 'arrived'
                  ? t.reservations.actions.tableReadySuccess
                  : t.reservations.actions.cancelSuccess
      toast('success', message)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.reservations.errors.unknown)
    } finally {
      setBusy(null)
    }
  }

  const showConfirm = canConfirm(status)
  const showService = canFinish(status)
  const showCancel = !compact && (status === 'Pending' || status === 'Approved')
  if (!showConfirm && !showService && !showCancel) return null

  return (
    <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
      <p className="text-label-sm font-semibold text-on-surface">{t.reservations.track.update}</p>
      {showConfirm && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('approve', () => approveReservation(reservationId, createIdempotencyKey()))
            }
          >
            {t.reservations.confirm}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('reject', () => rejectReservation(reservationId, createIdempotencyKey()))
            }
          >
            {t.reservations.reject}
          </Button>
        </div>
      )}
      {showService && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={guestArrived ? 'outline' : 'primary'}
              disabled={Boolean(busy) || guestArrived}
              onClick={() =>
                void run('arrived', () =>
                  markReservationTableReady(reservationId, createIdempotencyKey()),
                )
              }
            >
              {guestArrived ? t.reservations.track.here : t.reservations.track.arrived}
            </Button>
            <Button
              size="sm"
              disabled={Boolean(busy)}
              onClick={() =>
                void run('complete', () =>
                  completeReservation(reservationId, createIdempotencyKey()),
                )
              }
            >
              {t.reservations.track.finished}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() =>
                void run('noshow', () =>
                  markReservationNoShow(reservationId, createIdempotencyKey()),
                )
              }
            >
              {t.reservations.track.noShow}
            </Button>
          </div>
          {!guestArrived && (
            <p className="text-label-sm text-on-surface-variant">{t.reservations.track.arrivedHint}</p>
          )}
        </div>
      )}
      {showCancel && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t.reservations.cancelReasonPlaceholder}
            className="h-9 min-w-40 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('cancel', () =>
                cancelReservation(
                  reservationId,
                  { reason: reason.trim() || null },
                  createIdempotencyKey(),
                ),
              )
            }
          >
            {t.common.cancel}
          </Button>
        </div>
      )}
    </div>
  )
}

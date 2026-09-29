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
import { ConfirmDialog } from '@/components/ui/Modal'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import { reservationKeys } from '@/lib/queryKeys'

type ActionKey = 'approve' | 'reject' | 'complete' | 'noshow' | 'arrived' | 'cancel'
type DestructiveAction = 'reject' | 'noshow' | 'cancel'

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
  const [destructive, setDestructive] = useState<DestructiveAction | null>(null)
  const guestArrived = useGuestArrived(reservationId)

  const run = async (action: ActionKey, mutation: () => Promise<unknown>): Promise<void> => {
    if (busy) return
    setBusy(action)
    try {
      await mutation()
      if (action === 'arrived') rememberArrived(reservationId)
      if (action === 'reject' || action === 'noshow' || action === 'cancel') {
        setDestructive(null)
        setReason('')
      }
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
  const showCancel = status === 'Pending' || status === 'Approved'
  if (!showConfirm && !showService && !showCancel) return null

  const closeDestructive = () => {
    if (busy) return
    setDestructive(null)
    setReason('')
  }

  const confirmDestructive = () => {
    if (destructive === 'reject') {
      void run('reject', () => rejectReservation(reservationId, createIdempotencyKey()))
    } else if (destructive === 'noshow') {
      void run('noshow', () => markReservationNoShow(reservationId, createIdempotencyKey()))
    } else if (destructive === 'cancel') {
      const note = reason.trim()
      void run('cancel', () =>
        cancelReservation(
          reservationId,
          { reason: note || null },
          createIdempotencyKey(),
        ),
      )
    }
  }

  const dialogCopy =
    destructive === 'reject'
      ? { title: t.reservations.detail.rejectTitle, message: t.reservations.detail.rejectBody, confirm: t.reservations.reject }
      : destructive === 'noshow'
        ? { title: t.reservations.detail.noShowTitle, message: t.reservations.detail.noShowBody, confirm: t.reservations.track.noShow }
        : {
            title: t.reservations.detail.cancelTitle,
            message: t.reservations.detail.cancelBody,
            confirm: t.common.cancel,
          }

  return (
    <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
      {!compact && (
        <p className="text-label-sm font-semibold text-on-surface">{t.reservations.track.update}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {showConfirm && (
          <Button
            size="sm"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('approve', () => approveReservation(reservationId, createIdempotencyKey()))
            }
          >
            {t.reservations.confirm}
          </Button>
        )}
        {showService && !guestArrived && (
          <Button
            size="sm"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('arrived', () =>
                markReservationTableReady(reservationId, createIdempotencyKey()),
              )
            }
          >
            {t.reservations.track.arrived}
          </Button>
        )}
        {showService && guestArrived && (
          <Button
            size="sm"
            disabled={Boolean(busy)}
            onClick={() =>
              void run('complete', () => completeReservation(reservationId, createIdempotencyKey()))
            }
          >
            {t.reservations.track.finished}
          </Button>
        )}
        {showService && guestArrived && (
          <span className="text-label-sm text-on-surface-variant">{t.reservations.track.here}</span>
        )}
        <DropdownMenu label={t.common.moreActions}>
          {showConfirm && (
            <DropdownMenuItem destructive onSelect={() => setDestructive('reject')}>
              {t.reservations.reject}
            </DropdownMenuItem>
          )}
          {showService && !guestArrived && (
            <DropdownMenuItem
              onSelect={() =>
                void run('complete', () =>
                  completeReservation(reservationId, createIdempotencyKey()),
                )
              }
            >
              {t.reservations.track.finished}
            </DropdownMenuItem>
          )}
          {showService && (
            <DropdownMenuItem destructive onSelect={() => setDestructive('noshow')}>
              {t.reservations.track.noShow}
            </DropdownMenuItem>
          )}
          {showCancel && (
            <DropdownMenuItem destructive onSelect={() => setDestructive('cancel')}>
              {t.common.cancel}
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </div>
      {showService && !guestArrived && !compact && (
        <p className="text-label-sm text-on-surface-variant">{t.reservations.track.arrivedHint}</p>
      )}
      <ConfirmDialog
        open={destructive != null}
        onClose={closeDestructive}
        onConfirm={confirmDestructive}
        title={dialogCopy.title}
        message={dialogCopy.message}
        confirmLabel={dialogCopy.confirm}
        cancelLabel={t.common.close}
        variant="danger"
        busy={Boolean(busy)}
        closeOnConfirm={false}
        reasonLabel={destructive === 'cancel' ? t.reservations.detail.reasonLabel : undefined}
        reason={reason}
        onReasonChange={setReason}
      />
    </div>
  )
}

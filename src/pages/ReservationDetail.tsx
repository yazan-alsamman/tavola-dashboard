import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import {
  approveReservation,
  cancelReservation,
  completeReservation,
  createIdempotencyKey,
  markReservationNoShow,
  markReservationTableReady,
  rejectReservation,
  rescheduleReservation,
  type ReservationDto,
  type ReservationStatusDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { useMyReservationDetailQuery } from '@/hooks/useReservationQueries'
import { reservationKeys } from '@/lib/queryKeys'

type ActionKey =
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'complete'
  | 'noshow'
  | 'tableReady'
  | 'reschedule'

function reservationStatusLabel(
  status: ReservationStatusDto,
  t: ReturnType<typeof useLocale>['t'],
): string {
  if (status in t.status) {
    return t.status[status as keyof typeof t.status]
  }
  return status
}

function formatInstant(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function canApprove(status: ReservationStatusDto): boolean {
  return status === 'Pending'
}

function canReject(status: ReservationStatusDto): boolean {
  return status === 'Pending'
}

function canComplete(status: ReservationStatusDto): boolean {
  return status === 'Approved'
}

function canNoShow(status: ReservationStatusDto): boolean {
  return status === 'Approved'
}

function canTableReady(status: ReservationStatusDto): boolean {
  return status === 'Approved'
}

function canCancel(status: ReservationStatusDto): boolean {
  return status === 'Pending' || status === 'Approved'
}

function canReschedule(status: ReservationStatusDto): boolean {
  return status === 'Pending' || status === 'Approved'
}

function hasAnyAction(status: ReservationStatusDto): boolean {
  return (
    canApprove(status) ||
    canReject(status) ||
    canComplete(status) ||
    canNoShow(status) ||
    canTableReady(status) ||
    canCancel(status) ||
    canReschedule(status)
  )
}

function actionSuccessMessage(
  action: ActionKey,
  t: ReturnType<typeof useLocale>['t'],
): string {
  switch (action) {
    case 'approve':
      return t.reservations.actions.approveSuccess
    case 'reject':
      return t.reservations.actions.rejectSuccess
    case 'cancel':
      return t.reservations.actions.cancelSuccess
    case 'complete':
      return t.reservations.actions.completeSuccess
    case 'noshow':
      return t.reservations.actions.noShowSuccess
    case 'tableReady':
      return t.reservations.actions.tableReadySuccess
    case 'reschedule':
      return t.reservations.actions.rescheduleSuccess
  }
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd
        className={`text-body-md text-on-surface mt-0.5 break-all ${mono ? 'font-mono text-label-sm' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function ReservationInfo({ reservation, locale, t }: {
  reservation: ReservationDto
  locale: string
  t: ReturnType<typeof useLocale>['t']
}) {
  return (
    <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 md:p-5">
      <h2 className="text-label-lg font-semibold text-on-surface mb-4">
        {t.reservations.reservationInfo}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <DetailField
          label={t.reservations.status}
          value={reservationStatusLabel(reservation.status, t)}
        />
        <DetailField label={t.reservations.source} value={reservation.source} />
        <DetailField
          label={t.reservations.date}
          value={reservation.reservationDate}
        />
        <DetailField
          label={t.reservations.time}
          value={formatInstant(reservation.reservationStartTime, locale)}
        />
        <DetailField
          label={t.reservations.guests}
          value={String(reservation.guests)}
        />
        <DetailField
          label={t.reservations.table}
          value={reservation.tableId}
          mono
        />
        <DetailField
          label={t.reservations.created}
          value={formatInstant(reservation.createdAt, locale)}
        />
        <DetailField
          label={t.reservations.updated}
          value={formatInstant(reservation.updatedAt, locale)}
        />
        {reservation.notes && (
          <div className="sm:col-span-2">
            <DetailField label={t.reservations.notes} value={reservation.notes} />
          </div>
        )}
        <DetailField
          label={t.reservations.id}
          value={reservation.reservationId}
          mono
        />
      </dl>
    </section>
  )
}

export function ReservationDetailPage() {
  const { id } = useParams()
  const { t, locale } = useLocale()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const detailQuery = useMyReservationDetailQuery(id)

  const [busy, setBusy] = useState<ActionKey | null>(null)
  const [reason, setReason] = useState('')
  const [reschedule, setReschedule] = useState({
    tableId: '',
    reservationStartTime: '',
    guests: 2,
  })

  useEffect(() => {
    if (!detailQuery.data) return
    setReschedule({
      tableId: detailQuery.data.tableId,
      reservationStartTime: isoToDatetimeLocal(detailQuery.data.reservationStartTime),
      guests: detailQuery.data.guests,
    })
  }, [detailQuery.data])

  const invalidateReservation = async (): Promise<void> => {
    if (!id) return
    await queryClient.invalidateQueries({ queryKey: reservationKeys.detail(id) })
    await queryClient.invalidateQueries({ queryKey: reservationKeys.lists() })
  }

  const run = async (
    action: ActionKey,
    mutation: () => Promise<unknown>,
  ): Promise<void> => {
    if (!id || busy) return
    setBusy(action)
    try {
      await mutation()
      await invalidateReservation()
      toast('success', actionSuccessMessage(action, t))
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.reservations.errors.unknown)
    } finally {
      setBusy(null)
    }
  }

  if (!id) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <h1 className="text-headline-md text-on-surface mb-2">
          {t.reservations.detail.notFoundTitle}
        </h1>
        <Link to="/reservations" className="text-primary font-semibold">
          {t.nav.reservations}
        </Link>
      </div>
    )
  }

  if (detailQuery.isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center text-on-surface-variant">
        {t.common.loading}
      </div>
    )
  }

  if (detailQuery.isError) {
    const notFound = isApiError(detailQuery.error) && detailQuery.error.code === 'NOT_FOUND'
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Link
          to="/reservations"
          className="inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary mb-6"
        >
          <MaterialIcon name="arrow_back" size={16} />
          {t.nav.reservations}
        </Link>
        <EmptyState
          icon={notFound ? 'event_busy' : 'error'}
          title={
            notFound
              ? t.reservations.detail.notFoundTitle
              : t.reservations.detail.errorTitle
          }
          description={
            notFound
              ? t.reservations.detail.notFoundBody
              : t.reservations.detail.errorBody
          }
          action={
            !notFound ? (
              <button
                type="button"
                className="text-label-md text-primary font-semibold"
                onClick={() => void detailQuery.refetch()}
              >
                {t.scope.retry}
              </button>
            ) : undefined
          }
        />
      </div>
    )
  }

  if (!detailQuery.data) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center text-on-surface-variant">
        {t.common.loading}
      </div>
    )
  }

  const reservation = detailQuery.data
  const showActions = hasAnyAction(reservation.status)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <Link
          to="/reservations"
          className="inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary mb-4"
        >
          <MaterialIcon name="arrow_back" size={16} />
          {t.nav.reservations}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-headline-md text-on-surface mb-1">
              {t.reservations.details}
            </h1>
            <p className="text-label-sm text-on-surface-variant font-mono break-all">
              {reservation.reservationId}
            </p>
          </div>
          <StatusBadge
            type="custom"
            status={reservation.status}
            label={reservationStatusLabel(reservation.status, t)}
          />
        </div>
        <p className="text-body-sm text-on-surface-variant mt-2">
          <Num>{reservation.guests}</Num> {t.common.guests} ·{' '}
          {formatInstant(reservation.reservationStartTime, locale)}
        </p>
      </div>

      <ReservationInfo reservation={reservation} locale={locale} t={t} />

      {!showActions && (
        <p className="text-body-sm text-on-surface-variant">
          {t.reservations.backendGap.actionsUnavailable}
        </p>
      )}

      {showActions && (
        <>
          {(canApprove(reservation.status) || canReject(reservation.status)) && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
              <h2 className="text-label-lg font-semibold">{t.reservations.detail.actionsTitle}</h2>
              <div className="flex flex-wrap gap-2">
                {canApprove(reservation.status) && (
                  <Button
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run('approve', () =>
                        approveReservation(id, createIdempotencyKey()),
                      )
                    }
                  >
                    {t.reservations.approve}
                  </Button>
                )}
                {canReject(reservation.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run('reject', () =>
                        rejectReservation(id, createIdempotencyKey()),
                      )
                    }
                  >
                    {t.reservations.reject}
                  </Button>
                )}
              </div>
            </section>
          )}

          {(canComplete(reservation.status) ||
            canNoShow(reservation.status) ||
            canTableReady(reservation.status)) && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
              <h2 className="text-label-lg font-semibold">{t.reservations.complete}</h2>
              <div className="flex flex-wrap gap-2">
                {canComplete(reservation.status) && (
                  <Button
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run('complete', () =>
                        completeReservation(id, createIdempotencyKey()),
                      )
                    }
                  >
                    {t.reservations.complete}
                  </Button>
                )}
                {canNoShow(reservation.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run('noshow', () =>
                        markReservationNoShow(id, createIdempotencyKey()),
                      )
                    }
                  >
                    {t.reservations.noShow}
                  </Button>
                )}
                {canTableReady(reservation.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run('tableReady', () =>
                        markReservationTableReady(id, createIdempotencyKey()),
                      )
                    }
                  >
                    {t.reservations.tableReady}
                  </Button>
                )}
              </div>
            </section>
          )}

          {canCancel(reservation.status) && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
              <h2 className="text-label-lg font-semibold">{t.common.cancel}</h2>
              <Input
                placeholder={t.reservations.cancelReasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="text-danger"
                disabled={Boolean(busy)}
                onClick={() =>
                  void run('cancel', () =>
                    cancelReservation(
                      id,
                      { reason: reason || null },
                      createIdempotencyKey(),
                    ),
                  )
                }
              >
                {t.common.cancel}
              </Button>
            </section>
          )}

          {canReschedule(reservation.status) && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
              <h2 className="text-label-lg font-semibold">{t.reservations.changeTime}</h2>
              <Input
                placeholder={t.reservations.table}
                value={reschedule.tableId}
                onChange={(e) =>
                  setReschedule({ ...reschedule, tableId: e.target.value })
                }
              />
              <Input
                type="datetime-local"
                value={reschedule.reservationStartTime}
                onChange={(e) =>
                  setReschedule({
                    ...reschedule,
                    reservationStartTime: e.target.value,
                  })
                }
              />
              <Input
                type="number"
                min={1}
                value={reschedule.guests}
                onChange={(e) =>
                  setReschedule({
                    ...reschedule,
                    guests: Number(e.target.value) || 1,
                  })
                }
              />
              <Button
                size="sm"
                disabled={
                  Boolean(busy) ||
                  !reschedule.tableId ||
                  !reschedule.reservationStartTime
                }
                onClick={() =>
                  void run('reschedule', () =>
                    rescheduleReservation(
                      id,
                      {
                        tableId: reschedule.tableId.trim(),
                        reservationStartTime: new Date(
                          reschedule.reservationStartTime,
                        ).toISOString(),
                        guests: reschedule.guests,
                      },
                      createIdempotencyKey(),
                    ),
                  )
                }
              >
                {t.reservations.changeTime}
              </Button>
            </section>
          )}
        </>
      )}
    </div>
  )
}

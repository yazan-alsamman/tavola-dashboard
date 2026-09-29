import { useEffect, useMemo, useState } from 'react'
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
  createIdempotencyKey,
  rescheduleReservation,
  type ReservationDto,
  type ReservationStatusDto,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'
import { ReservationActions } from '@/components/reservations/ReservationActions'
import {
  useCachedReservation,
  useMyReservationDetailQuery,
} from '@/hooks/useReservationQueries'
import { reservationKeys } from '@/lib/queryKeys'
import { toReservationView, type ReservationView } from '@/lib/reservationView'
import { formatDateTime } from '@/lib/format'
import { reservationStatusLabel } from '@/lib/statusLabel'

function mergeReservation(
  detail: ReservationDto | undefined,
  cached: ReservationView | undefined,
): ReservationView | null {
  const fromDetail = detail ? toReservationView(detail) : null
  if (!fromDetail) return cached ?? null
  if (!cached) return fromDetail
  return {
    ...fromDetail,
    tableNumber: fromDetail.tableNumber ?? cached.tableNumber,
    customerName: fromDetail.customerName ?? cached.customerName,
    customerPhone: fromDetail.customerPhone ?? cached.customerPhone,
    customerKind: fromDetail.customerKind ?? cached.customerKind,
    tableId: fromDetail.tableId || cached.tableId,
    notes: fromDetail.notes ?? cached.notes,
    guests: fromDetail.guests || cached.guests,
  }
}

function formatInstant(iso: string, locale: string): string {
  return formatDateTime(iso, locale)
}

function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function canReschedule(status: ReservationStatusDto): boolean {
  return status === 'Pending' || status === 'Approved'
}

function DetailField({
  label,
  value,
  mono = false,
  ltr = false,
}: {
  label: string
  value: string
  mono?: boolean
  ltr?: boolean
}) {
  return (
    <div>
      <dt className="text-label-sm text-on-surface-variant">{label}</dt>
      <dd
        dir={ltr ? 'ltr' : undefined}
        className={`text-body-md text-on-surface mt-0.5 break-all ${mono ? 'font-mono text-label-sm nums' : ''} ${ltr ? 'nums' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function ReservationInfo({ reservation, locale, t }: {
  reservation: ReservationView
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
          value={reservationStatusLabel(reservation.status, t.status)}
        />
        <DetailField
          label={t.reservations.customer}
          value={reservation.customerName ?? t.reservations.board.guest}
        />
        {reservation.customerPhone && (
          <DetailField label={t.reservations.phone} value={reservation.customerPhone} ltr />
        )}
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
          value={reservation.tableNumber ?? reservation.tableId}
          mono={!reservation.tableNumber}
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
          ltr
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
  const cached = useCachedReservation(id)
  const reservation = useMemo(
    () => mergeReservation(detailQuery.data, cached),
    [cached, detailQuery.data],
  )

  const [busy, setBusy] = useState(false)
  const [reschedule, setReschedule] = useState({
    tableId: '',
    reservationStartTime: '',
    guests: 2,
  })

  useEffect(() => {
    if (!reservation) return
    setReschedule({
      tableId: reservation.tableId,
      reservationStartTime: isoToDatetimeLocal(reservation.reservationStartTime),
      guests: reservation.guests,
    })
  }, [reservation])

  const invalidateReservation = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: reservationKeys.all })
  }

  const run = async (mutation: () => Promise<unknown>): Promise<void> => {
    if (!id || busy) return
    setBusy(true)
    try {
      await mutation()
      await invalidateReservation()
      toast('success', t.reservations.actions.rescheduleSuccess)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.reservations.errors.unknown)
    } finally {
      setBusy(false)
    }
  }

  if (!id) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <h1 className="text-headline-md text-on-surface mb-2">
          {t.reservations.detail.notFoundTitle}
        </h1>
        <Link to="/app/reservations" className="text-primary font-semibold">
          {t.nav.reservations}
        </Link>
      </div>
    )
  }

  if (detailQuery.isLoading && !reservation) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center text-on-surface-variant">
        {t.common.loading}
      </div>
    )
  }

  if (!reservation && detailQuery.isError) {
    const notFound = isApiError(detailQuery.error) && detailQuery.error.code === 'NOT_FOUND'
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Link
          to="/app/reservations"
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

  if (!reservation) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center text-on-surface-variant">
        {t.common.loading}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <Link
          to="/app/reservations"
          className="inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary mb-4"
        >
          <MaterialIcon name="arrow_back" size={16} />
          {t.nav.reservations}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-headline-md text-on-surface mb-1">
              {reservation.customerName ?? t.reservations.details}
            </h1>
            <p className="text-label-sm text-on-surface-variant font-mono break-all">
              {reservation.reservationId}
            </p>
          </div>
          <StatusBadge
            type="custom"
            status={reservation.status}
            label={reservationStatusLabel(reservation.status, t.status)}
          />
        </div>
        <p className="text-body-sm text-on-surface-variant mt-2">
          <Num>{reservation.guests}</Num> {t.common.guests} ·{' '}
          {formatInstant(reservation.reservationStartTime, locale)}
        </p>
      </div>

      <ReservationInfo reservation={reservation} locale={locale} t={t} />

      {(reservation.status === 'Pending' || reservation.status === 'Approved') && (
        <section className="rounded-xl border border-outline-variant/30 bg-surface p-4">
          <ReservationActions reservationId={reservation.reservationId} status={reservation.status} />
        </section>
      )}

      {canReschedule(reservation.status) && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
              <h2 className="text-label-lg font-semibold">{t.reservations.changeTime}</h2>
              {reservation.tableNumber && (
                <p className="text-body-sm text-on-surface-variant">
                  {t.reservations.table} <Num>{reservation.tableNumber}</Num>
                </p>
              )}
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
                  void run(() =>
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
    </div>
  )
}

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLocale } from '@/context/LocaleContext'
import { useToast } from '@/context/ToastContext'
import {
  cancelReservation,
  completeReservation,
  createIdempotencyKey,
  markReservationNoShow,
  rescheduleReservation,
} from '@/api/reservations'
import { isApiError } from '@/api/errors'

/**
 * Detail GET is not in Postman yet. Lifecycle Domain Actions are:
 * cancel / reschedule / complete / no-show.
 */
export function ReservationDetailPage() {
  const { id } = useParams()
  const { t } = useLocale()
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [reschedule, setReschedule] = useState({
    tableId: '',
    reservationStartTime: '',
    guests: 2,
  })

  const run = async (
    key: string,
    action: () => Promise<unknown>,
  ): Promise<void> => {
    if (!id || busy) return
    setBusy(key)
    try {
      await action()
      toast('success', t.common.save)
    } catch (err) {
      toast('error', isApiError(err) ? err.message : t.login.errors.unknown)
    } finally {
      setBusy(null)
    }
  }

  if (!id) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <h1 className="text-headline-md text-on-surface mb-2">
          {t.reservations.backendGap.detailTitle}
        </h1>
        <Link to="/reservations" className="text-primary font-semibold">
          {t.nav.reservations}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div>
        <Link
          to="/reservations"
          className="inline-flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary mb-4"
        >
          <MaterialIcon name="arrow_back" size={16} />
          {t.nav.reservations}
        </Link>
        <h1 className="text-headline-md text-on-surface mb-1">
          {t.reservations.title}
        </h1>
        <p className="text-label-sm text-on-surface-variant font-mono break-all">{id}</p>
        <p className="text-body-sm text-on-surface-variant mt-2">
          {t.reservations.backendGap.detailBody}
        </p>
      </div>

      <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
        <h2 className="text-label-lg font-semibold">{t.reservations.complete}</h2>
        <div className="flex flex-wrap gap-2">
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
            No-show
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
        <h2 className="text-label-lg font-semibold">{t.common.cancel}</h2>
        <Input
          placeholder="Reason (optional)"
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
              cancelReservation(id, { reason: reason || null }, createIdempotencyKey()),
            )
          }
        >
          {t.common.cancel}
        </Button>
      </section>

      <section className="rounded-xl border border-outline-variant/30 bg-surface p-4 space-y-3">
        <h2 className="text-label-lg font-semibold">{t.reservations.changeTime}</h2>
        <Input
          placeholder="Table ID"
          value={reschedule.tableId}
          onChange={(e) => setReschedule({ ...reschedule, tableId: e.target.value })}
        />
        <Input
          type="datetime-local"
          value={reschedule.reservationStartTime}
          onChange={(e) =>
            setReschedule({ ...reschedule, reservationStartTime: e.target.value })
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
          disabled={Boolean(busy) || !reschedule.tableId || !reschedule.reservationStartTime}
          onClick={() =>
            void run('reschedule', () =>
              rescheduleReservation(
                id,
                {
                  tableId: reschedule.tableId.trim(),
                  reservationStartTime: new Date(reschedule.reservationStartTime).toISOString(),
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
    </div>
  )
}

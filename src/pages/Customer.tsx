import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReservationStatusChangeNote } from '@/components/reservations/ReservationContext'
import { useLocale } from '@/context/LocaleContext'
import { useCustomerReservationsQuery } from '@/hooks/useReservationQueries'
import { formatDateLabel } from '@/lib/calendarDates'
import { formatTime } from '@/lib/format'
import type { ReservationView } from '@/lib/reservationView'
import { reservationStatusLabel } from '@/lib/statusLabel'
import { getTodayISO } from '@/lib/utils'

function BookingRow({ reservation }: { reservation: ReservationView }) {
  const { t, locale } = useLocale()
  return (
    <li>
      <Link
        to={`/app/reservations/${reservation.reservationId}`}
        className="flex flex-col gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="text-label-lg font-semibold text-on-surface sm:w-48">
          {formatDateLabel(reservation.reservationDate, locale, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}{' '}
          · <span className="tabular-nums">{formatTime(reservation.reservationStartTime, locale)}</span>
        </span>
        <span className="min-w-0 flex-1 text-body-sm text-on-surface-variant">
          {t.reservations.table} {reservation.tableNumber ?? '—'} · <Num>{reservation.guests}</Num>{' '}
          {t.calendar.guests}
          <ReservationStatusChangeNote reservation={reservation} />
        </span>
        <span className="self-start sm:self-center">
          <StatusBadge
            type="custom"
            status={reservation.status}
            label={reservationStatusLabel(reservation.status, t.status)}
          />
        </span>
      </Link>
    </li>
  )
}

/** Every booking of one customer at the selected branch, with visit and no-show counts. */
export function CustomerPage() {
  const { t } = useLocale()
  const { customerKey } = useParams<{ customerKey: string }>()
  const today = getTodayISO()
  const query = useCustomerReservationsQuery(customerKey, today)

  const { upcoming, past, profile } = useMemo(() => {
    const items = query.data ?? []
    const isUpcoming = (r: ReservationView) =>
      r.reservationDate >= today && (r.status === 'Pending' || r.status === 'Approved')
    return {
      upcoming: items
        .filter(isUpcoming)
        .sort((a, b) => a.reservationStartTime.localeCompare(b.reservationStartTime)),
      past: items
        .filter((r) => !isUpcoming(r))
        .sort((a, b) => b.reservationStartTime.localeCompare(a.reservationStartTime)),
      // Counts are restaurant-wide and identical on every row of this customer.
      profile: items[0] ?? null,
    }
  }, [query.data, today])

  const breadcrumbs = [{ label: t.reservations.title, to: '/app/reservations' }]

  return (
    <div>
      <PageHeader
        title={profile?.customerName ?? t.reservations.customerPage.title}
        // Isolate the phone so "+963…" keeps its order inside Arabic text.
        subtitle={profile?.customerPhone ? `\u2066${profile.customerPhone}\u2069` : undefined}
        breadcrumbs={breadcrumbs}
      />

      {query.isLoading && (
        <p className="py-12 text-center text-body-md text-on-surface-variant">{t.common.loading}</p>
      )}

      {query.isError && (
        <EmptyState
          icon="error"
          title={t.reservations.customerPage.errorTitle}
          action={
            <button
              type="button"
              className="text-label-md font-semibold text-primary"
              onClick={() => void query.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {query.isSuccess && !profile && (
        <EmptyState icon="person" title={t.reservations.customerPage.empty} />
      )}

      {profile && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-xl bg-success/10 p-4">
              <p className="text-headline-md font-bold text-success tabular-nums">
                <Num>{profile.visitCount}</Num>
              </p>
              <p className="text-label-md text-on-surface">{t.reservations.customerPage.visits}</p>
            </div>
            <div className="rounded-xl bg-error/10 p-4">
              <p className="text-headline-md font-bold text-error tabular-nums">
                <Num>{profile.noShowCount}</Num>
              </p>
              <p className="text-label-md text-on-surface">{t.reservations.customerPage.noShows}</p>
            </div>
          </div>

          <h2 className="mb-3 flex items-center gap-2 text-label-lg font-semibold text-on-surface">
            <MaterialIcon name="event" size={18} className="text-primary" />
            {t.reservations.customerPage.bookings}
          </h2>
          {upcoming.length > 0 && (
            <section className="mb-6">
              <h3 className="mb-2 text-label-md text-on-surface-variant">
                {t.reservations.customerPage.upcoming} · <Num>{upcoming.length}</Num>
              </h3>
              <ul className="space-y-2">
                {upcoming.map((r) => (
                  <BookingRow key={r.reservationId} reservation={r} />
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="mb-2 text-label-md text-on-surface-variant">
                {t.reservations.customerPage.past} · <Num>{past.length}</Num>
              </h3>
              <ul className="space-y-2">
                {past.map((r) => (
                  <BookingRow key={r.reservationId} reservation={r} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

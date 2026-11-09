import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import type { ReservationView } from '@/lib/reservationView'

/** "Came through the offer …" chip for a reservation booked from an offer. */
export function ReservationOfferBadge({ offer }: { offer: ReservationView['offer'] }) {
  const { t } = useLocale()
  if (!offer) return null
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-warning-light px-2.5 py-0.5 text-label-sm font-semibold text-warning">
      <MaterialIcon name="local_offer" size={14} className="shrink-0" />
      <span className="truncate">{t.reservations.viaOffer.replace('{title}', offer.title)}</span>
    </span>
  )
}

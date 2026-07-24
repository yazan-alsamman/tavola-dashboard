import { Link, useParams } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'

/**
 * Reservation detail by ID is not available on the live backend (no GET /reservations/:id).
 * Mock lookup and fake lifecycle actions are intentionally removed.
 */
export function ReservationDetailPage() {
  const { id } = useParams()
  const { t } = useLocale()

  return (
    <div className="max-w-xl mx-auto text-center py-16 px-4">
      <MaterialIcon name="lock" size={40} className="text-on-surface-variant mx-auto mb-4" />
      <h1 className="text-headline-md text-on-surface mb-2">
        {t.reservations.backendGap.detailTitle}
      </h1>
      <p className="text-body-md text-on-surface-variant mb-2">
        {t.reservations.backendGap.detailBody}
      </p>
      {id && (
        <p className="text-label-sm text-on-surface-variant mb-6 font-mono break-all">{id}</p>
      )}
      <Link
        to="/reservations"
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-secondary-container text-on-secondary-container font-semibold"
      >
        <MaterialIcon name="arrow_back" size={16} />
        {t.nav.reservations}
      </Link>
    </div>
  )
}

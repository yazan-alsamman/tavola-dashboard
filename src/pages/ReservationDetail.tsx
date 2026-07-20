import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useToast } from '@/context/ToastContext'
import { formatTime } from '@/lib/utils'

export function ReservationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLocale()
  const { toast } = useToast()
  const {
    getReservation,
    confirmReservation,
    checkInReservation,
    seatReservation,
    completeReservation,
    cancelReservation,
  } = useRestaurant()
  const reservation = getReservation(id ?? '')
  const [showCancel, setShowCancel] = useState(false)

  if (!reservation) {
    return (
      <div className="text-center py-20">
        <p className="text-on-surface-variant">{t.common.noResults}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/reservations')}>
          <MaterialIcon name="arrow_back" size={16} /> {t.nav.reservations}
        </Button>
      </div>
    )
  }

  const actions = {
    confirm: () => { confirmReservation(reservation.id); toast('success', t.reservations.confirm, reservation.customerName) },
    checkIn: () => { checkInReservation(reservation.id); seatReservation(reservation.id); toast('success', t.reservations.checkIn, reservation.customerName) },
    complete: () => { completeReservation(reservation.id); toast('success', t.reservations.complete, reservation.customerName) },
    cancel: () => { cancelReservation(reservation.id); toast('info', t.status.cancelled, reservation.customerName); navigate('/reservations') },
  }

  return (
    <div>
      <Link to="/reservations" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4">
        <MaterialIcon name="arrow_back" size={16} />
        {t.nav.reservations}
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-2xl font-bold text-on-surface">{reservation.customerName}</h1>
            <StatusBadge status={reservation.status} label={t.status[reservation.status]} />
          </div>
          <p className="text-sm text-on-surface-variant flex items-center gap-2">
            <MaterialIcon name="smartphone" size={14} />
            {reservation.id} · {formatTime(reservation.time)} · {reservation.guestCount} {t.common.guests} · {reservation.tableName}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {reservation.status === 'pending' && (
            <>
              <Button onClick={actions.confirm}><MaterialIcon name="check_circle" size={16} /> {t.reservations.confirm}</Button>
              <Button variant="danger" onClick={() => setShowCancel(true)}><MaterialIcon name="cancel" size={16} /> {t.reservations.reject}</Button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <Button onClick={actions.checkIn}><MaterialIcon name="how_to_reg" size={16} /> {t.ops.seatGuest}</Button>
          )}
          {reservation.status === 'seated' && (
            <Button onClick={actions.complete}>{t.reservations.complete}</Button>
          )}
          {!['completed', 'cancelled'].includes(reservation.status) && (
            <Button variant="outline" onClick={() => setShowCancel(true)}>{t.common.cancel}</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">{t.reservations.customerInfo}</CardTitle>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-mauve-600 text-white flex items-center justify-center font-bold text-xl">
              {reservation.customerName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-lg text-on-surface">{reservation.customerName}</p>
              <p className="text-sm text-on-surface-variant">{t.reservations.customer}</p>
            </div>
          </div>
          <div className="space-y-3">
            <a href={`tel:${reservation.phone}`} className="flex items-center gap-3 text-sm p-3 rounded-xl bg-surface-container-lowest hover:bg-mauve-100 dark:hover:bg-mauve-900/50 transition-colors">
              <MaterialIcon name="call" size={16} className="text-primary" />
              <span className="font-medium">{reservation.phone}</span>
            </a>
            <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-surface-container-lowest">
              <MaterialIcon name="mail" size={16} className="text-on-surface-variant" />
              <span>{reservation.email || '—'}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">{t.reservations.reservationInfo}</CardTitle>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon="calendar_month" label={t.reservations.date} value={reservation.date} />
            <InfoItem icon="schedule" label={t.reservations.time} value={formatTime(reservation.time)} />
            <InfoItem icon="group" label={t.reservations.guests} value={`${reservation.guestCount}`} />
            <InfoItem icon="location_on" label={t.reservations.table} value={reservation.tableName} />
            <InfoItem icon="schedule" label="Duration" value={`${reservation.duration} min`} />
          </div>
        </Card>

        {reservation.occasion && (
          <Card className="border-primary/20 bg-primary-light/20">
            <CardTitle className="mb-3 flex items-center gap-2">
              <MaterialIcon name="cake" size={16} className="text-primary" filled />
              {t.reservations.occasionInfo}
            </CardTitle>
            <p className="text-sm capitalize font-semibold text-on-surface">{reservation.occasion}</p>
            {reservation.cakeTime && (
              <p className="text-sm text-on-surface-variant mt-1">Cake: {formatTime(reservation.cakeTime)}</p>
            )}
          </Card>
        )}

        {reservation.services && reservation.services.length > 0 && (
          <Card>
            <CardTitle className="mb-3">{t.reservations.services}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {reservation.services.map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-primary-light text-primary text-xs font-medium capitalize">
                  {s.replace('_', ' ')}
                </span>
              ))}
            </div>
          </Card>
        )}

        {reservation.notes && (
          <Card className="lg:col-span-2">
            <CardTitle className="mb-3">{t.reservations.notes}</CardTitle>
            <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
              {reservation.notes}
            </p>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={actions.cancel}
        title={t.reservations.reject}
        message={`Cancel reservation for ${reservation.customerName}?`}
        confirmLabel={t.common.confirm}
        variant="danger"
      />
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-container-lowest">
      <div className="flex items-center gap-2 mb-1">
        <MaterialIcon name={icon} size={14} className="text-on-surface-variant" />
        <p className="text-xs text-on-surface-variant">{label}</p>
      </div>
      <p className="text-sm font-semibold text-on-surface">{value}</p>
    </div>
  )
}

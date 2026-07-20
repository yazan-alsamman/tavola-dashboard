import { Link } from 'react-router-dom'
import { Num } from '@/components/ui/Num'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaterialIcon } from '@/components/ui/Icon'
import { FloorMapMini } from '@/components/floor/FloorMapSpatial'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { specialOccasions } from '@/data/mockData'
import { formatTime } from '@/lib/utils'

export function DashboardPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const { user } = useAuth()
  const {
    todayReservations,
    arrivingSoon,
    stats,
    pendingCount,
    waitlist,
    tables,
    confirmReservation,
    checkInReservation,
    seatReservation,
  } = useRestaurant()

  const pending = todayReservations.filter((r) => r.status === 'pending')
  const occasions = specialOccasions.filter((o) =>
    todayReservations.some((r) => r.id === o.reservationId),
  )

  const handleConfirm = (id: string, name: string) => {
    confirmReservation(id)
    toast('success', t.reservations.confirm, name)
  }

  const handleCheckIn = (id: string, name: string) => {
    checkInReservation(id)
    seatReservation(id)
    toast('success', t.reservations.checkIn, name)
  }

  const statCards = [
    { title: t.dashboard.todayReservations, value: stats.todayTotal, icon: 'calendar_today', hint: '+12%' },
    { title: t.ops.occupancy, value: `${stats.occupancyRate}%`, icon: 'group', hint: t.ops.covers },
    { title: t.ops.arrivingSoon, value: arrivingSoon.length, icon: 'login', hint: t.ops.liveNow },
    { title: t.status.pending, value: pendingCount, icon: 'pending_actions', hint: 'New', alert: pendingCount > 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-lg text-on-surface">{t.ops.operationsTitle}</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            {t.login.title}, {user?.name?.split(' ')[0] ?? ''}. {t.dashboard.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/walk-in">
            <Button variant="secondary" size="md">
              <MaterialIcon name="add" size={18} /> {t.walkIn.title}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:border-primary/30 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="p-2 bg-primary-container/10 rounded-lg text-primary">
                <MaterialIcon name={card.icon} size={20} />
              </div>
              {card.alert ? (
                <span className="bg-error text-on-error text-[10px] px-1.5 rounded-full">{card.hint}</span>
              ) : (
                <span className="text-label-sm text-on-surface-variant">{card.hint}</span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider">{card.title}</p>
              <h3 className="text-display text-primary mt-1"><Num>{card.value}</Num></h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="directions_walk" className="text-primary" />
                {t.ops.arrivingSoon}
              </h3>
              <Link to="/reservations" className="text-primary text-label-md hover:underline">{t.common.viewAll}</Link>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {arrivingSoon.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-8">{t.ops.noArrivals}</p>
              ) : (
                arrivingSoon.slice(0, 4).map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-variant/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {r.customerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-body-md font-bold text-on-surface">{r.customerName}</p>
                        <p className="text-label-sm text-on-surface-variant">{r.tableName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-end">
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase">{t.reservations.time}</p>
                        <p className="text-body-md font-bold text-primary"><Num>{formatTime(r.time)}</Num></p>
                      </div>
                      <div>
                        <p className="text-label-sm text-on-surface-variant uppercase">{t.reservations.guests}</p>
                        <p className="text-body-md font-bold"><Num>{r.guestCount}</Num></p>
                      </div>
                      {r.status === 'confirmed' && (
                        <Button size="sm" onClick={() => handleCheckIn(r.id, r.customerName)}>
                          <MaterialIcon name="how_to_reg" size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="notifications_active" className="text-error" />
                {t.ops.needsAction}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {pending.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-6">{t.ops.allClear}</p>
              ) : (
                pending.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-surface-variant/30 flex flex-col items-center justify-center shrink-0">
                        <span className="font-bold text-primary text-sm"><Num>{r.guestCount}</Num></span>
                        <span className="text-[9px] uppercase text-on-surface-variant">{t.common.guests}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body-md font-bold">{r.customerName}</span>
                          <span className="bg-warning/10 text-warning text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{t.ops.fromApp}</span>
                        </div>
                        <p className="text-body-sm text-on-surface-variant">
                          <Num>{formatTime(r.time)}</Num> · <Num>{r.guestCount}</Num> {t.common.guests} · {r.tableName}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">{t.reservations.reject}</Button>
                      <Button size="sm" onClick={() => handleConfirm(r.id, r.customerName)}>
                        {t.reservations.confirm}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="grid_view" className="text-primary" />
                {t.floorPlan.title}
              </h3>
              <Link to="/floor-plan" className="text-primary text-label-md hover:underline">{t.common.view}</Link>
            </div>
            <div className="p-5">
              <FloorMapMini tables={tables} />
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                <MaterialIcon name="cake" filled className="text-warning" />
                {t.dashboard.specialOccasions}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {occasions.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-4">{t.common.noResults}</p>
              ) : (
                occasions.slice(0, 2).map((o) => (
                  <div key={o.id} className="flex items-start gap-4 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                    <div className="p-2 bg-warning/10 rounded-full text-warning">
                      <MaterialIcon name="celebration" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-body-md font-bold">{o.customerName}</span>
                        <StatusBadge status="pending" label={t.occasions.type} type="custom" />
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        <MaterialIcon name="schedule" size={14} className="inline align-middle me-1" />
                        <Num>{formatTime(o.executionTime)}</Num>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {waitlist.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-card-title flex items-center gap-2">
                  <MaterialIcon name="timer" className="text-primary" />
                  {t.waitlist.title}
                </h3>
                <Num className="text-headline-md text-primary font-bold">{waitlist.length}</Num>
              </div>
              {waitlist.slice(0, 2).map((w, i) => (
                <p key={w.id} className="text-body-sm text-on-surface-variant truncate">
                  <Num>{i + 1}</Num>. {w.name} · <Num>{w.guestCount}</Num>
                </p>
              ))}
              <Link to="/waitlist" className="text-label-md text-primary font-semibold mt-2 inline-block">{t.common.viewAll}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { Num } from '@/components/ui/Num'
import { MaterialIcon } from '@/components/ui/Icon'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useToast } from '@/context/ToastContext'
import { formatTime, getTodayISO, formatDisplayDate } from '@/lib/utils'

type FilterKey = 'today' | 'pending' | 'confirmed' | 'seated' | 'all'

export function ReservationsPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { reservations, todayReservations, stats, waitlist, confirmReservation, checkInReservation, seatReservation } = useRestaurant()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('today')

  const today = getTodayISO()

  const filtered = reservations.filter((r) => {
    const matchesSearch =
      !search ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search) ||
      r.id.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'all' ? true :
      filter === 'today' ? r.date === today :
      r.status === filter

    return matchesSearch && matchesFilter
  }).sort((a, b) => a.time.localeCompare(b.time))

  const counts = {
    today: todayReservations.length,
    pending: todayReservations.filter((r) => r.status === 'pending').length,
    confirmed: todayReservations.filter((r) => r.status === 'confirmed').length,
    seated: todayReservations.filter((r) => r.status === 'seated').length,
  }

  const handleCheckIn = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    checkInReservation(id)
    seatReservation(id)
    toast('success', t.reservations.checkIn, name)
  }

  const handleConfirm = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    confirmReservation(id)
    toast('success', t.reservations.confirm, name)
  }

  const summaryStats = [
    { label: t.dashboard.expectedGuests, value: stats.expectedGuests, hint: '+12%' },
    { label: t.status.pending, value: counts.pending, hint: counts.pending > 5 ? 'High' : '' },
    { label: t.waitlist.title, value: waitlist.length, hint: '' },
    { label: t.ops.occupancy, value: `${stats.occupancyRate}%`, isCapacity: true },
  ]

  return (
    <div>
      <PageHeader
        title={t.reservations.title}
        subtitle={t.reservations.subtitle}
        actions={
          <Button size="md">
            <MaterialIcon name="add" size={18} /> {t.reservations.confirm}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-on-surface-variant text-label-md">{stat.label}</span>
            {stat.isCapacity ? (
              <div className="mt-4">
                <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${stats.occupancyRate}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-on-surface-variant"><Num>{stats.occupancyRate}</Num>%</span>
                  <span className="text-[10px] text-on-surface-variant"><Num>{stats.availableTables}</Num> {t.status.available}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-end justify-between mt-4">
                <span className="text-headline-lg text-primary font-bold"><Num>{stat.value}</Num></span>
                {stat.hint && <span className="text-label-sm text-tertiary-container">{stat.hint}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest shadow-sm rounded-xl mb-6 p-4 md:p-5 border border-outline-variant/10">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <MaterialIcon name="search" size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              className="w-full ps-12 pe-4 py-2.5 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-body-md outline-none"
              placeholder={t.header.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label={t.common.today} count={counts.today} active={filter === 'today'} onClick={() => setFilter('today')} />
            <FilterChip label={t.status.pending} count={counts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} />
            <FilterChip label={t.status.confirmed} count={counts.confirmed} active={filter === 'confirmed'} onClick={() => setFilter('confirmed')} />
            <FilterChip label={t.status.seated} count={counts.seated} active={filter === 'seated'} onClick={() => setFilter('seated')} />
            <FilterChip label={t.common.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t.common.noResults} icon="event_busy" />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableHeader>{t.reservations.id}</DataTableHeader>
            <DataTableHeader>{t.reservations.customer}</DataTableHeader>
            <DataTableHeader>{t.reservations.time}</DataTableHeader>
            <DataTableHeader className="hidden sm:table-cell">{t.reservations.guests}</DataTableHeader>
            <DataTableHeader>{t.reservations.table}</DataTableHeader>
            <DataTableHeader>{t.reservations.status}</DataTableHeader>
            <DataTableHeader className="text-end">{t.common.actions}</DataTableHeader>
          </DataTableHead>
          <DataTableBody>
            {filtered.map((r) => (
              <DataTableRow key={r.id} onClick={() => navigate(`/reservations/${r.id}`)}>
                <DataTableCell className="text-body-sm text-outline">#{r.id}</DataTableCell>
                <DataTableCell>
                  <p className="font-semibold">{r.customerName}</p>
                  {r.occasion && <p className="text-[11px] text-primary/70 font-medium">{t.occasions.title}</p>}
                </DataTableCell>
                <DataTableCell>
                  <p className="text-body-md">{formatDisplayDate(r.date)}</p>
                  <p className="text-label-sm text-outline"><Num>{formatTime(r.time)}</Num></p>
                </DataTableCell>
                <DataTableCell className="hidden sm:table-cell"><Num>{r.guestCount}</Num></DataTableCell>
                <DataTableCell>
                  <span className="bg-surface-variant px-2 py-0.5 rounded text-label-sm">{r.tableName}</span>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge status={r.status} label={t.status[r.status]} />
                </DataTableCell>
                <DataTableCell className="text-end">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {r.status === 'pending' && (
                      <button className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors" onClick={(e) => handleConfirm(e, r.id, r.customerName)}>
                        <MaterialIcon name="check_circle" size={20} />
                      </button>
                    )}
                    {r.status === 'confirmed' && (
                      <button className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded transition-colors" onClick={(e) => handleCheckIn(e, r.id, r.customerName)}>
                        <MaterialIcon name="how_to_reg" size={20} />
                      </button>
                    )}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  )
}

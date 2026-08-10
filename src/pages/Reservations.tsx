import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReservationDto, ReservationStatusDto } from '@/api/reservations'
import { ReservationCreatePanel } from '@/components/reservations/ReservationCreatePanel'
import { PageHeader } from '@/components/ui/PageHeader'
import { MaterialIcon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Num } from '@/components/ui/Num'
import {
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/components/ui/DataTable'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useMyReservationsQuery } from '@/hooks/useReservationQueries'

const PAGE_SIZE = 20

const STATUS_OPTIONS: ReservationStatusDto[] = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
  'Expired',
  'NoShow',
]

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

function matchesSearch(reservation: ReservationDto, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    reservation.reservationId,
    reservation.tableId,
    reservation.branchId,
    reservation.restaurantId,
    reservation.notes ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

/**
 * Staff reservations hub — ownership-based list + availability create.
 */
export function ReservationsPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const {
    selectedBranch,
    selectedBranchId,
    status: scopeStatus,
    formatBranchLabel,
  } = useRestaurantScope()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ReservationStatusDto | ''>('')
  const [searchText, setSearchText] = useState('')

  const listQuery = useMyReservationsQuery(page, PAGE_SIZE)

  const filteredItems = useMemo(() => {
    const items = listQuery.data?.items ?? []
    return items.filter((reservation) => {
      if (statusFilter && reservation.status !== statusFilter) return false
      return matchesSearch(reservation, searchText)
    })
  }, [listQuery.data?.items, searchText, statusFilter])

  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader title={t.reservations.title} subtitle={t.reservations.subtitle} />

      <div className="mb-6 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 md:p-5">
        <div className="flex items-start gap-3">
          <MaterialIcon name="info" size={22} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h2 className="text-label-lg font-semibold text-on-surface">
              {t.reservations.backendGap.title}
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              {t.reservations.backendGap.body}
            </p>
            {selectedBranch && (
              <p className="text-label-sm text-on-surface-variant mt-2">
                {formatBranchLabel(selectedBranch)}
                {selectedBranchId ? ` · ${selectedBranchId.slice(0, 8)}…` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {(scopeStatus === 'ready' || scopeStatus === 'empty_branches') && (
        <div className="mb-8">
          <ReservationCreatePanel />
        </div>
      )}

      {listQuery.isLoading && (
        <p className="text-body-md text-on-surface-variant py-12 text-center">
          {t.common.loading}
        </p>
      )}

      {listQuery.isError && (
        <EmptyState
          icon="error"
          title={t.reservations.list.errorTitle}
          description={t.reservations.list.errorBody}
          action={
            <button
              type="button"
              className="text-label-md text-primary font-semibold"
              onClick={() => void listQuery.refetch()}
            >
              {t.scope.retry}
            </button>
          }
        />
      )}

      {listQuery.isSuccess && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                className="sm:max-w-xs"
                placeholder={t.reservations.list.searchPlaceholder}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                icon={<MaterialIcon name="search" size={18} />}
              />
              <Select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ReservationStatusDto | '')
                }
                aria-label={t.reservations.list.filterStatus}
              >
                <option value="">{t.common.all}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {reservationStatusLabel(status, t)}
                  </option>
                ))}
              </Select>
            </div>
            {total > 0 && (
              <p className="text-label-sm text-on-surface-variant whitespace-nowrap">
                {total} {t.reservations.list.totalCount}
              </p>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState
              title={
                listQuery.data.items.length === 0
                  ? t.reservations.list.emptyTitle
                  : t.reservations.list.emptyFiltered
              }
              description={
                listQuery.data.items.length === 0
                  ? t.reservations.list.emptyBody
                  : t.reservations.backendGap.listBody
              }
              icon="event_busy"
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>{t.reservations.date}</DataTableHeader>
                <DataTableHeader>{t.reservations.guests}</DataTableHeader>
                <DataTableHeader>{t.reservations.table}</DataTableHeader>
                <DataTableHeader>{t.reservations.status}</DataTableHeader>
                <DataTableHeader className="hidden md:table-cell">
                  {t.reservations.id}
                </DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {filteredItems.map((reservation) => (
                  <DataTableRow
                    key={reservation.reservationId}
                    onClick={() =>
                      navigate(`/reservations/${reservation.reservationId}`)
                    }
                  >
                    <DataTableCell>
                      <div className="flex flex-col">
                        <span>{formatInstant(reservation.reservationStartTime, locale)}</span>
                        <span className="text-label-sm text-on-surface-variant md:hidden font-mono truncate max-w-[10rem]">
                          {reservation.reservationId.slice(0, 8)}…
                        </span>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <Num>{reservation.guests}</Num>
                    </DataTableCell>
                    <DataTableCell className="font-mono text-label-sm">
                      {reservation.tableId.slice(0, 8)}…
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge
                        type="custom"
                        status={reservation.status}
                        label={reservationStatusLabel(reservation.status, t)}
                      />
                    </DataTableCell>
                    <DataTableCell className="hidden md:table-cell font-mono text-label-sm">
                      {reservation.reservationId.slice(0, 8)}…
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-label-sm text-on-surface-variant">
                {t.reservations.list.page} {page} {t.reservations.list.of} {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t.reservations.list.previous}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t.reservations.list.next}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

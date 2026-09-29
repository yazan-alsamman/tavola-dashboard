import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/context/LocaleContext'
import { useCalendarRangeReservationsQuery } from '@/hooks/useReservationQueries'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { shiftDateKey } from '@/lib/calendarDates'
import { reservationStatusLabel } from '@/lib/statusLabel'
import { getTodayISO } from '@/lib/utils'

export function GlobalSearch({
  autoFocus = false,
  enableShortcut = true,
  onDismiss,
}: {
  autoFocus?: boolean
  enableShortcut?: boolean
  onDismiss?: () => void
} = {}) {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searching = query.trim().length >= 2
  const today = getTodayISO()
  const listQuery = useCalendarRangeReservationsQuery(
    shiftDateKey(today, -14),
    shiftDateKey(today, 45),
    searching,
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const items = listQuery.data?.items ?? []
    return items.filter((r) => {
      const hay = [
        r.reservationId,
        r.customerName,
        r.customerPhone,
        r.tableNumber,
        r.tableId,
        r.status,
        r.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [listQuery.data?.items, query])

  const hasResults = results.length > 0

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!autoFocus) return
    ref.current?.querySelector('input')?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (!enableShortcut) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        ref.current?.querySelector('input')?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enableShortcut])

  const goTo = (path: string) => {
    navigate(path)
    setQuery('')
    setOpen(false)
    onDismiss?.()
  }

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex h-9 items-center rounded-lg border border-outline-variant bg-surface-container-lowest px-3">
        <MaterialIcon name="search" size={18} className="text-outline" />
        <input
          className="bg-transparent border-none focus:ring-0 text-body-sm w-full ms-2 outline-none placeholder:text-outline/50"
          placeholder={t.header.search}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full min-w-[280px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal z-50 overflow-hidden animate-scale-in">
          {listQuery.isLoading ? (
            <p className="p-4 text-body-sm text-on-surface-variant text-center">
              {t.common.loading}
            </p>
          ) : !hasResults ? (
            <p className="p-4 text-body-sm text-on-surface-variant text-center">
              {t.common.noResults}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <p className="px-4 pt-3 pb-1 text-label-md text-on-surface-variant">
                {t.reservations.title}
              </p>
              {results.map((r) => {
                const start = new Date(r.reservationStartTime)
                const timeLabel = Number.isNaN(start.getTime())
                  ? r.reservationDate
                  : start.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                return (
                  <button
                    key={r.reservationId}
                    type="button"
                    onClick={() => goTo(`/app/reservations/${r.reservationId}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-high transition-colors text-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                      <MaterialIcon name="event" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium truncate">
                        {r.customerName ?? t.reservations.board.guest}
                      </p>
                      <p className="text-label-sm text-on-surface-variant truncate">
                        <Num>{timeLabel}</Num>
                        {' · '}
                        <Num>{r.guests}</Num> {t.common.guests}
                        {r.tableNumber ? (
                          <>
                            {' · '}
                            {t.reservations.table} <Num>{r.tableNumber}</Num>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <StatusBadge
                      status={r.status}
                      label={reservationStatusLabel(r.status, t.status)}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

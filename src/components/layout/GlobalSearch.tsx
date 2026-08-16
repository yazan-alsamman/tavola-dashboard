import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/context/LocaleContext'
import { useMyReservationsQuery } from '@/hooks/useReservationQueries'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaterialIcon } from '@/components/ui/Icon'
import type { ReservationStatusDto } from '@/api/reservations'

export function GlobalSearch() {
  const { t } = useLocale()
  const listQuery = useMyReservationsQuery(1, 50)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const items = listQuery.data?.items ?? []
    return items.filter((r) => {
      const hay = `${r.reservationId} ${r.status} ${r.notes ?? ''} ${r.tableId}`.toLowerCase()
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
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        ref.current?.querySelector('input')?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const goTo = (path: string) => {
    navigate(path)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex items-center bg-surface-variant/50 rounded-full px-4 py-1.5">
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
          {!hasResults ? (
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
                  : start.toLocaleTimeString(undefined, {
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
                        {r.guests} {t.common.guests} · {r.reservationDate}
                      </p>
                      <p className="text-label-sm text-on-surface-variant">
                        {r.reservationId.slice(0, 8)} · {timeLabel}
                      </p>
                    </div>
                    <StatusBadge
                      status={r.status}
                      label={
                        t.status[r.status as ReservationStatusDto] ?? r.status
                      }
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

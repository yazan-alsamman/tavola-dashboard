import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { formatTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaterialIcon } from '@/components/ui/Icon'

export function GlobalSearch() {
  const { t } = useLocale()
  const { search } = useRestaurant()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const results = query.length >= 2 ? search(query) : { reservations: [], customers: [] }
  const hasResults = results.reservations.length > 0

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
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full min-w-[280px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal z-50 overflow-hidden animate-scale-in">
          {!hasResults ? (
            <p className="p-4 text-body-sm text-on-surface-variant text-center">{t.common.noResults}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <p className="px-4 pt-3 pb-1 text-label-md text-on-surface-variant">
                {t.reservations.title}
              </p>
              {results.reservations.map((r) => (
                <button
                  key={r.id}
                  onClick={() => goTo(`/reservations/${r.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-high transition-colors text-start"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
                    <MaterialIcon name="event" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium truncate">{r.customerName}</p>
                    <p className="text-label-sm text-on-surface-variant">{r.id} · {formatTime(r.time)} · {r.tableName}</p>
                  </div>
                  <StatusBadge status={r.status} label={t.status[r.status]} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { MaterialIcon } from '@/components/ui/Icon'
import { cn, formatTime } from '@/lib/utils'
import { Num } from '@/components/ui/Num'
import { FilterChip } from '@/components/ui/FilterChip'
import { useLocale } from '@/context/LocaleContext'
import type { Table, TableSection, TableStatus } from '@/types'

const sectionOrder: TableSection[] = ['indoor', 'outdoor', 'terrace', 'vip', 'family', 'private']

const zoneStyles: Record<TableSection, string> = {
  indoor: 'from-mauve-100/80 to-mauve-50/40 dark:from-mauve-900/40 dark:to-mauve-950/20 border-mauve-200/60',
  outdoor: 'from-emerald-50/80 to-green-50/30 dark:from-emerald-950/30 dark:to-green-950/10 border-emerald-200/50',
  terrace: 'from-sky-50/80 to-blue-50/30 dark:from-sky-950/30 dark:to-blue-950/10 border-sky-200/50',
  vip: 'from-amber-50/80 to-yellow-50/30 dark:from-amber-950/30 dark:to-yellow-950/10 border-amber-200/50',
  family: 'from-pink-50/80 to-rose-50/30 dark:from-pink-950/20 dark:to-rose-950/10 border-pink-200/50',
  private: 'from-violet-50/80 to-purple-50/30 dark:from-violet-950/30 dark:to-purple-950/10 border-violet-200/50',
}

const statusStyles: Record<TableStatus, { card: string; dot: string; ring: string }> = {
  available: {
    card: 'bg-white dark:bg-mauve-900/60 border-success/40 text-success shadow-success/10',
    dot: 'bg-success',
    ring: 'ring-success/30',
  },
  reserved: {
    card: 'bg-white dark:bg-mauve-900/60 border-info/40 text-info shadow-info/10',
    dot: 'bg-info',
    ring: 'ring-info/30',
  },
  occupied: {
    card: 'bg-white dark:bg-mauve-900/60 border-warning/50 text-warning shadow-warning/10',
    dot: 'bg-warning animate-pulse',
    ring: 'ring-warning/40',
  },
  out_of_service: {
    card: 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant opacity-55',
    dot: 'bg-on-surface-variant',
    ring: 'ring-outline-variant/30',
  },
}

interface FloorMapCanvasProps {
  tables: Table[]
  selectedId: string | null
  onSelect: (id: string) => void
  getGuestName?: (table: Table) => string | undefined
  getNextTime?: (table: Table) => string | undefined
}

export function FloorMapCanvas({
  tables,
  selectedId,
  onSelect,
  getGuestName,
  getNextTime,
}: FloorMapCanvasProps) {
  const { t } = useLocale()
  const [sectionFilter, setSectionFilter] = useState<TableSection | 'all'>('all')

  const stats = useMemo(() => ({
    available: tables.filter((tb) => tb.status === 'available').length,
    reserved: tables.filter((tb) => tb.status === 'reserved').length,
    occupied: tables.filter((tb) => tb.status === 'occupied').length,
    out: tables.filter((tb) => tb.status === 'out_of_service').length,
  }), [tables])

  const grouped = useMemo(() => {
    const map = new Map<TableSection, Table[]>()
    sectionOrder.forEach((s) => map.set(s, []))
    tables.forEach((tb) => {
      if (sectionFilter === 'all' || tb.section === sectionFilter) {
        map.get(tb.section)?.push(tb)
      }
    })
    return sectionOrder
      .map((s) => ({ section: s, tables: map.get(s) ?? [] }))
      .filter((z) => z.tables.length > 0)
  }, [tables, sectionFilter])

  return (
    <div className="space-y-4">
      {/* Stats ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(
          [
            { key: 'available' as const, count: stats.available, color: 'text-success bg-success-light' },
            { key: 'reserved' as const, count: stats.reserved, color: 'text-info bg-info-light' },
            { key: 'occupied' as const, count: stats.occupied, color: 'text-warning bg-warning-light' },
            { key: 'out_of_service' as const, count: stats.out, color: 'text-on-surface-variant bg-surface-container-lowest' },
          ] as const
        ).map(({ key, count, color }) => (
          <div key={key} className={cn('flex items-center justify-between p-3 rounded-xl border border-outline-variant/30', color)}>
            <span className="text-xs font-semibold">{t.status[key]}</span>
            <Num className="text-lg font-bold">{count}</Num>
          </div>
        ))}
      </div>

      {/* Section filters */}
      <div className="flex flex-wrap gap-2">
        <FilterChip label={t.floorPlan.filterAll} active={sectionFilter === 'all'} onClick={() => setSectionFilter('all')} />
        {sectionOrder.map((s) => {
          const count = tables.filter((tb) => tb.section === s).length
          if (!count) return null
          return (
            <FilterChip
              key={s}
              label={t.floorPlan[s]}
              count={count}
              active={sectionFilter === s}
              onClick={() => setSectionFilter(s)}
            />
          )
        })}
      </div>

      {/* Guide */}
      <div className="flex gap-3 p-4 rounded-xl bg-primary-light/40 border border-primary/15">
        <MaterialIcon name="info" size={20} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-on-surface">{t.floorPlan.guideTitle}</p>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{t.floorPlan.guideText}</p>
        </div>
      </div>

      {/* Floor canvas */}
      <div className="relative rounded-2xl border-2 border-outline-variant/30 bg-gradient-to-b from-surface to-surface-secondary p-4 sm:p-6 overflow-hidden">
        {/* Decorative header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-outline-variant/30">
          <div className="px-4 py-2 rounded-lg bg-mauve-200/50 dark:bg-mauve-800/40 text-xs font-bold text-on-surface-variant">
            {t.floorPlan.kitchen}
          </div>
          <p className="text-xs text-on-surface-variant hidden sm:block">{t.floorPlan.tapHint}</p>
          <div className="px-4 py-2 rounded-lg bg-mauve-200/50 dark:bg-mauve-800/40 text-xs font-bold text-on-surface-variant">
            {t.floorPlan.bar}
          </div>
        </div>

        <div className="space-y-5">
          {grouped.map(({ section, tables: zoneTables }) => (
            <section
              key={section}
              className={cn(
                'rounded-2xl border-2 p-4 sm:p-5 bg-gradient-to-br',
                zoneStyles[section],
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <MaterialIcon name="event_seat" size={16} className="text-primary" />
                  {t.floorPlan[section]}
                </h3>
                <span className="text-xs text-on-surface-variant">
                  <Num>{zoneTables.length}</Num> {t.floorPlan.tablesCount}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {zoneTables.map((table) => {
                  const styles = statusStyles[table.status]
                  const guest = getGuestName?.(table)
                  const nextTime = getNextTime?.(table)
                  const isSelected = selectedId === table.id

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => onSelect(table.id)}
                      className={cn(
                        'relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2',
                        'transition-all duration-200 min-h-[100px] shadow-card hover:shadow-elevated hover:-translate-y-0.5',
                        styles.card,
                        isSelected && cn('ring-2 ring-offset-2 scale-[1.03] z-10', styles.ring),
                        table.status === 'out_of_service' && 'cursor-not-allowed hover:translate-y-0',
                      )}
                    >
                      <span className={cn('absolute top-2.5 end-2.5 w-2.5 h-2.5 rounded-full', styles.dot)} />
                      <Num className="text-lg font-bold leading-none">
                        {table.number}
                      </Num>
                      <span className="text-[10px] font-medium opacity-80 mt-1 truncate max-w-full">
                        {table.name.replace('Table ', 'طاولة ').replace('VIP ', 'كبار ').replace('Terrace ', 'تراس ').replace('Family ', 'عائلي ').replace('Private ', 'خاص ')}
                      </span>
                      <div className="flex items-center gap-1 mt-2 text-[10px] opacity-75">
                        <MaterialIcon name="group" size={12} />
                        <Num>{table.capacity}</Num>
                      </div>
                      {guest && (
                        <p className="text-[10px] font-semibold mt-2 truncate max-w-full text-center leading-tight">
                          {guest}
                        </p>
                      )}
                      {nextTime && !guest && (
                        <p className="text-[10px] mt-2 opacity-80">
                          <Num>{formatTime(nextTime)}</Num>
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Entrance */}
        <div className="mt-6 mx-auto max-w-xs">
          <div className="h-10 rounded-xl bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-primary tracking-wide">↓ {t.floorPlan.entrance} ↓</span>
          </div>
        </div>
      </div>
    </div>
  )
}

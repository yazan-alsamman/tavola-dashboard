import { useRef, type KeyboardEvent } from 'react'
import type { FloorPlanDto } from '@/api/floorPlans'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'

interface FloorAreaTabsProps {
  floorPlans: FloorPlanDto[]
  selectedId: string | null
  /** Tables per floor plan; `null` while the branch table list is loading. */
  tableCounts: Map<string, number> | null
  onSelect: (floorPlanId: string) => void
  canManage: boolean
  onAdd: () => void
  /** When set, the first tab shows every floor plan on one canvas. */
  allSelected?: boolean
  onSelectAll?: () => void
}

/** One tab per backend FloorPlan. Each floor plan is a named area of the branch. */
export function FloorAreaTabs({
  floorPlans,
  selectedId,
  tableCounts,
  onSelect,
  canManage,
  onAdd,
  allSelected = false,
  onSelectAll,
}: FloorAreaTabsProps) {
  const { t, isRTL } = useLocale()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const focusTab = (index: number) => {
    const count = floorPlans.length
    const next = (index + count) % count
    const plan = floorPlans[next]
    if (!plan) return
    onSelect(plan.floorPlanId)
    tabRefs.current[next]?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = isRTL ? 'ArrowLeft' : 'ArrowRight'
    const backward = isRTL ? 'ArrowRight' : 'ArrowLeft'
    if (e.key === forward) focusTab(index + 1)
    else if (e.key === backward) focusTab(index - 1)
    else if (e.key === 'Home') focusTab(0)
    else if (e.key === 'End') focusTab(floorPlans.length - 1)
    else return
    e.preventDefault()
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        role="tablist"
        aria-label={t.floorPlan.areasLabel}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
      >
        {onSelectAll && (
          <button
            type="button"
            role="tab"
            aria-selected={allSelected}
            tabIndex={allSelected ? 0 : -1}
            onClick={onSelectAll}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-start transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              allSelected
                ? 'border-primary bg-primary-container text-on-primary-container shadow-sm'
                : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container-low',
            )}
          >
            <span className="text-label-lg font-semibold">{t.floorPlan.allAreas}</span>
          </button>
        )}
        {floorPlans.map((plan, index) => {
          const selected = !allSelected && plan.floorPlanId === selectedId
          const count = tableCounts?.get(plan.floorPlanId) ?? 0
          return (
            <button
              key={plan.floorPlanId}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(plan.floorPlanId)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              title={plan.isActive ? t.floorPlan.guestVisibleHint : undefined}
              className={cn(
                'group flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-start transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                selected
                  ? 'border-primary bg-primary-container text-on-primary-container shadow-sm'
                  : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container-low',
              )}
            >
              <span className="max-w-48 truncate text-label-lg font-semibold">
                {plan.name}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-label-sm tabular-nums',
                  selected
                    ? 'bg-primary/15 text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant',
                )}
                aria-label={`${count} ${t.floorPlan.tablesCount}`}
              >
                {tableCounts ? <Num>{count}</Num> : '·'}
              </span>
              {plan.isActive && (
                <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-label-sm font-semibold text-success">
                  <MaterialIcon name="visibility" size={14} />
                  {t.floorPlan.guestVisible}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {canManage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="shrink-0"
        >
          <MaterialIcon name="add" size={18} />
          {t.floorPlan.addArea}
        </Button>
      )}
    </div>
  )
}

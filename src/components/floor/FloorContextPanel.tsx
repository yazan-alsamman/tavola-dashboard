import type { FloorPlanDto } from '@/api/floorPlans'
import { Button } from '@/components/ui/Button'
import { MaterialIcon } from '@/components/ui/Icon'
import { Num } from '@/components/ui/Num'
import { useLocale } from '@/context/LocaleContext'
import { areaTint } from '@/lib/floorAreas'

interface FloorContextPanelProps {
  floorPlans: FloorPlanDto[]
  tableCounts: Map<string, number> | null
  /** Area shown in the inspector. Null is the restaurant overview. */
  area: FloorPlanDto | null
  areaIndex: number
  canManage: boolean
  duplicating: boolean
  onFocusArea: (floorPlanId: string) => void
  onDuplicateArea: (floorPlanId: string) => void
  onShowToGuests: (floorPlanId: string) => void
  showingToGuests: boolean
}

export function FloorContextPanel({
  floorPlans,
  tableCounts,
  area,
  areaIndex,
  canManage,
  duplicating,
  onFocusArea,
  onDuplicateArea,
  onShowToGuests,
  showingToGuests,
}: FloorContextPanelProps) {
  const { t } = useLocale()

  if (!area) {
    return (
      <aside className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm">
        <p className="text-label-lg font-semibold text-on-surface">
          {t.floorPlan.overviewTitle}
        </p>
        <p className="mt-2 text-body-sm text-on-surface-variant leading-relaxed">
          {t.floorPlan.overviewLead}
        </p>
        <p className="mt-3 text-label-sm font-semibold text-on-surface">
          {t.floorPlan.areaSuggestionsLabel}
        </p>
        <ul className="mt-1 space-y-1 text-body-sm text-on-surface-variant">
          {t.floorPlan.areaSuggestions.slice(0, 4).map((name) => (
            <li key={name}>· {name}</li>
          ))}
        </ul>
        <p className="mt-3 text-label-sm text-on-surface-variant leading-relaxed">
          {t.floorPlan.overviewThenTables}
        </p>
        {floorPlans.length > 0 && (
          <ul className="mt-4 space-y-2">
            {floorPlans.map((plan, index) => {
              const tint = areaTint(index)
              const count = tableCounts?.get(plan.floorPlanId)
              return (
                <li key={plan.floorPlanId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-surface-container-low"
                    onClick={() => onFocusArea(plan.floorPlanId)}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tint.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-label-md font-semibold text-on-surface">
                      {plan.name}
                    </span>
                    <span className="text-label-sm text-on-surface-variant tabular-nums">
                      {count == null ? '·' : <Num>{count}</Num>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-4 text-label-sm text-on-surface-variant leading-relaxed">
          {t.floorPlan.areaBoundsNote}
        </p>
      </aside>
    )
  }

  const tint = areaTint(areaIndex)
  const count = tableCounts?.get(area.floorPlanId)

  return (
    <aside className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tint.dot}`} />
        <p className="min-w-0 flex-1 truncate text-label-lg font-semibold text-on-surface">
          {area.name}
        </p>
      </div>
      <dl className="mt-3 space-y-2 text-label-md">
        <div className="flex justify-between gap-3">
          <dt className="text-on-surface-variant">{t.floorPlan.tablesCount}</dt>
          <dd className="font-semibold text-on-surface">
            {count == null ? '·' : <Num>{count}</Num>}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-on-surface-variant">{t.floorPlan.guestVisible}</dt>
          <dd className="font-semibold text-on-surface">
            {area.isActive ? t.floorPlan.guestVisible : t.floorPlan.guestsHidden}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-label-sm text-on-surface-variant leading-relaxed">
        {t.floorPlan.areaBoundsNote}
      </p>
      <p className="mt-2 text-label-sm text-on-surface-variant leading-relaxed">
        {t.floorPlan.areaColorNote}
      </p>
      <p className="mt-2 text-label-sm text-on-surface-variant leading-relaxed">
        {t.floorPlan.deleteAreaUnavailable}
      </p>
      {canManage && (
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" size="sm" onClick={() => onFocusArea(area.floorPlanId)}>
            <MaterialIcon name="zoom_in" size={16} />
            {t.floorPlan.focusArea}
          </Button>
          {!area.isActive && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={showingToGuests}
              loading={showingToGuests}
              onClick={() => onShowToGuests(area.floorPlanId)}
            >
              {t.floorPlan.showToGuests}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={duplicating}
            loading={duplicating}
            onClick={() => onDuplicateArea(area.floorPlanId)}
          >
            {duplicating ? t.floorPlan.duplicatingArea : t.floorPlan.duplicateArea}
          </Button>
        </div>
      )}
    </aside>
  )
}

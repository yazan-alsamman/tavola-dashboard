import { Card, CardTitle } from '@/components/ui/Card'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { BranchPauseButton, BranchPlanBadge } from './BranchPlanStatus'

/**
 * Backend ADR-053: the invoice stays with the restaurant's organization; each
 * branch shows its own plan state (free trial, active, paused).
 */
export function BranchPlansCard() {
  const { t } = useLocale()
  const { branches, selectedRestaurantId, formatBranchLabel } = useRestaurantScope()
  const labels = t.settings.subscriptionPlan

  return (
    <Card className="lg:col-span-2">
      <CardTitle className="mb-1">{labels.branchesTitle}</CardTitle>
      <p className="mb-4 text-sm text-on-surface-variant">{labels.branchesHint}</p>
      {branches.length === 0 || !selectedRestaurantId ? (
        <p className="text-sm text-on-surface-variant">{t.branches.emptyTitle}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/60">
          {branches.map((branch) => (
            <li
              key={branch.branchId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-on-surface">{formatBranchLabel(branch)}</p>
                <BranchPlanBadge branch={branch} />
              </div>
              <BranchPauseButton restaurantId={selectedRestaurantId} branch={branch} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

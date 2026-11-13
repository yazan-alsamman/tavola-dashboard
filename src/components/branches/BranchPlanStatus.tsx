import { useMutation } from '@tanstack/react-query'
import { setBranchPaused, type BranchDto, type BranchSubscriptionStatus } from '@/api/branches'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useToast } from '@/context/ToastContext'
import { apiErrorText } from '@/lib/apiErrorText'
import { formatDate } from '@/lib/format'

const STATUS_TONE: Record<BranchSubscriptionStatus, BadgeTone> = {
  Trial: 'info',
  Active: 'success',
  Paused: 'warning',
}

/** Backend ADR-053: the status a branch reports; older backends send none, which means Active. */
export function branchPlanStatus(branch: BranchDto): BranchSubscriptionStatus {
  return branch.subscriptionStatus ?? 'Active'
}

/** The branch's plan state as a badge, with the trial end while it lasts. */
export function BranchPlanBadge({ branch }: { branch: BranchDto }) {
  const { t, locale } = useLocale()
  const status = branchPlanStatus(branch)
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge tone={STATUS_TONE[status]} dot>
        {t.branches.plan.status[status]}
      </Badge>
      {status === 'Trial' && branch.trialEndsAt && (
        <span className="text-label-sm text-on-surface-variant">
          {t.branches.plan.trialUntil.replace('{date}', formatDate(branch.trialEndsAt, locale))}
        </span>
      )}
    </span>
  )
}

interface BranchPauseButtonProps {
  restaurantId: string
  branch: BranchDto
}

/** Pause hides the branch from guests and stops online bookings; resume undoes it. */
export function BranchPauseButton({ restaurantId, branch }: BranchPauseButtonProps) {
  const { t } = useLocale()
  const { toast } = useToast()
  const { refreshScope } = useRestaurantScope()
  const paused = branchPlanStatus(branch) === 'Paused'
  const mutation = useMutation({
    mutationFn: () => setBranchPaused(restaurantId, branch.branchId, !paused),
    onSuccess: () => {
      toast('success', paused ? t.branches.plan.resumed : t.branches.plan.paused)
      refreshScope()
    },
    onError: (err) => toast('error', apiErrorText(err, t, t.login.errors.unknown)),
  })
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={mutation.isPending}
      title={paused ? undefined : t.branches.plan.pauseHint}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? t.common.loading : paused ? t.branches.plan.resume : t.branches.plan.pause}
    </Button>
  )
}

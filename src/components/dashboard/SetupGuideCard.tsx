import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { MaterialIcon } from '@/components/ui/Icon'
import { useLocale } from '@/context/LocaleContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useCanManageInventory } from '@/hooks/usePermissions'
import { useSetupProgress } from '@/hooks/useSetupProgress'
import { SETUP_STEP_LINKS, SETUP_STEPS } from '@/lib/setupProgress'
import { cn } from '@/lib/utils'

const HIDDEN_KEY = 'tavla-setup-guide-hidden'

function readHidden(restaurantId: string | null): boolean {
  if (!restaurantId) return false
  try {
    return localStorage.getItem(`${HIDDEN_KEY}:${restaurantId}`) === '1'
  } catch {
    return false
  }
}

/**
 * Owner sheet "onboarding wizard": walks a new restaurant through setup one
 * step at a time with a completion percentage. Owner/Admin only; disappears
 * once every step is done. Hiding it is a per-browser convenience.
 */
export function SetupGuideCard() {
  const { t, locale } = useLocale()
  const canManage = useCanManageInventory()
  const { selectedRestaurantId } = useRestaurantScope()
  const progress = useSetupProgress(canManage)
  const [hiddenFor, setHiddenFor] = useState<string | null>(null)
  const hidden = hiddenFor === selectedRestaurantId || readHidden(selectedRestaurantId)
  const labels = t.dashboard.setup

  if (!canManage || !progress || progress.next === null || hidden) return null

  const hide = () => {
    try {
      localStorage.setItem(`${HIDDEN_KEY}:${selectedRestaurantId}`, '1')
    } catch {
      // Storage may be blocked; hiding still lasts for this visit.
    }
    setHiddenFor(selectedRestaurantId)
  }

  const percent = new Intl.NumberFormat(locale, { style: 'percent' }).format(progress.percent / 100)

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{labels.title}</CardTitle>
          <p className="mt-1 text-sm text-on-surface-variant">{labels.subtitle}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={hide}>
          {labels.hide}
        </Button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-label={labels.title}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
        </div>
        <span className="text-sm font-semibold text-on-surface">{percent}</span>
      </div>
      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {SETUP_STEPS.map((step) => {
          const done = progress.done[step]
          const isNext = step === progress.next
          return (
            <li key={step}>
              <Link
                to={SETUP_STEP_LINKS[step]}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  isNext
                    ? 'border-primary bg-primary/5 text-on-surface'
                    : 'border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <MaterialIcon
                  name={done ? 'check_circle' : isNext ? 'arrow_circle_right' : 'radio_button_unchecked'}
                  size={18}
                  className={done ? 'text-success' : isNext ? 'text-primary' : undefined}
                />
                <span className={cn(done && 'line-through')}>{labels.steps[step]}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

import type { ReactNode } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { MaterialIcon } from '@/components/ui/Icon'

/**
 * Blocks main content until restaurant/branch scope is usable,
 * or shows an actionable empty/error/forbidden state.
 */
export function ScopeGate({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  const { logout } = useAuth()
  const { status, refreshScope } = useRestaurantScope()

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-on-surface-variant">
        <div
          className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="text-body-md">{t.scope.loading}</p>
      </div>
    )
  }

  if (status === 'ready' || status === 'empty_branches') {
    // empty_branches: shell can still show restaurant identity; pages see empty branch state via scope
    if (status === 'empty_branches') {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-6">
          <MaterialIcon name="store" size={36} className="text-on-surface-variant" />
          <h2 className="text-headline-md text-on-surface">{t.scope.noBranchesTitle}</h2>
          <p className="text-body-md text-on-surface-variant max-w-md">{t.scope.noBranchesBody}</p>
          <button
            type="button"
            onClick={refreshScope}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md"
          >
            {t.scope.retry}
          </button>
        </div>
      )
    }
    return <>{children}</>
  }

  if (status === 'empty_restaurants') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-6">
        <MaterialIcon name="storefront" size={36} className="text-on-surface-variant" />
        <h2 className="text-headline-md text-on-surface">{t.scope.noRestaurantsTitle}</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">{t.scope.noRestaurantsBody}</p>
        <button
          type="button"
          onClick={() => {
            void logout()
          }}
          className="mt-2 px-4 py-2 rounded-lg border border-outline-variant text-label-md text-on-surface"
        >
          {t.header.logout}
        </button>
      </div>
    )
  }

  if (status === 'forbidden') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-6">
        <MaterialIcon name="lock" size={36} className="text-on-surface-variant" />
        <h2 className="text-headline-md text-on-surface">{t.scope.forbiddenTitle}</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">{t.scope.forbiddenBody}</p>
        <button
          type="button"
          onClick={() => {
            void logout()
          }}
          className="mt-2 px-4 py-2 rounded-lg border border-outline-variant text-label-md text-on-surface"
        >
          {t.header.logout}
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center px-6">
      <MaterialIcon name="error" size={36} className="text-error" />
      <h2 className="text-headline-md text-on-surface">{t.scope.errorTitle}</h2>
      <p className="text-body-md text-on-surface-variant max-w-md">{t.scope.errorBody}</p>
      <button
        type="button"
        onClick={refreshScope}
        className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md"
      >
        {t.scope.retry}
      </button>
    </div>
  )
}

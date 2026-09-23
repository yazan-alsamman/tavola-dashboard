import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocale } from '@/context/LocaleContext'
import { useSidebar } from '@/context/SidebarContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationPopover } from './NotificationPopover'
import { MaterialIcon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Scope selector styled as a real form control rather than a coloured pill, so
 * it reads as "this changes what you're looking at" instead of decoration.
 */
function ScopeChip({
  icon,
  children,
  className,
}: {
  icon: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'hidden lg:flex h-9 items-center gap-2 rounded-lg border border-outline-variant',
        'bg-surface-container-lowest ps-3 pe-2',
        'transition-colors duration-[var(--duration-fast)] hover:border-outline',
        className,
      )}
    >
      <MaterialIcon name={icon} size={15} className="text-outline shrink-0" />
      {children}
    </div>
  )
}

const bareSelect = cn(
  'max-w-[150px] truncate cursor-pointer border-none bg-transparent',
  'text-label-md text-on-surface focus:outline-none',
)

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { t, toggleLocale } = useLocale()
  const { toggle, isCollapsed, toggleCollapse } = useSidebar()
  const { user } = useAuth()
  const {
    status,
    restaurants,
    branches,
    selectedRestaurant,
    selectedBranch,
    selectedRestaurantId,
    selectedBranchId,
    selectRestaurant,
    selectBranch,
    formatBranchLabel,
  } = useRestaurantScope()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const scopeReady = status === 'ready' || status === 'empty_branches'
  const showRestaurantSwitcher = scopeReady && restaurants.length > 1
  const showBranchSwitcher = scopeReady && branches.length > 0

  useEffect(() => {
    if (!profileOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-3 px-4 lg:px-8',
        'glass bg-surface/85 border-b border-outline-variant/50',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggle}
          aria-label={t.header.openMenu}
        >
          <MaterialIcon name="menu" size={20} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={toggleCollapse}
          aria-label={t.header.toggleSidebar}
          aria-pressed={isCollapsed}
        >
          <MaterialIcon name={isCollapsed ? 'chevron_right' : 'chevron_left'} size={20} className="rtl:rotate-180" />
        </Button>

        <span className="lg:hidden text-headline-md font-bold text-primary">Tavola</span>

        <div className="hidden lg:block w-full max-w-sm">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {status === 'loading' && (
          <span className="hidden lg:inline text-body-sm text-on-surface-variant">
            {t.scope.loading}
          </span>
        )}

        {showRestaurantSwitcher && selectedRestaurantId && (
          <ScopeChip icon="storefront">
            <select
              value={selectedRestaurantId}
              onChange={(e) => selectRestaurant(e.target.value)}
              className={bareSelect}
              aria-label={t.scope.restaurantSelector}
            >
              {restaurants.map((r) => (
                <option key={r.restaurantId} value={r.restaurantId}>
                  {r.name}
                </option>
              ))}
            </select>
          </ScopeChip>
        )}

        {showBranchSwitcher && selectedBranchId && (
          <ScopeChip icon="location_on">
            <select
              value={selectedBranchId}
              onChange={(e) => selectBranch(e.target.value)}
              className={bareSelect}
              aria-label={t.header.branch}
            >
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {formatBranchLabel(b)}
                </option>
              ))}
            </select>
          </ScopeChip>
        )}

        {!showBranchSwitcher && selectedRestaurant && status === 'ready' && (
          <ScopeChip icon="storefront" className="pe-3">
            <span className="max-w-[150px] truncate text-label-md text-on-surface">
              {selectedRestaurant.name}
            </span>
          </ScopeChip>
        )}

        <div className="mx-1 hidden h-6 w-px bg-outline-variant/60 lg:block" />

        <Button variant="ghost" size="icon" onClick={toggleLocale} aria-label={t.header.language}>
          <MaterialIcon name="language" size={19} />
        </Button>

        <NotificationPopover />

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t.header.theme}>
          <MaterialIcon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={19} />
        </Button>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label={t.header.account}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full text-label-md font-bold',
              'bg-primary-subtle text-primary ring-1 ring-primary-border',
              'transition-colors duration-[var(--duration-fast)] hover:bg-primary-fixed',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            )}
          >
            {user?.initials ?? '—'}
          </button>

          {profileOpen && (
            <div
              role="menu"
              className={cn(
                'absolute end-0 top-full mt-2 w-64 overflow-hidden rounded-xl',
                'border border-outline-variant/60 bg-surface-container-lowest elev-4 animate-scale-in',
              )}
            >
              <div className="px-4 py-3">
                <p className="text-label-lg text-on-surface truncate">{user?.displayName}</p>
                <p className="text-body-sm text-on-surface-variant truncate">{user?.email}</p>
              </div>

              {(selectedRestaurant || selectedBranch) && (
                <div className="border-t border-outline-variant/50 px-4 py-3 space-y-2">
                  {selectedRestaurant && (
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <MaterialIcon name="storefront" size={14} className="text-outline" />
                      <span className="truncate">{selectedRestaurant.name}</span>
                    </div>
                  )}
                  {selectedBranch && (
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <MaterialIcon name="location_on" size={14} className="text-outline" />
                      <span className="truncate">{formatBranchLabel(selectedBranch)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

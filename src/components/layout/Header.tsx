import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  'max-w-[150px] truncate cursor-pointer border-none bg-surface-container-lowest',
  'text-label-md text-on-surface focus:outline-none',
)

const sheetSelect = cn(
  'h-10 w-full cursor-pointer rounded-lg border border-outline-variant',
  'bg-surface-container-lowest px-3 text-label-md text-on-surface',
)

function useIsLargeScreen() {
  const [matches, setMatches] = useState(() =>
    window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setMatches(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return matches
}

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { t, toggleLocale } = useLocale()
  const { toggle, isCollapsed, toggleCollapse } = useSidebar()
  const { user, logout } = useAuth()
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const isLarge = useIsLargeScreen()

  const scopeReady = status === 'ready' || status === 'empty_branches'
  const showRestaurantSwitcher = scopeReady && restaurants.length > 1
  const showBranchSwitcher = scopeReady && branches.length > 0
  const showMobileScope = scopeReady && (selectedRestaurant != null || showBranchSwitcher)
  const selectScheme = { colorScheme: theme === 'dark' ? 'dark' : 'light' } as const

  useEffect(() => {
    if (isLarge) {
      setSearchOpen(false)
      setScopeOpen(false)
    }
  }, [isLarge])

  useEffect(() => {
    if (!profileOpen && !searchOpen && !scopeOpen) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false)
      if (headerRef.current && !headerRef.current.contains(target)) {
        setSearchOpen(false)
        setScopeOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setSearchOpen(false)
        setScopeOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen, searchOpen, scopeOpen])

  useEffect(() => {
    if (isLarge) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setScopeOpen(false)
        setProfileOpen(false)
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isLarge])

  return (
    <header
      ref={headerRef}
      className={cn(
        'sticky top-[var(--logout-leave-banner-h,0px)] z-40 w-full',
        'glass bg-surface/85 border-b border-outline-variant/50',
      )}
    >
      <div className="flex h-16 w-full items-center justify-between gap-2 px-4 lg:gap-3 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
          variant="ghost"
          size="icon-sm"
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

        <span className="hidden text-headline-md font-bold text-primary sm:inline lg:hidden">Tavola</span>

        <div className="hidden lg:block w-full max-w-sm">
          <GlobalSearch enableShortcut={isLarge} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 lg:gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label={t.header.openSearch}
          aria-expanded={searchOpen}
          onClick={() => {
            setSearchOpen((open) => !open)
            setScopeOpen(false)
            setProfileOpen(false)
          }}
        >
          <MaterialIcon name="search" size={20} />
        </Button>

        {showMobileScope && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t.header.openScope}
            aria-expanded={scopeOpen}
            onClick={() => {
              setScopeOpen((open) => !open)
              setSearchOpen(false)
              setProfileOpen(false)
            }}
          >
            <MaterialIcon name="location_on" size={20} />
          </Button>
        )}
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
              style={selectScheme}
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
              style={selectScheme}
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
            onClick={() => {
              setProfileOpen((o) => !o)
              setSearchOpen(false)
              setScopeOpen(false)
            }}
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
                {user?.organization?.role && (
                  <p className="text-label-sm text-primary mt-1">
                    {t.orgRoles[user.organization.role]}
                  </p>
                )}
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

              <div className="border-t border-outline-variant/50 p-1">
                <Link
                  role="menuitem"
                  to="/app/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-high"
                >
                  <MaterialIcon name="settings" size={16} className="text-outline" />
                  {t.nav.settings}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false)
                    void logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-label-md text-on-surface hover:bg-surface-container-high"
                >
                  <MaterialIcon name="logout" size={16} className="text-outline" />
                  {t.header.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {searchOpen && (
        <div className="border-t border-outline-variant/50 px-4 pb-3 lg:hidden">
          <GlobalSearch
            autoFocus
            enableShortcut={false}
            onDismiss={() => setSearchOpen(false)}
          />
        </div>
      )}

      {scopeOpen && (
        <div className="space-y-3 border-t border-outline-variant/50 px-4 py-3 lg:hidden">
          {showRestaurantSwitcher && selectedRestaurantId && (
            <label className="block space-y-1">
              <span className="text-label-sm text-on-surface-variant">{t.scope.restaurantSelector}</span>
              <select
                value={selectedRestaurantId}
                onChange={(e) => selectRestaurant(e.target.value)}
                className={sheetSelect}
                aria-label={t.scope.restaurantSelector}
                style={selectScheme}
              >
                {restaurants.map((r) => (
                  <option key={r.restaurantId} value={r.restaurantId}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showBranchSwitcher && selectedBranchId && (
            <label className="block space-y-1">
              <span className="text-label-sm text-on-surface-variant">{t.header.branch}</span>
              <select
                value={selectedBranchId}
                onChange={(e) => selectBranch(e.target.value)}
                className={sheetSelect}
                aria-label={t.header.branch}
                style={selectScheme}
              >
                {branches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {formatBranchLabel(b)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!showRestaurantSwitcher && selectedRestaurant && (
            <p className="text-label-md text-on-surface">{selectedRestaurant.name}</p>
          )}
          {!showBranchSwitcher && selectedBranch && (
            <p className="text-body-sm text-on-surface-variant">{formatBranchLabel(selectedBranch)}</p>
          )}
        </div>
      )}
    </header>
  )
}

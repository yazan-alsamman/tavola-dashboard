import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocale } from '@/context/LocaleContext'
import { useSidebar } from '@/context/SidebarContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationPopover } from './NotificationPopover'
import { MaterialIcon } from '@/components/ui/Icon'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { t, toggleLocale } = useLocale()
  const { toggle } = useSidebar()
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
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full h-16 flex justify-between items-center px-4 lg:px-6 glass bg-surface/80 shadow-sm border-b border-outline-variant/10">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden p-2 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
          aria-label="Open menu"
        >
          <MaterialIcon name="menu" size={22} />
        </button>
        <div className="lg:hidden text-headline-md text-primary font-extrabold">Tavola</div>
        <div className="hidden lg:block flex-1 max-w-xs">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {status === 'loading' && (
          <span className="hidden lg:inline text-label-md text-on-surface-variant">
            {t.scope.loading}
          </span>
        )}

        {showRestaurantSwitcher && selectedRestaurantId && (
          <div className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 bg-secondary-container/30 rounded-full">
            <MaterialIcon name="storefront" size={16} className="text-primary" />
            <select
              value={selectedRestaurantId}
              onChange={(e) => selectRestaurant(e.target.value)}
              className="bg-transparent border-none text-label-md text-primary font-semibold cursor-pointer focus:outline-none max-w-[140px] truncate"
              aria-label={t.scope.restaurantSelector}
            >
              {restaurants.map((r) => (
                <option key={r.restaurantId} value={r.restaurantId}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showBranchSwitcher && selectedBranchId && (
          <div className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 bg-secondary-container/30 rounded-full">
            <MaterialIcon name="location_on" size={16} className="text-primary" />
            <select
              value={selectedBranchId}
              onChange={(e) => selectBranch(e.target.value)}
              className="bg-transparent border-none text-label-md text-primary font-semibold cursor-pointer focus:outline-none max-w-[140px] truncate"
              aria-label={t.header.branch}
            >
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {formatBranchLabel(b)}
                </option>
              ))}
            </select>
          </div>
        )}

        {!showBranchSwitcher && selectedRestaurant && status === 'ready' && (
          <div className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 bg-secondary-container/30 rounded-full">
            <MaterialIcon name="storefront" size={16} className="text-primary" />
            <span className="text-label-md text-primary font-semibold truncate max-w-[140px]">
              {selectedRestaurant.name}
            </span>
          </div>
        )}

        <button
          onClick={toggleLocale}
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
          aria-label={t.header.language}
        >
          <MaterialIcon name="language" size={20} />
        </button>

        <NotificationPopover />

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
        >
          <MaterialIcon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={20} />
        </button>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full overflow-hidden bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold hover:opacity-90 transition-opacity"
          >
            {user?.initials ?? 'U'}
          </button>

          {profileOpen && (
            <div className="absolute top-full end-0 mt-2 w-56 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal z-50 overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-outline-variant/30">
                <p className="font-semibold text-on-surface text-sm">{user?.displayName}</p>
                <p className="text-xs text-on-surface-variant">{user?.email}</p>
              </div>
              {selectedRestaurant && (
                <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center gap-2 text-xs text-on-surface-variant">
                  <MaterialIcon name="storefront" size={14} />
                  <span className="truncate">{selectedRestaurant.name}</span>
                </div>
              )}
              {selectedBranch && (
                <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center gap-2 text-xs text-on-surface-variant lg:hidden">
                  <MaterialIcon name="location_on" size={14} />
                  <span className="truncate">{formatBranchLabel(selectedBranch)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

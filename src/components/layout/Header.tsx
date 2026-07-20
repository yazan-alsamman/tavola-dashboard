import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLocale } from '@/context/LocaleContext'
import { useSidebar } from '@/context/SidebarContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationPopover } from './NotificationPopover'
import { MaterialIcon } from '@/components/ui/Icon'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { t, toggleLocale } = useLocale()
  const { toggle } = useSidebar()
  const { user } = useAuth()
  const { branches, activeBranchId, setActiveBranchId } = useRestaurant()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const activeBranch = branches.find((b) => b.id === activeBranchId)

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
        {activeBranch && (
          <div className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 bg-secondary-container/30 rounded-full">
            <MaterialIcon name="location_on" size={16} className="text-primary" />
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent border-none text-label-md text-primary font-semibold cursor-pointer focus:outline-none max-w-[120px] truncate"
              aria-label={t.header.branch}
            >
              {branches.filter((b) => b.active).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
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
                <p className="font-semibold text-on-surface text-sm">{user?.name}</p>
                <p className="text-xs text-on-surface-variant">{user?.email}</p>
              </div>
              {activeBranch && (
                <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center gap-2 text-xs text-on-surface-variant lg:hidden">
                  <MaterialIcon name="location_on" size={14} />
                  {activeBranch.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

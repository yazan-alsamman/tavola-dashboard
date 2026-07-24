import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useLocale } from '@/context/LocaleContext'
import { useSidebar } from '@/context/SidebarContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurant } from '@/context/RestaurantContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { Num } from '@/components/ui/Num'
import { MaterialIcon } from '@/components/ui/Icon'

type NavKey = keyof typeof import('@/i18n/en').en.nav

const opsNav: { key: NavKey; path: string; icon: string }[] = [
  { key: 'dashboard', path: '/', icon: 'dashboard' },
  { key: 'reservations', path: '/reservations', icon: 'event' },
  { key: 'floorPlan', path: '/floor-plan', icon: 'layers' },
  { key: 'waitlist', path: '/waitlist', icon: 'hourglass_empty' },
  { key: 'walkIn', path: '/walk-in', icon: 'directions_walk' },
  { key: 'calendar', path: '/calendar', icon: 'calendar_today' },
]

const mgmtNav: { key: NavKey; path: string; icon: string }[] = [
  { key: 'customers', path: '/customers', icon: 'group' },
  { key: 'specialOccasions', path: '/special-occasions', icon: 'star' },
  { key: 'tables', path: '/tables', icon: 'restaurant' },
]

const adminNav: { key: NavKey; path: string; icon: string }[] = [
  { key: 'reports', path: '/reports', icon: 'analytics' },
  { key: 'branches', path: '/branches', icon: 'store' },
  { key: 'settings', path: '/settings', icon: 'settings' },
  { key: 'activityLogs', path: '/activity-logs', icon: 'history' },
]

export function Sidebar() {
  const { t } = useLocale()
  const { isOpen, isCollapsed, close } = useSidebar()
  const { user, logout } = useAuth()
  const { pendingCount, waitlist } = useRestaurant()
  const { selectedRestaurant, status: scopeStatus } = useRestaurantScope()

  const badges: Partial<Record<NavKey, number>> = {
    reservations: pendingCount,
    waitlist: waitlist.length,
  }

  const renderGroup = (label: string, items: typeof opsNav) => (
    <div className="mb-2">
      {!isCollapsed && (
        <p className="px-4 mb-1 text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</p>
      )}
      <div className="space-y-0.5">
        {items.map(({ key, path, icon }) => (
          <NavLink
            key={key}
            to={path}
            end={path === '/'}
            onClick={close}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 text-label-md transition-all duration-200',
                isCollapsed && 'justify-center px-2',
                isActive
                  ? 'text-primary border-s-4 border-primary bg-primary-container/10'
                  : 'text-on-surface-variant hover:bg-surface-container-high border-s-4 border-transparent',
              )
            }
            title={isCollapsed ? t.nav[key] : undefined}
          >
            <MaterialIcon name={icon} size={20} />
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate">{t.nav[key]}</span>
                {badges[key] !== undefined && badges[key]! > 0 && (
                  <span className="bg-error text-on-error text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    <Num>{badges[key]}</Num>
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-inverse-surface/50 z-40 lg:hidden backdrop-blur-sm" onClick={close} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed top-0 start-0 z-50 h-full bg-surface border-e border-outline-variant/30 flex flex-col shadow-lg',
          'transition-all duration-300 ease-in-out py-6',
          isCollapsed ? 'w-[80px]' : 'w-[260px]',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'max-lg:translate-x-full max-lg:ltr:-translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cn('px-6 mb-6 shrink-0', isCollapsed && 'px-2 text-center')}>
          {!isCollapsed ? (
            <>
              <h1 className="text-headline-lg text-primary font-bold">Tavola</h1>
              {scopeStatus === 'loading' && (
                <p className="text-label-sm text-on-surface-variant mt-1 truncate">
                  {t.scope.loading}
                </p>
              )}
              {selectedRestaurant && (
                <p className="text-label-sm text-on-surface-variant mt-1 truncate" title={selectedRestaurant.name}>
                  {selectedRestaurant.name}
                </p>
              )}
            </>
          ) : (
            <span className="text-headline-md text-primary font-bold">T</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 scrollbar-none">
          {renderGroup(t.navGroups.operations, opsNav)}
          {renderGroup(t.navGroups.management, mgmtNav)}
          {renderGroup(t.navGroups.admin, adminNav)}
        </nav>

        <div className="mt-auto px-2 pt-4 border-t border-outline-variant/30">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold shrink-0">
                {user.initials}
              </div>
              <div className="min-w-0">
                <p className="text-body-md font-bold text-on-surface truncate">{user.displayName}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {user.organization?.role ?? user.actorType}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              void logout()
            }}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg text-label-md',
              isCollapsed && 'justify-center',
            )}
          >
            <MaterialIcon name="logout" size={20} />
            {!isCollapsed && <span>{t.header.logout}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

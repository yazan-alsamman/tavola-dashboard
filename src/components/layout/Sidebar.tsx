import { useLocale } from '@/context/LocaleContext'
import { useSidebar } from '@/context/SidebarContext'
import { useAuth } from '@/context/AuthContext'
import { useRestaurantScope } from '@/context/RestaurantScopeContext'
import { useUnreadNotificationCount } from '@/hooks/useNotificationQueries'
import {
  SidebarAccount,
  SidebarAction,
  SidebarBrand,
  SidebarNavItem,
  SidebarSection,
  SidebarShell,
} from './SidebarNav'

type NavKey = keyof typeof import('@/i18n/en').en.nav

type NavEntry = { key: NavKey; path: string; icon: string }

/**
 * Grouped by how often staff reach for them during service, so the busiest
 * destinations sit closest to the top of the rail.
 */
const opsNav: NavEntry[] = [
  { key: 'dashboard', path: '/app', icon: 'dashboard' },
  { key: 'reservations', path: '/app/reservations', icon: 'event' },
  { key: 'calendar', path: '/app/calendar', icon: 'calendar_today' },
  { key: 'floorPlan', path: '/app/floor-plan', icon: 'layers' },
  { key: 'waitlist', path: '/app/waitlist', icon: 'hourglass_empty' },
  { key: 'walkIn', path: '/app/walk-in', icon: 'directions_walk' },
]

const mgmtNav: NavEntry[] = [
  { key: 'menu', path: '/app/menu', icon: 'restaurant_menu' },
  { key: 'gallery', path: '/app/gallery', icon: 'photo_library' },
  { key: 'offers', path: '/app/offers', icon: 'local_offer' },
  { key: 'reviews', path: '/app/reviews', icon: 'rate_review' },
  { key: 'tables', path: '/app/tables', icon: 'table_restaurant' },
  { key: 'messaging', path: '/app/messaging', icon: 'inbox' },
  { key: 'notifications', path: '/app/notifications', icon: 'notifications' },
]

const adminNav: NavEntry[] = [
  { key: 'staff', path: '/app/staff', icon: 'badge' },
  { key: 'reports', path: '/app/reports', icon: 'analytics' },
  { key: 'branches', path: '/app/branches', icon: 'store' },
  { key: 'settings', path: '/app/settings', icon: 'settings' },
]

export function Sidebar() {
  const { t } = useLocale()
  const { isOpen, isCollapsed, close } = useSidebar()
  const { user, logout } = useAuth()
  const { selectedRestaurant, status: scopeStatus } = useRestaurantScope()
  const unreadQuery = useUnreadNotificationCount(Boolean(user))

  const badges: Partial<Record<NavKey, number>> = {
    notifications: unreadQuery.data ?? 0,
  }

  const renderItems = (items: NavEntry[]) =>
    items.map(({ key, path, icon }) => (
      <SidebarNavItem
        key={key}
        to={path}
        icon={icon}
        label={t.nav[key]}
        badge={badges[key]}
        end={path === '/app'}
        isCollapsed={isCollapsed}
        onNavigate={close}
      />
    ))

  const brandContext =
    scopeStatus === 'loading' ? t.scope.loading : (selectedRestaurant?.name ?? undefined)

  return (
    <SidebarShell isOpen={isOpen} onClose={close} ariaLabel={t.nav.dashboard}>
      <SidebarBrand
        title="Tavola"
        shortTitle="T"
        context={brandContext}
        isCollapsed={isCollapsed}
      />

      <nav className="flex-1 overflow-y-auto scrollbar-none pb-2">
        <SidebarSection label={t.navGroups.operations} isCollapsed={isCollapsed} first>
          {renderItems(opsNav)}
        </SidebarSection>
        <SidebarSection label={t.navGroups.management} isCollapsed={isCollapsed}>
          {renderItems(mgmtNav)}
        </SidebarSection>
        <SidebarSection label={t.navGroups.admin} isCollapsed={isCollapsed}>
          {renderItems(adminNav)}
        </SidebarSection>
      </nav>

      <SidebarAccount
        initials={user?.initials}
        name={user?.displayName ?? ''}
        meta={user?.organization?.role ?? user?.actorType}
        isCollapsed={isCollapsed}
      >
        <SidebarAction
          icon="logout"
          label={t.header.logout}
          isCollapsed={isCollapsed}
          onClick={() => {
            void logout()
          }}
        />
      </SidebarAccount>
    </SidebarShell>
  )
}

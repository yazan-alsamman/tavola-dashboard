import { NavLink, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ScopeGate } from './ScopeGate'
import { sidebarWidthVars } from './SidebarNav'
import { useSidebar } from '@/context/SidebarContext'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

export function DashboardLayout() {
  const { isCollapsed } = useSidebar()
  const { t } = useLocale()

  /** Service-critical destinations only — mobile is a thumb-reach surface. */
  const mobileNav = [
    { path: '/app', end: true, icon: 'dashboard', label: t.nav.dashboard },
    { path: '/app/reservations', end: false, icon: 'event', label: t.nav.reservations },
    { path: '/app/floor-plan', end: false, icon: 'layers', label: t.nav.floorPlan },
    { path: '/app/waitlist', end: false, icon: 'hourglass_empty', label: t.nav.waitlist },
  ]

  return (
    <div
      className="min-h-screen bg-background pt-[var(--logout-leave-banner-h,0px)]"
      style={sidebarWidthVars(isCollapsed)}
    >
      <Sidebar />

      <div className="transition-[margin] duration-[var(--duration-slow)] ease-[var(--ease-standard)] lg:ms-[var(--sidebar-w)]">
        <Header />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          <ScopeGate>
            <Outlet />
          </ScopeGate>
        </main>
      </div>

      <nav
        aria-label={t.nav.dashboard}
        className={cn(
          'fixed bottom-0 inset-x-0 z-50 md:hidden',
          'glass bg-surface/90 border-t border-outline-variant/50',
          'flex items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2',
        )}
      >
        {mobileNav.map(({ path, end, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5',
                'transition-colors duration-[var(--duration-fast)]',
                isActive
                  ? 'bg-primary-subtle text-primary'
                  : 'text-on-surface-variant active:bg-surface-container-high',
              )
            }
          >
            {({ isActive }) => (
              <>
                <MaterialIcon name={icon} size={20} filled={isActive} />
                <span className="text-label-sm leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

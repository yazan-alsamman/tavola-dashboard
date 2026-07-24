import { Link, useLocation, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ScopeGate } from './ScopeGate'
import { useSidebar } from '@/context/SidebarContext'
import { useLocale } from '@/context/LocaleContext'
import { cn } from '@/lib/utils'
import { MaterialIcon } from '@/components/ui/Icon'

export function DashboardLayout() {
  const { isCollapsed } = useSidebar()
  const { t } = useLocale()
  const location = useLocation()

  const mobileNav = [
    { path: '/', icon: 'login', label: t.ops.arrivingSoon },
    { path: '/floor-plan', icon: 'grid_view', label: t.floorPlan.title },
    { path: '/waitlist', icon: 'timer', label: t.waitlist.title },
    { path: '/reservations', icon: 'menu', label: t.reservations.title },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('transition-all duration-300', isCollapsed ? 'lg:ms-[80px]' : 'lg:ms-[260px]')}>
        <Header />
        <main className="p-4 md:p-6 max-w-[1400px] mx-auto pb-24 md:pb-6">
          <ScopeGate>
            <Outlet />
          </ScopeGate>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass bg-surface/90 border-t border-outline-variant/10 flex justify-around items-center py-2 px-4 rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {mobileNav.map(({ path, icon, label }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-90',
                active ? 'text-primary' : 'text-on-surface-variant/70',
              )}
            >
              <MaterialIcon name={icon} size={22} filled={active} />
              <span className="text-label-sm text-[10px]">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

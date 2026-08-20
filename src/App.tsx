import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { AuthProvider } from '@/context/AuthContext'
import { RestaurantScopeProvider } from '@/context/RestaurantScopeContext'
import { ToastProvider } from '@/context/ToastContext'
import { AppQueryProvider } from '@/components/providers/AppQueryProvider'
import { ProtectedRoute, PublicRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ForceLogoutOnLeave } from '@/components/layout/ForceLogoutOnLeave'
import { OneSignalIdentityBootstrap } from '@/components/providers/OneSignalIdentityBootstrap'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { ReservationsPage } from '@/pages/Reservations'
import { ReservationDetailPage } from '@/pages/ReservationDetail'
import { CalendarPage } from '@/pages/Calendar'
import { FloorPlanPage } from '@/pages/FloorPlan'
import { TablesPage } from '@/pages/Tables'
import { WaitlistPage } from '@/pages/Waitlist'
import { WalkInPage } from '@/pages/WalkIn'
import { NotificationsPage } from '@/pages/Notifications'
import { MessagingPage } from '@/pages/Messaging'
import { ReportsPage } from '@/pages/Reports'
import { BranchesPage } from '@/pages/Branches'
import { SettingsPage } from '@/pages/Settings'
import { StaffPage } from '@/pages/Staff'
import { MenuPage } from '@/pages/Menu'
import { GalleryPage } from '@/pages/Gallery'
import { OffersPage } from '@/pages/Offers'
import { ReviewsPage } from '@/pages/Reviews'

// Lazy-loaded: Three.js/R3F/Drei/GSAP only need to ship to visitors of the public landing page,
// never to authenticated dashboard routes.
const LandingPage = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.LandingPage })))

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AppQueryProvider>
            <OneSignalIdentityBootstrap />
            <RestaurantScopeProvider>
              <ToastProvider>
                <SidebarProvider>
                  <BrowserRouter>
                    <ForceLogoutOnLeave />
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <Suspense fallback={<div className="min-h-screen bg-background" />}>
                            <LandingPage />
                          </Suspense>
                        }
                      />
                      <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                      </Route>
                      <Route element={<ProtectedRoute />}>
                        <Route path="/app" element={<DashboardLayout />}>
                          <Route index element={<DashboardPage />} />
                          <Route path="reservations" element={<ReservationsPage />} />
                          <Route path="reservations/:id" element={<ReservationDetailPage />} />
                          <Route path="calendar" element={<CalendarPage />} />
                          <Route path="floor-plan" element={<FloorPlanPage />} />
                          <Route path="tables" element={<TablesPage />} />
                          <Route path="menu" element={<MenuPage />} />
                          <Route path="gallery" element={<GalleryPage />} />
                          <Route path="waitlist" element={<WaitlistPage />} />
                          <Route path="walk-in" element={<WalkInPage />} />
                          <Route path="offers" element={<OffersPage />} />
                          <Route path="reviews" element={<ReviewsPage />} />
                          <Route path="notifications" element={<NotificationsPage />} />
                          <Route path="messaging" element={<MessagingPage />} />
                          <Route path="reports" element={<ReportsPage />} />
                          <Route path="branches" element={<BranchesPage />} />
                          <Route path="settings" element={<SettingsPage />} />
                          <Route path="staff" element={<StaffPage />} />
                        </Route>
                      </Route>
                    </Routes>
                  </BrowserRouter>
                </SidebarProvider>
              </ToastProvider>
            </RestaurantScopeProvider>
          </AppQueryProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}

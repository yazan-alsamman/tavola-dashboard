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
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { ReservationsPage } from '@/pages/Reservations'
import { ReservationDetailPage } from '@/pages/ReservationDetail'
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
import { OffersPage } from '@/pages/Offers'
import { ReviewsPage } from '@/pages/Reviews'

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AppQueryProvider>
            <RestaurantScopeProvider>
              <ToastProvider>
                <SidebarProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route element={<PublicRoute />}>
                        <Route path="/login" element={<LoginPage />} />
                      </Route>
                      <Route element={<ProtectedRoute />}>
                        <Route element={<DashboardLayout />}>
                          <Route index element={<DashboardPage />} />
                          <Route path="reservations" element={<ReservationsPage />} />
                          <Route path="reservations/:id" element={<ReservationDetailPage />} />
                          <Route path="floor-plan" element={<FloorPlanPage />} />
                          <Route path="tables" element={<TablesPage />} />
                          <Route path="menu" element={<MenuPage />} />
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

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { LocaleProvider } from '@/context/LocaleContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { AuthProvider } from '@/context/AuthContext'
import { RestaurantProvider } from '@/context/RestaurantContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute, PublicRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { ReservationsPage } from '@/pages/Reservations'
import { ReservationDetailPage } from '@/pages/ReservationDetail'
import { FloorPlanPage } from '@/pages/FloorPlan'
import { TablesPage } from '@/pages/Tables'
import { CalendarPage } from '@/pages/Calendar'
import { CustomersPage } from '@/pages/Customers'
import { WaitlistPage } from '@/pages/Waitlist'
import { WalkInPage } from '@/pages/WalkIn'
import { SpecialOccasionsPage } from '@/pages/SpecialOccasions'
import { NotificationsPage } from '@/pages/Notifications'
import { ReportsPage } from '@/pages/Reports'
import { BranchesPage } from '@/pages/Branches'
import { SettingsPage } from '@/pages/Settings'
import { ActivityLogsPage } from '@/pages/ActivityLogs'

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <RestaurantProvider>
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
                        <Route path="calendar" element={<CalendarPage />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="waitlist" element={<WaitlistPage />} />
                        <Route path="walk-in" element={<WalkInPage />} />
                        <Route path="special-occasions" element={<SpecialOccasionsPage />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="branches" element={<BranchesPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="activity-logs" element={<ActivityLogsPage />} />
                      </Route>
                    </Route>
                  </Routes>
                </BrowserRouter>
              </SidebarProvider>
            </ToastProvider>
          </RestaurantProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}

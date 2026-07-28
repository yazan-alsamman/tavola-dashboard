import fs from 'node:fs'
import path from 'node:path'

const col = JSON.parse(
  fs.readFileSync('postman collection/TAVLA-API.postman_collection.json', 'utf8'),
)
const skipFolders = new Set([
  'Customer Authentication',
  'Platform Admin',
  'Discovery',
])
const postman = []

function walk(items, prefix = []) {
  for (const it of items || []) {
    if (it.item) walk(it.item, [...prefix, it.name])
    else if (it.request) {
      const folder = prefix[0] || ''
      if (skipFolders.has(folder)) continue
      if (folder === 'Users' && /favorite/i.test(it.name)) continue
      let p = (it.request.url?.raw || '')
        .replace('{{baseUrl}}', '')
        .replace('{{apiRoot}}', '')
        .split('?')[0]
      p = p
        .replace(/\{\{reservationId\}\}/g, ':id')
        .replace(/\{\{waitlistEntryId\}\}/g, ':id')
        .replace(/\{\{[^}]+\}\}/g, ':id')
      postman.push({
        folder,
        name: it.name,
        method: it.request.method,
        path: p,
      })
    }
  }
}
walk(col.item)

const coverage = {
  'POST /auth/login': 'auth.login',
  'POST /auth/refresh': 'client.refreshSession',
  'POST /auth/forgot-password': 'auth.forgotPassword',
  'POST /auth/reset-password': 'auth.resetPassword',
  'POST /auth/change-password': 'auth.changePassword',
  'POST /auth/logout': 'auth.logout',
  'POST /auth/logout-all': 'auth.logoutAll',
  'GET /auth/sessions': 'auth.listSessions',
  'DELETE /auth/sessions/:sessionId': 'auth.revokeSession',
  'GET /users/me': 'users.getCurrentUser',
  'PATCH /users/me': 'users.updateCurrentUser',
  'GET /users/me/preferences': 'users.getMyPreferences',
  'PATCH /users/me/preferences': 'users.updateMyPreferences',
  'POST /users/me/avatar': 'users.uploadMyAvatar',
  'GET /notifications': 'notifications.listNotifications',
  'GET /notifications/unread-count': 'notifications.getUnreadNotificationCount',
  'GET /notifications/identity-token': 'notifications.getOneSignalIdentityToken',
  'PATCH /notifications/:id/read': 'notifications.markNotificationRead',
  'PATCH /notifications/read-all': 'notifications.markAllNotificationsRead',
  'GET /cuisine-categories': 'taxonomy.listCuisineCategories',
  'GET /occasion-categories': 'taxonomy.listOccasionCategories',
  'POST /restaurants': 'restaurants.createRestaurant',
  'GET /restaurants/:id': 'restaurants.getRestaurant',
  'GET /restaurants': 'restaurants.listRestaurants',
  'PATCH /restaurants/:id': 'restaurants.updateRestaurant',
  'DELETE /restaurants/:id': 'restaurants.deleteRestaurant',
  'GET /restaurants/:id/settings': 'restaurants.getRestaurantSettings',
  'PATCH /restaurants/:id/settings': 'restaurants.updateRestaurantSettings',
  'GET /restaurants/:id/working-hours': 'restaurants.getRestaurantWorkingHours',
  'PATCH /restaurants/:id/working-hours': 'restaurants.updateRestaurantWorkingHours',
  'POST /restaurants/:id/gallery': 'restaurants.addRestaurantGalleryImage',
  'GET /restaurants/:id/gallery': 'restaurants.listRestaurantGallery',
  'DELETE /restaurants/:id/gallery/:galleryItemId':
    'restaurants.removeRestaurantGalleryImage',
  'GET /restaurants/:id/cuisine-categories':
    'restaurants.getRestaurantCuisineCategories',
  'PATCH /restaurants/:id/cuisine-categories':
    'restaurants.setRestaurantCuisineCategories',
  'GET /restaurants/:id/occasion-categories':
    'restaurants.getRestaurantOccasionCategories',
  'PATCH /restaurants/:id/occasion-categories':
    'restaurants.setRestaurantOccasionCategories',
  'POST /restaurants/:restaurantId/branches': 'branches.createBranch',
  'GET /restaurants/:restaurantId/branches/:branchId': 'branches.getBranch',
  'GET /restaurants/:restaurantId/branches': 'branches.listBranches',
  'PATCH /restaurants/:restaurantId/branches/:branchId': 'branches.updateBranch',
  'DELETE /restaurants/:restaurantId/branches/:branchId': 'branches.deleteBranch',
  'GET /restaurants/:restaurantId/branches/:branchId/working-hours':
    'branches.getBranchWorkingHours',
  'PATCH /restaurants/:restaurantId/branches/:branchId/working-hours':
    'branches.updateBranchWorkingHours',
  'POST /restaurants/:restaurantId/branches/:branchId/floor-plans':
    'floorPlans.createFloorPlan',
  'GET /restaurants/:restaurantId/branches/:branchId/floor-plans':
    'floorPlans.listFloorPlans',
  'PATCH /restaurants/:restaurantId/branches/:branchId/floor-plans/:floorPlanId/activate':
    'floorPlans.activateFloorPlan',
  'GET /restaurants/:restaurantId/branches/:branchId/floor-plans/:floorPlanId/tables':
    'tables.listTablesByFloorPlan',
  'POST /restaurants/:restaurantId/branches/:branchId/tables': 'tables.createTable',
  'GET /restaurants/:restaurantId/branches/:branchId/tables':
    'tables.listTablesByBranch',
  'POST /tables/merge': 'tables.mergeTables',
  'GET /tables/:tableId': 'tables.getTable',
  'PATCH /tables/:tableId': 'tables.updateTable',
  'DELETE /tables/:tableId': 'tables.deleteTable',
  'POST /tables/:tableId/move': 'tables.moveTable',
  'POST /tables/:tableId/status': 'tables.changeTableStatus',
  'POST /tables/:tableId/split': 'tables.splitTable',
  'POST /restaurants/:restaurantId/employees': 'employees.inviteEmployee',
  'POST /restaurants/:restaurantId/employees/:employeeId/role':
    'employees.assignEmployeeRole',
  'POST /restaurants/:restaurantId/employees/:employeeId/branches':
    'employees.assignEmployeeToBranch',
  'DELETE /restaurants/:restaurantId/employees/:employeeId/branches/:branchId':
    'employees.removeEmployeeFromBranch',
  'DELETE /restaurants/:restaurantId/employees/:employeeId':
    'employees.removeEmployee',
  'GET /reservations/availability': 'reservations.searchAvailability',
  'POST /reservations':
    'reservations.createReservation + createStaffReservation',
  'GET /reservations': 'reservations.listMyReservations',
  'GET /reservations/:id': 'reservations.getMyReservation',
  'POST /reservations/:id/approve': 'reservations.approveReservation',
  'POST /reservations/:id/reject': 'reservations.rejectReservation',
  'POST /reservations/:id/cancel': 'reservations.cancelReservation',
  'POST /reservations/:id/reschedule': 'reservations.rescheduleReservation',
  'POST /reservations/:id/complete': 'reservations.completeReservation',
  'POST /reservations/:id/no-show': 'reservations.markReservationNoShow',
  'POST /reservations/:id/table-ready': 'reservations.markReservationTableReady',
  'POST /waitlist': 'waitlist.joinWaitlist',
  'POST /waitlist/:id/cancel': 'waitlist.cancelWaitlistEntry',
  'POST /waitlist/:id/promote': 'waitlist.promoteWaitlistEntry',
  'GET /health': 'health.getHealth',
  'GET /health/liveness': 'health.getLiveness',
  'GET /health/readiness': 'health.getReadiness',
}

const rows = postman.map((ep) => {
  const key = `${ep.method} ${ep.path}`
  const client = coverage[key] || null
  return { ...ep, key, client, match: Boolean(client) }
})

const matched = rows.filter((r) => r.match)
const missing = rows.filter((r) => !r.match)

console.log('POSTMAN_DASHBOARD', postman.length)
console.log('UNIQUE_KEYS', new Set(rows.map((r) => r.key)).size)
console.log('MATCHED_ROWS', matched.length)
console.log('MISSING_ROWS', missing.length)
missing.forEach((m) => console.log('MISS', m.method, m.path, '|', m.name))

fs.writeFileSync(
  'scripts/_compat-matrix.json',
  JSON.stringify({ matched, missing, rows }, null, 2),
)

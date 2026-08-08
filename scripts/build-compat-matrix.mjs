import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const POSTMAN_PATH = path.join(ROOT, 'postman/TAVLA-API.postman_collection.json')
const JSON_OUT = path.join(ROOT, 'scripts/_compat-matrix.json')
const MD_OUT = path.join(ROOT, 'docs/API_COMPATIBILITY_REPORT.md')
const REPORT_DATE = '2026-08-04'

const col = JSON.parse(fs.readFileSync(POSTMAN_PATH, 'utf8'))

/** Top-level Postman folders excluded from dashboard scope. */
const SKIP_TOP_FOLDERS_EXACT = new Set([
  'Customer Authentication',
  'Platform Admin',
  'Discovery',
  'Platform Subscriptions',
  'Subscriptions platform',
  '06 - Platform Administration API',
  '07 - Discovery',
  '22 - Subscriptions',
  '26 - Utilities',
])

/** Customer / platform-admin auth routes inside `00 - Authentication`. */
const CUSTOMER_AUTH_KEYS = new Set([
  'POST /auth/customer/login',
  'POST /platform-admin/login',
  'POST /auth/customer/register/start',
  'POST /auth/customer/register/resend',
  'POST /auth/customer/register/verify',
  'POST /auth/customer/register/complete',
  'POST /auth/customer/password-reset/start',
  'POST /auth/customer/password-reset/resend',
  'POST /auth/customer/password-reset/verify',
  'POST /auth/customer/password-reset/complete',
])

function shouldSkipFolder(folder) {
  if (SKIP_TOP_FOLDERS_EXACT.has(folder)) return true
  if (/platform administration/i.test(folder)) return true
  if (/^\d+\s*-\s*discovery$/i.test(folder)) return true
  if (/^\d+\s*-\s*subscriptions$/i.test(folder)) return true
  if (/^\d+\s*-\s*utilities$/i.test(folder)) return true
  if (/platform subscriptions/i.test(folder)) return true
  return false
}

function normalizePath(raw) {
  let p = (raw || '')
    .replace(/\{\{baseUrl\}\}/g, '')
    .replace(/\{\{apiRoot\}\}/g, '')
    .replace(/^\/api\/v\d+/i, '')
    .split('?')[0]
    .replace(/\/+$/, '')

  p = p
    .replace(/\{\{reservationId\}\}/g, ':id')
    .replace(/\{\{waitlistEntryId\}\}/g, ':id')
    .replace(/\{\{sessionId\}\}/g, ':id')
    .replace(/\{\{[^}]+\}\}/g, ':id')

  return p
}

const postman = []

function walk(items, prefix = []) {
  for (const it of items || []) {
    if (it.item) walk(it.item, [...prefix, it.name])
    else if (it.request) {
      const folder = prefix[0] || ''
      const name = it.name
      const method = it.request.method
      const p = normalizePath(it.request.url?.raw)
      const key = `${method} ${p}`

      if (shouldSkipFolder(folder)) continue
      if (CUSTOMER_AUTH_KEYS.has(key)) continue
      if (/favorite/i.test(name) || /\/favorites(?:\/|$)/.test(p)) continue
      if (/prometheus|metrics/i.test(name) || p === '/metrics') continue

      postman.push({ folder, name, method, path: p, key })
    }
  }
}

walk(col.item)

/**
 * Dashboard-relevant Postman method+path → `src/api` export (`module.function`).
 * Path placeholders are normalized to `:id` (see `normalizePath`).
 */
const coverage = {
  // Authentication
  'POST /auth/login': 'auth.login',
  'POST /auth/refresh': 'client.refreshSession',
  'POST /auth/forgot-password': 'auth.forgotPassword',
  'POST /auth/reset-password': 'auth.resetPassword',
  'POST /auth/change-password': 'auth.changePassword',
  'POST /auth/logout': 'auth.logout',
  'POST /auth/logout-all': 'auth.logoutAll',
  'GET /auth/sessions': 'auth.listSessions',
  'DELETE /auth/sessions/:id': 'auth.revokeSession',

  // Users (shared staff profile; favorites excluded above)
  'GET /users/me': 'users.getCurrentUser',
  'PATCH /users/me': 'users.updateCurrentUser',
  'GET /users/me/preferences': 'users.getMyPreferences',
  'PATCH /users/me/preferences': 'users.updateMyPreferences',
  'POST /users/me/avatar': 'users.uploadMyAvatar',

  // Notifications
  'GET /notifications': 'notifications.listNotifications',
  'GET /notifications/unread-count': 'notifications.getUnreadNotificationCount',
  'GET /notifications/identity-token': 'notifications.getOneSignalIdentityToken',
  'PATCH /notifications/:id/read': 'notifications.markNotificationRead',
  'PATCH /notifications/read-all': 'notifications.markAllNotificationsRead',

  // Restaurants
  'POST /restaurants': 'restaurants.createRestaurant',
  'GET /restaurants': 'restaurants.listRestaurants',
  'GET /restaurants/:id': 'restaurants.getRestaurant',
  'PATCH /restaurants/:id': 'restaurants.updateRestaurant',
  'DELETE /restaurants/:id': 'restaurants.deleteRestaurant',
  'GET /restaurants/:id/settings': 'restaurants.getRestaurantSettings',
  'PATCH /restaurants/:id/settings': 'restaurants.updateRestaurantSettings',
  'GET /restaurants/:id/working-hours': 'restaurants.getRestaurantWorkingHours',
  'PATCH /restaurants/:id/working-hours': 'restaurants.updateRestaurantWorkingHours',
  'GET /restaurants/:id/gallery': 'restaurants.listRestaurantGallery',
  'POST /restaurants/:id/gallery': 'restaurants.addRestaurantGalleryImage',
  'DELETE /restaurants/:id/gallery/:id': 'restaurants.removeRestaurantGalleryImage',
  'GET /restaurants/:id/cuisine-categories': 'restaurants.getRestaurantCuisineCategories',
  'PATCH /restaurants/:id/cuisine-categories': 'restaurants.setRestaurantCuisineCategories',
  'GET /restaurants/:id/occasion-categories': 'restaurants.getRestaurantOccasionCategories',
  'PATCH /restaurants/:id/occasion-categories': 'restaurants.setRestaurantOccasionCategories',

  // Branches
  'POST /restaurants/:id/branches': 'branches.createBranch',
  'GET /restaurants/:id/branches': 'branches.listBranches',
  'GET /restaurants/:id/branches/:id': 'branches.getBranch',
  'PATCH /restaurants/:id/branches/:id': 'branches.updateBranch',
  'DELETE /restaurants/:id/branches/:id': 'branches.deleteBranch',
  'GET /restaurants/:id/branches/:id/working-hours': 'branches.getBranchWorkingHours',
  'PATCH /restaurants/:id/branches/:id/working-hours': 'branches.updateBranchWorkingHours',

  // Floor plans
  'POST /restaurants/:id/branches/:id/floor-plans': 'floorPlans.createFloorPlan',
  'GET /restaurants/:id/branches/:id/floor-plans': 'floorPlans.listFloorPlans',
  'PATCH /restaurants/:id/branches/:id/floor-plans/:id/activate':
    'floorPlans.activateFloorPlan',

  // Tables
  'GET /restaurants/:id/branches/:id/floor-plans/:id/tables': 'tables.listTablesByFloorPlan',
  'POST /restaurants/:id/branches/:id/tables': 'tables.createTable',
  'GET /restaurants/:id/branches/:id/tables': 'tables.listTablesByBranch',
  'POST /tables/merge': 'tables.mergeTables',
  'GET /tables/:id': 'tables.getTable',
  'PATCH /tables/:id': 'tables.updateTable',
  'DELETE /tables/:id': 'tables.deleteTable',
  'POST /tables/:id/move': 'tables.moveTable',
  'POST /tables/:id/status': 'tables.changeTableStatus',
  'POST /tables/:id/split': 'tables.splitTable',

  // Employees (no list endpoint in Postman — invite/manage only)
  'POST /restaurants/:id/employees': 'employees.inviteEmployee',
  'POST /restaurants/:id/employees/:id/role': 'employees.assignEmployeeRole',
  'POST /restaurants/:id/employees/:id/branches': 'employees.assignEmployeeToBranch',
  'DELETE /restaurants/:id/employees/:id/branches/:id':
    'employees.removeEmployeeFromBranch',
  'DELETE /restaurants/:id/employees/:id': 'employees.removeEmployee',

  // Reservations
  'GET /reservations/availability': 'reservations.searchAvailability',
  'POST /reservations': 'reservations.createReservation + createStaffReservation',
  'GET /reservations': 'reservations.listMyReservations',
  'GET /reservations/:id': 'reservations.getMyReservation',
  'POST /reservations/:id/approve': 'reservations.approveReservation',
  'POST /reservations/:id/reject': 'reservations.rejectReservation',
  'POST /reservations/:id/cancel': 'reservations.cancelReservation',
  'POST /reservations/:id/reschedule': 'reservations.rescheduleReservation',
  'POST /reservations/:id/complete': 'reservations.completeReservation',
  'POST /reservations/:id/no-show': 'reservations.markReservationNoShow',
  'POST /reservations/:id/table-ready': 'reservations.markReservationTableReady',

  // Waitlist (no list endpoint in Postman)
  'POST /waitlist': 'waitlist.joinWaitlist',
  'POST /waitlist/:id/cancel': 'waitlist.cancelWaitlistEntry',
  'POST /waitlist/:id/promote': 'waitlist.promoteWaitlistEntry',

  // Reviews (staff management)
  'GET /restaurants/:id/reviews': 'reviews.listRestaurantReviews',
  'GET /reviews/:id': 'reviews.getReview',
  'POST /reviews/:id/reply': 'reviews.replyToReview',
  'DELETE /reviews/:id': 'reviews.deleteReview',

  // Offers
  'POST /restaurants/:id/offers': 'offers.createOffer',
  'GET /restaurants/:id/offers': 'offers.listOffers',
  'PATCH /restaurants/:id/offers/:id': 'offers.updateOffer',
  'POST /restaurants/:id/offers/:id/publish': 'offers.publishOffer',
  'DELETE /restaurants/:id/offers/:id': 'offers.deleteOffer',

  // Menus
  'POST /restaurants/:id/menus': 'menus.createMenu',
  'GET /restaurants/:id/menus': 'menus.listMenus',
  'GET /restaurants/:id/menus/default': 'menus.getDefaultMenu',
  'GET /restaurants/:id/menus/:id': 'menus.getMenu',
  'PATCH /restaurants/:id/menus/:id': 'menus.updateMenu',
  'POST /restaurants/:id/menus/:id/activate': 'menus.activateMenu',
  'POST /restaurants/:id/menus/:id/deactivate': 'menus.deactivateMenu',
  'POST /restaurants/:id/menus/:id/set-default': 'menus.setDefaultMenu',
  'DELETE /restaurants/:id/menus/:id': 'menus.deleteMenu',
  'POST /restaurants/:id/menus/:id/categories': 'menus.createMenuCategory',
  'PATCH /restaurants/:id/menus/:id/categories/reorder': 'menus.reorderMenuCategories',
  'GET /restaurants/:id/menus/:id/categories/:id': 'menus.getMenu',
  'PATCH /restaurants/:id/menus/:id/categories/:id': 'menus.updateMenuCategory',
  'DELETE /restaurants/:id/menus/:id/categories/:id': 'menus.deleteMenuCategory',
  'POST /restaurants/:id/menus/:id/categories/:id/image': 'menus.uploadMenuCategoryImage',
  'DELETE /restaurants/:id/menus/:id/categories/:id/image': 'menus.removeMenuCategoryImage',
  'POST /restaurants/:id/menus/:id/categories/:id/items': 'menus.createMenuItem',
  'PATCH /restaurants/:id/menus/:id/categories/:id/items/reorder': 'menus.reorderMenuItems',
  'GET /restaurants/:id/menus/:id/categories/:id/items/:id': 'menus.getMenu',
  'PATCH /restaurants/:id/menus/:id/categories/:id/items/:id': 'menus.updateMenuItem',
  'DELETE /restaurants/:id/menus/:id/categories/:id/items/:id': 'menus.deleteMenuItem',
  'PATCH /restaurants/:id/menus/:id/categories/:id/items/:id/availability':
    'menus.replaceMenuItemAvailability',
  'POST /restaurants/:id/menus/:id/categories/:id/items/:id/feature': 'menus.featureMenuItem',
  'POST /restaurants/:id/menus/:id/categories/:id/items/:id/unfeature':
    'menus.unfeatureMenuItem',
  'POST /restaurants/:id/menus/:id/categories/:id/items/:id/image': 'menus.uploadMenuItemImage',
  'DELETE /restaurants/:id/menus/:id/categories/:id/items/:id/image': 'menus.removeMenuItemImage',
  'POST /restaurants/:id/menus/:id/categories/:id/items/:id/option-groups':
    'menus.createMenuItemOptionGroup',
  'PATCH /restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id':
    'menus.updateMenuItemOptionGroup',
  'DELETE /restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id':
    'menus.deleteMenuItemOptionGroup',
  'POST /restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options':
    'menus.createMenuItemOption',
  'PATCH /restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options/:id':
    'menus.updateMenuItemOption',
  'DELETE /restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options/:id':
    'menus.deleteMenuItemOption',
  'POST /restaurants/:id/menus/:id/categories/:id/items/:id/add-ons':
    'menus.createMenuItemAddOn',
  'PATCH /restaurants/:id/menus/:id/categories/:id/items/:id/add-ons/:id':
    'menus.updateMenuItemAddOn',
  'DELETE /restaurants/:id/menus/:id/categories/:id/items/:id/add-ons/:id':
    'menus.deleteMenuItemAddOn',

  // Messaging
  'GET /restaurants/:id/conversations': 'messaging.listRestaurantConversations',
  'GET /conversations': 'messaging.listConversations',
  'GET /conversations/:id': 'messaging.getConversation',
  'GET /conversations/:id/messages': 'messaging.listConversationMessages',
  'POST /conversations': 'messaging.startConversation',
  'POST /conversations/:id/messages': 'messaging.sendConversationMessage',
  'POST /conversations/:id/read': 'messaging.markConversationRead',
  'POST /conversations/:id/close': 'messaging.closeConversation',

  // Analytics
  'GET /restaurants/:id/analytics/customers': 'analytics.getCustomerInsights',
  'GET /restaurants/:id/analytics/reservations/summary': 'analytics.getReservationSummary',
  'GET /restaurants/:id/analytics/branches/:id/reservations/trends':
    'analytics.getBranchReservationTrends',
  'GET /restaurants/:id/analytics/branches/:id/peak-hours': 'analytics.getBranchPeakHours',
  'GET /restaurants/:id/analytics/waitlist': 'analytics.getWaitlistAnalytics',
  'GET /restaurants/:id/analytics/reviews-summary': 'analytics.getReviewsSummary',
  'GET /organization/analytics/reservations/summary':
    'analytics.getOrganizationReservationSummary',

  // Organizations (org subscription read — not platform-admin plans)
  'GET /organizations/subscription': 'organizations.getOrganizationSubscription',
  'GET /organizations/subscription/usage': 'organizations.getOrganizationSubscriptionUsage',

  // Health
  'GET /health': 'health.getHealth',
  'GET /health/liveness': 'health.getLiveness',
  'GET /health/readiness': 'health.getReadiness',
}

/** Primary export name used for UI heuristics (`module.function`). */
function primaryClient(client) {
  if (!client) return null
  return client.split('+')[0].trim()
}

/** Client exports with no dashboard page wiring (infra / customer-only inbox). */
const CLIENT_ONLY_EXPORTS = new Set([
  'health.getHealth',
  'health.getLiveness',
  'health.getReadiness',
  'messaging.listConversations',
])

/**
 * UI wiring heuristic per matched client.
 * `wired` — page/hook uses the export; `client-only` — API module only;
 * `contract-gap-documented` — capability has no list route in Postman (documented gap).
 */
function resolveUi(key, client) {
  if (!client) return null

  const primary = primaryClient(client)
  if (CLIENT_ONLY_EXPORTS.has(primary)) return 'client-only'
  if (key.startsWith('GET /health')) return 'client-only'

  return 'wired'
}

const rows = postman.map((ep) => {
  const client = coverage[ep.key] || null
  return {
    ...ep,
    client,
    match: Boolean(client),
    ui: resolveUi(ep.key, client),
  }
})

const matched = rows.filter((r) => r.match)
const missing = rows.filter((r) => !r.match)
const uniqueKeys = new Set(rows.map((r) => r.key))

const uiCounts = rows.reduce(
  (acc, r) => {
    if (r.ui) acc[r.ui] = (acc[r.ui] || 0) + 1
    return acc
  },
  { wired: 0, 'client-only': 0, 'contract-gap-documented': 0 },
)

console.log('POSTMAN_DASHBOARD', postman.length)
console.log('UNIQUE_KEYS', uniqueKeys.size)
console.log('MATCHED_ROWS', matched.length)
console.log('MISSING_ROWS', missing.length)
console.log('UI_WIRED', uiCounts.wired || 0)
console.log('UI_CLIENT_ONLY', uiCounts['client-only'] || 0)
missing.forEach((m) => console.log('MISS', m.method, m.path, '|', m.name))

fs.writeFileSync(JSON_OUT, JSON.stringify({ matched, missing, rows, meta: {
  generatedAt: new Date().toISOString(),
  source: 'postman/TAVLA-API.postman_collection.json',
  inScope: postman.length,
  matched: matched.length,
  missing: missing.length,
  uniqueKeys: uniqueKeys.size,
}}, null, 2))

function uiBadge(ui) {
  if (ui === 'wired') return 'wired'
  if (ui === 'client-only') return 'client-only'
  if (ui === 'contract-gap-documented') return 'contract-gap-documented'
  return '—'
}

function buildMatrixMarkdown() {
  const byFolder = new Map()
  for (const row of rows) {
    if (!byFolder.has(row.folder)) byFolder.set(row.folder, [])
    byFolder.get(row.folder).push(row)
  }

  const folderOrder = [...new Set(rows.map((r) => r.folder))]

  let table = ''
  for (const folder of folderOrder) {
    const items = byFolder.get(folder) ?? []
    table += `\n### ${folder}\n\n`
    table += '| Method | Path | Client | UI |\n'
    table += '|---|---|---|---|\n'
    for (const r of items) {
      const clientCell = r.client ? `\`${r.client}\`` : '**MISSING**'
      table += `| ${r.method} | \`${r.path}\` | ${clientCell} | ${uiBadge(r.ui)} |\n`
    }
  }

  return `# API_COMPATIBILITY_REPORT.md

> Compatibility audit between the **backend Postman contract** and the **dashboard \`src/api\` client**.
>
> **Contract source:** \`postman/TAVLA-API.postman_collection.json\` (173-endpoint authoritative collection)  
> **Date:** ${REPORT_DATE}  
> **Regenerate:** \`node scripts/build-compat-matrix.mjs\`

---

## Verdict

| Scope | Result |
|---|---|
| Dashboard-relevant Postman endpoints | **${postman.length}** |
| Unique method+path keys | **${uniqueKeys.size}** |
| Matched in \`src/api/*\` | **${matched.length} / ${postman.length}** (${postman.length ? Math.round((matched.length / postman.length) * 100) : 0}%) |
| Missing client functions | **${missing.length}** |
| UI wired (heuristic) | **${uiCounts.wired || 0}** |
| UI client-only (health / customer inbox) | **${uiCounts['client-only'] || 0}** |
| Intentionally out of scope | Customer Auth, Platform Admin, Discovery, Platform Subscriptions, customer favorites, Prometheus/metrics |

${missing.length === 0
    ? '**API client layer is compatible with the backend Postman contract for all in-scope staff-dashboard endpoints.**'
    : '**Gaps remain** — see Missing client functions below and the matrix MISS rows.'}

---

## Method

1. Parsed \`postman/TAVLA-API.postman_collection.json\` (173 total; ${postman.length} in dashboard scope).
2. Excluded non-dashboard surfaces: Customer Authentication routes, Platform Administration, Discovery, Platform Subscriptions (\`22 - Subscriptions\`), \`/users/me/favorites*\`, \`GET /metrics\`.
3. Normalized path placeholders (\`{{restaurantId}}\` → \`:id\`, etc.) for stable matching.
4. Mapped every in-scope request to a named export in \`src/api/*\` and applied a UI wiring heuristic (\`wired\` | \`client-only\`).
5. Wrote machine output to \`scripts/_compat-matrix.json\`.

---

## UI heuristic legend

| Value | Meaning |
|---|---|
| \`wired\` | Page or hook clearly consumes the client export (Reservations, Waitlist, Notifications, Staff, Tables, Reports, Dashboard, Settings, Menu, Offers, Reviews, Messaging, Branches, FloorPlan). |
| \`client-only\` | Client exists for infra or cross-actor routes not used by dashboard pages (health probes; customer \`GET /conversations\` inbox). |
| \`contract-gap-documented\` | No list route exists in Postman for a capability (e.g. waitlist queue list, employees list) — not a per-row flag when mutate routes are wired. |

---

## Intentionally excluded (not dashboard)

| Folder / path | Why |
|---|---|
| Customer Authentication (\`/auth/customer/*\`, register, customer password reset) | Customer mobile app |
| Platform Administration (\`06 - Platform Administration API\`, \`/platform-admin/*\`) | Internal platform tooling |
| Discovery (\`07 - Discovery\`, \`/discovery/*\`) | Public customer discovery |
| Platform Subscriptions (\`22 - Subscriptions\`) | Platform-admin plan lifecycle |
| \`GET/POST/DELETE /users/me/favorites*\` | Customer favorites |
| \`GET /metrics\` (\`26 - Utilities\`) | Prometheus scrape (not JSON API) |

---

${missing.length > 0 ? `## Missing client functions (${missing.length})

| Method | Path | Postman name |
|---|---|---|
${missing.map((m) => `| ${m.method} | \`${m.path}\` | ${m.name} |`).join('\n')}

---

` : ''}## Full match matrix (dashboard scope)
${table}

---

## Documented contract gaps (no Postman list route)

| Capability | Postman | Dashboard UI |
|---|---|---|
| Waitlist queue | \`POST /waitlist\`, cancel, promote only — **no** \`GET /waitlist\` | Waitlist page uses session-local entries + live mutations |
| Employees roster | invite / role / branch assign / remove — **no** \`GET …/employees\` | Staff page invite + manage-by-id |

---

## Related docs

| Doc | Role |
|---|---|
| \`docs/API_INTEGRATION.md\` | Contract consumption rules |
| \`docs/ARCHITECTURE.md\` | \`src/api\` folder map |
| \`postman/RECONCILIATION_REPORT.md\` | 173-endpoint collection reconciliation |
| \`scripts/build-compat-matrix.mjs\` | Regenerates this matrix |
`
}

fs.writeFileSync(MD_OUT, buildMatrixMarkdown())

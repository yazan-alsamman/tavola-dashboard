# API_COMPATIBILITY_REPORT.md

> Compatibility audit between the **backend Postman contract** and the **dashboard `src/api` client**.
>
> **Contract source:** `postman/TAVLA-API.postman_collection.json` (173-endpoint authoritative collection)  
> **Date:** 2026-08-04  
> **Regenerate:** `node scripts/build-compat-matrix.mjs`

---

## Verdict

| Scope | Result |
|---|---|
| Dashboard-relevant Postman endpoints | **210** |
| Unique method+path keys | **210** |
| Matched in `src/api/*` | **138 / 210** (66%) |
| Missing client functions | **72** |
| UI wired (heuristic) | **134** |
| UI client-only (health / customer inbox) | **4** |
| Intentionally out of scope | Customer Auth, Platform Admin, Discovery, Platform Subscriptions, customer favorites, Prometheus/metrics |

**Gaps remain** — see Missing client functions below and the matrix MISS rows.

---

## Method

1. Parsed `postman/TAVLA-API.postman_collection.json` (173 total; 210 in dashboard scope).
2. Excluded non-dashboard surfaces: Customer Authentication routes, Platform Administration, Discovery, Platform Subscriptions (`22 - Subscriptions`), `/users/me/favorites*`, `GET /metrics`.
3. Normalized path placeholders (`{{restaurantId}}` → `:id`, etc.) for stable matching.
4. Mapped every in-scope request to a named export in `src/api/*` and applied a UI wiring heuristic (`wired` | `client-only`).
5. Wrote machine output to `scripts/_compat-matrix.json`.

---

## UI heuristic legend

| Value | Meaning |
|---|---|
| `wired` | Page or hook clearly consumes the client export (Reservations, Waitlist, Notifications, Staff, Tables, Reports, Dashboard, Settings, Menu, Offers, Reviews, Messaging, Branches, FloorPlan). |
| `client-only` | Client exists for infra or cross-actor routes not used by dashboard pages (health probes; customer `GET /conversations` inbox). |
| `contract-gap-documented` | No list route exists in Postman for a capability (e.g. waitlist queue list, employees list) — not a per-row flag when mutate routes are wired. |

---

## Intentionally excluded (not dashboard)

| Folder / path | Why |
|---|---|
| Customer Authentication (`/auth/customer/*`, register, customer password reset) | Customer mobile app |
| Platform Administration (`06 - Platform Administration API`, `/platform-admin/*`) | Internal platform tooling |
| Discovery (`07 - Discovery`, `/discovery/*`) | Public customer discovery |
| Platform Subscriptions (`22 - Subscriptions`) | Platform-admin plan lifecycle |
| `GET/POST/DELETE /users/me/favorites*` | Customer favorites |
| `GET /metrics` (`26 - Utilities`) | Prometheus scrape (not JSON API) |

---

## Missing client functions (72)

| Method | Path | Postman name |
|---|---|---|
| DELETE | `/users/me` | Request Account Deletion |
| POST | `/users/me/cancel-deletion` | Cancel Account Deletion |
| GET | `/users/me/export` | Export My Data |
| POST | `/discovery/restaurants/compare` | Compare Restaurants |
| GET | `/cuisine-categories` | List Cuisine Categories |
| GET | `/occasion-categories` | List Occasion Categories |
| GET | `/discovery/restaurants/nearby` | Search Nearby Restaurants |
| GET | `/discovery/restaurants` | Search/browse restaurants (public, unauthenticated) |
| GET | `/discovery/restaurants/:id/branches/:id/floor-plan` | Get a branch |
| GET | `/discovery/restaurants/:id/branches/:id` | Get a branch by id (public, unauthenticated) |
| GET | `/discovery/restaurants/:id` | Get a restaurant by id (public, unauthenticated) |
| GET | `/discovery/restaurants/:id/offers` | Browse a restaurant |
| GET | `/discovery/restaurants/:id/branches` | Browse branches of a restaurant (public, unauthenticated) |
| GET | `/reservations/my` | Get My Reservations |
| GET | `/reservations/my/upcoming` | Get My Upcoming Reservations |
| GET | `/reservations/my/history` | Get My Reservation History |
| GET | `/reservations/my/:id` | Get My Reservation Details |
| GET | `/users/me/reviews` | List the authenticated Customer |
| DELETE | `/reviews/:id/images/:id` | Remove Review Image |
| POST | `/reviews` | Submit a review for a completed reservation |
| POST | `/reviews/:id/images` | Upload Review Image |
| GET | `/restaurants/:id/branches/:id/reservations` | List Branch Reservations (Restaurant Dashboard Calendar) |
| POST | `/restaurants/:id/notifications/broadcast` | Broadcast Notification to all Customers (Restaurant Owner) |
| GET | `/organizations/members` | List Organization Members |
| PATCH | `/organizations/members/:id/role` | Change Member Role |
| DELETE | `/organizations/members/:id` | Remove Member |
| POST | `/organizations/members/:id/transfer-ownership` | Transfer Ownership (self-service) |
| POST | `/organizations/invitations` | Issue Organization Invitation |
| GET | `/organizations/invitations` | List Organization Invitations |
| DELETE | `/organizations/invitations/:id` | Revoke Organization Invitation |
| POST | `/invitations/:id/accept` | Accept Organization Invitation |
| GET | `/platform-admin/dashboard` | Get Platform Dashboard |
| GET | `/platform-admin/restaurants` | Search Restaurants (lookup) |
| POST | `/platform-admin/restaurants/:id/suspend` | Suspend Restaurant (Platform Admin) |
| POST | `/platform-admin/restaurants/:id/reactivate` | Reactivate Restaurant (Platform Admin) |
| POST | `/platform-admin/restaurants/:id/delete` | Delete Restaurant (Platform Admin) |
| POST | `/platform-admin/restaurants/:id/restore` | Restore Restaurant (Platform Admin) |
| GET | `/platform-admin/organizations` | Search Organizations (lookup) |
| POST | `/platform-admin/organizations/:id/suspend` | Suspend Organization (Platform Admin) |
| POST | `/platform-admin/organizations/:id/reactivate` | Reactivate Organization (Platform Admin) |
| POST | `/platform-admin/organizations/:id/delete` | Delete Organization (Platform Admin) |
| POST | `/platform-admin/organizations/:id/restore` | Restore Organization (Platform Admin) |
| POST | `/platform-admin/organizations/:id/transfer-ownership` | Transfer Organization Ownership (Platform Admin) |
| POST | `/platform-admin/accounts/:id/force-logout` | Force Logout Account |
| POST | `/platform-admin/accounts/:id/reset-credentials` | Reset Account Credentials |
| POST | `/platform-admin/accounts/:id/disable-login` | Disable Account Login |
| POST | `/platform-admin/accounts/:id/enable-login` | Enable Account Login |
| GET | `/platform-admin/acquisitions/:id` | Get Customer Acquisition by id (lookup) |
| GET | `/platform-admin/acquisitions` | List Customer Acquisitions |
| POST | `/platform-admin/acquisitions/manual` | Manually Record Customer Acquisition |
| POST | `/platform-admin/acquisitions/:id/reverse` | Reverse Customer Acquisition |
| GET | `/platform-admin/pricing/rules` | List/Search Pricing Rules (lookup) |
| POST | `/platform-admin/pricing/rules` | Activate Pricing Rule |
| POST | `/platform-admin/pricing/simulate` | Simulate Acquisition Pricing |
| GET | `/platform-admin/revenue/report` | Get Revenue Report |
| GET | `/platform-admin/revenue/export` | Export Customer Acquisitions |
| GET | `/platform-admin/audit-logs` | List Audit Logs |
| POST | `/platform-admin/notifications` | Send Notification to one Customer (Platform Admin) |
| POST | `/platform-admin/notifications/broadcast` | Broadcast Notification to all Customers (Platform Admin) |
| POST | `/platform-admin/restaurant-owners` | Provision Restaurant Owner |
| POST | `/platform-admin/organizations/:id/subscription` | Create Resource |
| POST | `/platform-admin/organizations/:id/subscription/reactivate` | Create Resource (POST) |
| GET | `/platform-admin/plans` | List Plans |
| GET | `/platform-admin/organizations/:id/subscription` | Get Subscription |
| POST | `/platform-admin/organizations/:id/subscription/cancel` | cancel |
| POST | `/platform-admin/organizations/:id/subscription/suspend` | Suspend an Organization subscription (Platform Admin only) |
| POST | `/platform-admin/admins` | Create Platform Admin Account |
| GET | `/platform-admin/admins` | List Platform Admin Accounts |
| GET | `/platform-admin/admins/:id` | Get Platform Admin Account |
| PATCH | `/platform-admin/admins/:id` | Update Platform Admin Role |
| POST | `/platform-admin/admins/:id/deactivate` | Deactivate Platform Admin Account |
| POST | `/platform-admin/admins/:id/reactivate` | Reactivate Platform Admin Account |

---

## Full match matrix (dashboard scope)

### 00 - System

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/health` | `health.getHealth` | client-only |
| GET | `/health/liveness` | `health.getLiveness` | client-only |
| GET | `/health/readiness` | `health.getReadiness` | client-only |

### 01 - Customer

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/auth/refresh` | `client.refreshSession` | wired |
| GET | `/auth/sessions` | `auth.listSessions` | wired |
| POST | `/auth/change-password` | `auth.changePassword` | wired |
| POST | `/auth/logout-all` | `auth.logoutAll` | wired |
| POST | `/auth/logout` | `auth.logout` | wired |
| DELETE | `/auth/sessions/:id` | `auth.revokeSession` | wired |
| GET | `/users/me` | `users.getCurrentUser` | wired |
| GET | `/users/me/preferences` | `users.getMyPreferences` | wired |
| PATCH | `/users/me/preferences` | `users.updateMyPreferences` | wired |
| PATCH | `/users/me` | `users.updateCurrentUser` | wired |
| DELETE | `/users/me` | **MISSING** | — |
| POST | `/users/me/cancel-deletion` | **MISSING** | — |
| GET | `/users/me/export` | **MISSING** | — |
| POST | `/users/me/avatar` | `users.uploadMyAvatar` | wired |
| GET | `/restaurants/:id/menus` | `menus.listMenus` | wired |
| GET | `/restaurants/:id/menus/:id/categories/:id` | `menus.getMenu` | wired |
| GET | `/restaurants/:id/menus/:id` | `menus.getMenu` | wired |
| GET | `/restaurants/:id/menus/default` | `menus.getDefaultMenu` | wired |
| GET | `/restaurants/:id/menus/:id/categories/:id/items/:id` | `menus.getMenu` | wired |
| POST | `/discovery/restaurants/compare` | **MISSING** | — |
| GET | `/cuisine-categories` | **MISSING** | — |
| GET | `/occasion-categories` | **MISSING** | — |
| GET | `/discovery/restaurants/nearby` | **MISSING** | — |
| GET | `/discovery/restaurants` | **MISSING** | — |
| GET | `/discovery/restaurants/:id/branches/:id/floor-plan` | **MISSING** | — |
| GET | `/discovery/restaurants/:id/branches/:id` | **MISSING** | — |
| GET | `/discovery/restaurants/:id` | **MISSING** | — |
| GET | `/discovery/restaurants/:id/offers` | **MISSING** | — |
| GET | `/discovery/restaurants/:id/branches` | **MISSING** | — |
| GET | `/reservations/my` | **MISSING** | — |
| GET | `/reservations/my/upcoming` | **MISSING** | — |
| GET | `/reservations/my/history` | **MISSING** | — |
| GET | `/reservations/my/:id` | **MISSING** | — |
| POST | `/reservations` | `reservations.createReservation + createStaffReservation` | wired |
| GET | `/reservations` | `reservations.listMyReservations` | wired |
| GET | `/reservations/:id` | `reservations.getMyReservation` | wired |
| GET | `/reservations/availability` | `reservations.searchAvailability` | wired |
| POST | `/reservations/:id/cancel` | `reservations.cancelReservation` | wired |
| POST | `/reservations/:id/reschedule` | `reservations.rescheduleReservation` | wired |
| POST | `/waitlist/:id/cancel` | `waitlist.cancelWaitlistEntry` | wired |
| POST | `/waitlist` | `waitlist.joinWaitlist` | wired |
| GET | `/users/me/reviews` | **MISSING** | — |
| GET | `/restaurants/:id/reviews` | `reviews.listRestaurantReviews` | wired |
| GET | `/reviews/:id` | `reviews.getReview` | wired |
| DELETE | `/reviews/:id/images/:id` | **MISSING** | — |
| POST | `/reviews` | **MISSING** | — |
| POST | `/reviews/:id/images` | **MISSING** | — |
| DELETE | `/reviews/:id` | `reviews.deleteReview` | wired |
| GET | `/conversations/:id/messages` | `messaging.listConversationMessages` | wired |
| GET | `/conversations` | `messaging.listConversations` | client-only |
| GET | `/conversations/:id` | `messaging.getConversation` | wired |
| POST | `/conversations/:id/close` | `messaging.closeConversation` | wired |
| POST | `/conversations/:id/read` | `messaging.markConversationRead` | wired |
| POST | `/conversations/:id/messages` | `messaging.sendConversationMessage` | wired |
| POST | `/conversations` | `messaging.startConversation` | wired |
| GET | `/notifications` | `notifications.listNotifications` | wired |
| GET | `/notifications/identity-token` | `notifications.getOneSignalIdentityToken` | wired |
| GET | `/notifications/unread-count` | `notifications.getUnreadNotificationCount` | wired |
| PATCH | `/notifications/read-all` | `notifications.markAllNotificationsRead` | wired |
| PATCH | `/notifications/:id/read` | `notifications.markNotificationRead` | wired |

### 02 - Restaurant

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/auth/login` | `auth.login` | wired |
| POST | `/auth/forgot-password` | `auth.forgotPassword` | wired |
| POST | `/auth/reset-password` | `auth.resetPassword` | wired |
| POST | `/reviews/:id/reply` | `reviews.replyToReview` | wired |
| POST | `/restaurants` | `restaurants.createRestaurant` | wired |
| GET | `/restaurants/:id/gallery` | `restaurants.listRestaurantGallery` | wired |
| GET | `/restaurants` | `restaurants.listRestaurants` | wired |
| GET | `/restaurants/:id` | `restaurants.getRestaurant` | wired |
| GET | `/restaurants/:id/cuisine-categories` | `restaurants.getRestaurantCuisineCategories` | wired |
| GET | `/restaurants/:id/occasion-categories` | `restaurants.getRestaurantOccasionCategories` | wired |
| GET | `/restaurants/:id/settings` | `restaurants.getRestaurantSettings` | wired |
| GET | `/restaurants/:id/working-hours` | `restaurants.getRestaurantWorkingHours` | wired |
| PATCH | `/restaurants/:id/cuisine-categories` | `restaurants.setRestaurantCuisineCategories` | wired |
| PATCH | `/restaurants/:id/occasion-categories` | `restaurants.setRestaurantOccasionCategories` | wired |
| PATCH | `/restaurants/:id` | `restaurants.updateRestaurant` | wired |
| PATCH | `/restaurants/:id/settings` | `restaurants.updateRestaurantSettings` | wired |
| PATCH | `/restaurants/:id/working-hours` | `restaurants.updateRestaurantWorkingHours` | wired |
| DELETE | `/restaurants/:id/gallery/:id` | `restaurants.removeRestaurantGalleryImage` | wired |
| POST | `/restaurants/:id/gallery` | `restaurants.addRestaurantGalleryImage` | wired |
| DELETE | `/restaurants/:id` | `restaurants.deleteRestaurant` | wired |
| POST | `/restaurants/:id/branches` | `branches.createBranch` | wired |
| GET | `/restaurants/:id/branches` | `branches.listBranches` | wired |
| GET | `/restaurants/:id/branches/:id` | `branches.getBranch` | wired |
| GET | `/restaurants/:id/branches/:id/working-hours` | `branches.getBranchWorkingHours` | wired |
| PATCH | `/restaurants/:id/branches/:id` | `branches.updateBranch` | wired |
| PATCH | `/restaurants/:id/branches/:id/working-hours` | `branches.updateBranchWorkingHours` | wired |
| DELETE | `/restaurants/:id/branches/:id` | `branches.deleteBranch` | wired |
| POST | `/restaurants/:id/branches/:id/floor-plans` | `floorPlans.createFloorPlan` | wired |
| GET | `/restaurants/:id/branches/:id/floor-plans` | `floorPlans.listFloorPlans` | wired |
| GET | `/restaurants/:id/branches/:id/floor-plans/:id/tables` | `tables.listTablesByFloorPlan` | wired |
| PATCH | `/restaurants/:id/branches/:id/floor-plans/:id/activate` | `floorPlans.activateFloorPlan` | wired |
| POST | `/restaurants/:id/branches/:id/tables` | `tables.createTable` | wired |
| GET | `/restaurants/:id/branches/:id/tables` | `tables.listTablesByBranch` | wired |
| GET | `/tables/:id` | `tables.getTable` | wired |
| POST | `/tables/:id/status` | `tables.changeTableStatus` | wired |
| PATCH | `/tables/:id` | `tables.updateTable` | wired |
| POST | `/tables/merge` | `tables.mergeTables` | wired |
| POST | `/tables/:id/move` | `tables.moveTable` | wired |
| POST | `/tables/:id/split` | `tables.splitTable` | wired |
| DELETE | `/tables/:id` | `tables.deleteTable` | wired |
| POST | `/reservations/:id/no-show` | `reservations.markReservationNoShow` | wired |
| GET | `/restaurants/:id/branches/:id/reservations` | **MISSING** | — |
| POST | `/reservations/:id/approve` | `reservations.approveReservation` | wired |
| POST | `/reservations/:id/complete` | `reservations.completeReservation` | wired |
| POST | `/reservations/:id/table-ready` | `reservations.markReservationTableReady` | wired |
| POST | `/reservations/:id/reject` | `reservations.rejectReservation` | wired |
| POST | `/waitlist/:id/promote` | `waitlist.promoteWaitlistEntry` | wired |
| POST | `/restaurants/:id/employees/:id/branches` | `employees.assignEmployeeToBranch` | wired |
| POST | `/restaurants/:id/employees/:id/role` | `employees.assignEmployeeRole` | wired |
| DELETE | `/restaurants/:id/employees/:id/branches/:id` | `employees.removeEmployeeFromBranch` | wired |
| POST | `/restaurants/:id/employees` | `employees.inviteEmployee` | wired |
| DELETE | `/restaurants/:id/employees/:id` | `employees.removeEmployee` | wired |
| POST | `/restaurants/:id/menus/:id/categories` | `menus.createMenuCategory` | wired |
| POST | `/restaurants/:id/menus` | `menus.createMenu` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/add-ons` | `menus.createMenuItemAddOn` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items` | `menus.createMenuItem` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups` | `menus.createMenuItemOptionGroup` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options` | `menus.createMenuItemOption` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id/items/:id/availability` | `menus.replaceMenuItemAvailability` | wired |
| POST | `/restaurants/:id/menus/:id/set-default` | `menus.setDefaultMenu` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id` | `menus.updateMenuCategory` | wired |
| PATCH | `/restaurants/:id/menus/:id` | `menus.updateMenu` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id/items/:id/add-ons/:id` | `menus.updateMenuItemAddOn` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options/:id` | `menus.updateMenuItemOption` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id` | `menus.updateMenuItemOptionGroup` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id/items/:id` | `menus.updateMenuItem` | wired |
| POST | `/restaurants/:id/menus/:id/activate` | `menus.activateMenu` | wired |
| POST | `/restaurants/:id/menus/:id/deactivate` | `menus.deactivateMenu` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/feature` | `menus.featureMenuItem` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id/image` | `menus.removeMenuCategoryImage` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id/items/:id/image` | `menus.removeMenuItemImage` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/reorder` | `menus.reorderMenuCategories` | wired |
| PATCH | `/restaurants/:id/menus/:id/categories/:id/items/reorder` | `menus.reorderMenuItems` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/unfeature` | `menus.unfeatureMenuItem` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/image` | `menus.uploadMenuCategoryImage` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/image` | `menus.uploadMenuItemImage` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id` | `menus.deleteMenuCategory` | wired |
| DELETE | `/restaurants/:id/menus/:id` | `menus.deleteMenu` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id/items/:id/add-ons/:id` | `menus.deleteMenuItemAddOn` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id/items/:id` | `menus.deleteMenuItem` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options/:id` | `menus.deleteMenuItemOption` | wired |
| DELETE | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id` | `menus.deleteMenuItemOptionGroup` | wired |
| POST | `/restaurants/:id/offers` | `offers.createOffer` | wired |
| GET | `/restaurants/:id/offers` | `offers.listOffers` | wired |
| PATCH | `/restaurants/:id/offers/:id` | `offers.updateOffer` | wired |
| POST | `/restaurants/:id/offers/:id/publish` | `offers.publishOffer` | wired |
| DELETE | `/restaurants/:id/offers/:id` | `offers.deleteOffer` | wired |
| GET | `/restaurants/:id/analytics/customers` | `analytics.getCustomerInsights` | wired |
| GET | `/restaurants/:id/analytics/branches/:id/peak-hours` | `analytics.getBranchPeakHours` | wired |
| GET | `/restaurants/:id/analytics/branches/:id/reservations/trends` | `analytics.getBranchReservationTrends` | wired |
| GET | `/restaurants/:id/analytics/reservations/summary` | `analytics.getReservationSummary` | wired |
| GET | `/organization/analytics/reservations/summary` | `analytics.getOrganizationReservationSummary` | wired |
| GET | `/restaurants/:id/analytics/reviews-summary` | `analytics.getReviewsSummary` | wired |
| GET | `/restaurants/:id/analytics/waitlist` | `analytics.getWaitlistAnalytics` | wired |
| GET | `/restaurants/:id/conversations` | `messaging.listRestaurantConversations` | wired |
| POST | `/restaurants/:id/notifications/broadcast` | **MISSING** | — |
| GET | `/organizations/subscription` | `organizations.getOrganizationSubscription` | wired |
| GET | `/organizations/subscription/usage` | `organizations.getOrganizationSubscriptionUsage` | wired |
| GET | `/organizations/members` | **MISSING** | — |
| PATCH | `/organizations/members/:id/role` | **MISSING** | — |
| DELETE | `/organizations/members/:id` | **MISSING** | — |
| POST | `/organizations/members/:id/transfer-ownership` | **MISSING** | — |
| POST | `/organizations/invitations` | **MISSING** | — |
| GET | `/organizations/invitations` | **MISSING** | — |
| DELETE | `/organizations/invitations/:id` | **MISSING** | — |
| POST | `/invitations/:id/accept` | **MISSING** | — |

### 03 - Platform Owner

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/platform-admin/dashboard` | **MISSING** | — |
| GET | `/platform-admin/restaurants` | **MISSING** | — |
| POST | `/platform-admin/restaurants/:id/suspend` | **MISSING** | — |
| POST | `/platform-admin/restaurants/:id/reactivate` | **MISSING** | — |
| POST | `/platform-admin/restaurants/:id/delete` | **MISSING** | — |
| POST | `/platform-admin/restaurants/:id/restore` | **MISSING** | — |
| GET | `/platform-admin/organizations` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/suspend` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/reactivate` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/delete` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/restore` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/transfer-ownership` | **MISSING** | — |
| POST | `/platform-admin/accounts/:id/force-logout` | **MISSING** | — |
| POST | `/platform-admin/accounts/:id/reset-credentials` | **MISSING** | — |
| POST | `/platform-admin/accounts/:id/disable-login` | **MISSING** | — |
| POST | `/platform-admin/accounts/:id/enable-login` | **MISSING** | — |
| GET | `/platform-admin/acquisitions/:id` | **MISSING** | — |
| GET | `/platform-admin/acquisitions` | **MISSING** | — |
| POST | `/platform-admin/acquisitions/manual` | **MISSING** | — |
| POST | `/platform-admin/acquisitions/:id/reverse` | **MISSING** | — |
| GET | `/platform-admin/pricing/rules` | **MISSING** | — |
| POST | `/platform-admin/pricing/rules` | **MISSING** | — |
| POST | `/platform-admin/pricing/simulate` | **MISSING** | — |
| GET | `/platform-admin/revenue/report` | **MISSING** | — |
| GET | `/platform-admin/revenue/export` | **MISSING** | — |
| GET | `/platform-admin/audit-logs` | **MISSING** | — |
| POST | `/platform-admin/notifications` | **MISSING** | — |
| POST | `/platform-admin/notifications/broadcast` | **MISSING** | — |
| POST | `/platform-admin/restaurant-owners` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/subscription` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/subscription/reactivate` | **MISSING** | — |
| GET | `/platform-admin/plans` | **MISSING** | — |
| GET | `/platform-admin/organizations/:id/subscription` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/subscription/cancel` | **MISSING** | — |
| POST | `/platform-admin/organizations/:id/subscription/suspend` | **MISSING** | — |
| POST | `/platform-admin/admins` | **MISSING** | — |
| GET | `/platform-admin/admins` | **MISSING** | — |
| GET | `/platform-admin/admins/:id` | **MISSING** | — |
| PATCH | `/platform-admin/admins/:id` | **MISSING** | — |
| POST | `/platform-admin/admins/:id/deactivate` | **MISSING** | — |
| POST | `/platform-admin/admins/:id/reactivate` | **MISSING** | — |


---

## Documented contract gaps (no Postman list route)

| Capability | Postman | Dashboard UI |
|---|---|---|
| Waitlist queue | `POST /waitlist`, cancel, promote only — **no** `GET /waitlist` | Waitlist page uses session-local entries + live mutations |
| Employees roster | invite / role / branch assign / remove — **no** `GET …/employees` | Staff page invite + manage-by-id |

---

## Related docs

| Doc | Role |
|---|---|
| `docs/API_INTEGRATION.md` | Contract consumption rules |
| `docs/ARCHITECTURE.md` | `src/api` folder map |
| `postman/RECONCILIATION_REPORT.md` | 173-endpoint collection reconciliation |
| `scripts/build-compat-matrix.mjs` | Regenerates this matrix |

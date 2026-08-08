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
| Dashboard-relevant Postman endpoints | **142** |
| Unique method+path keys | **142** |
| Matched in `src/api/*` | **138 / 142** (97%) |
| Missing client functions | **4** |
| UI wired (heuristic) | **134** |
| UI client-only (health / customer inbox) | **4** |
| Intentionally out of scope | Customer Auth, Platform Admin, Discovery, Platform Subscriptions, customer favorites, Prometheus/metrics |

**Gaps remain** — the 4 missing rows are **customer-only** review flows (submit/list-mine/images), intentionally out of staff dashboard scope. All Owner/Admin/Employee-capable in-scope endpoints have typed clients.

---

## Method

1. Parsed `postman/TAVLA-API.postman_collection.json` (173 total; 142 in dashboard scope).
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

## Missing client functions (4)

| Method | Path | Postman name |
|---|---|---|
| GET | `/users/me/reviews` | List the authenticated Customer |
| DELETE | `/reviews/:id/images/:id` | Remove Review Image |
| POST | `/reviews` | Submit a review for a completed reservation |
| POST | `/reviews/:id/images` | Upload Review Image |

---

## Full match matrix (dashboard scope)

### 00 - Authentication

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/auth/login` | `auth.login` | wired |
| POST | `/auth/refresh` | `client.refreshSession` | wired |
| POST | `/auth/forgot-password` | `auth.forgotPassword` | wired |
| POST | `/auth/reset-password` | `auth.resetPassword` | wired |
| GET | `/auth/sessions` | `auth.listSessions` | wired |
| POST | `/auth/change-password` | `auth.changePassword` | wired |
| POST | `/auth/logout-all` | `auth.logoutAll` | wired |
| POST | `/auth/logout` | `auth.logout` | wired |
| DELETE | `/auth/sessions/:id` | `auth.revokeSession` | wired |

### 02 - Customer API

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/users/me/reviews` | **MISSING** | — |
| GET | `/users/me` | `users.getCurrentUser` | wired |
| GET | `/users/me/preferences` | `users.getMyPreferences` | wired |
| PATCH | `/users/me/preferences` | `users.updateMyPreferences` | wired |
| PATCH | `/users/me` | `users.updateCurrentUser` | wired |
| POST | `/users/me/avatar` | `users.uploadMyAvatar` | wired |

### 08 - Reservations

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/reservations` | `reservations.createReservation + createStaffReservation` | wired |
| POST | `/reservations/:id/no-show` | `reservations.markReservationNoShow` | wired |
| GET | `/reservations` | `reservations.listMyReservations` | wired |
| GET | `/reservations/:id` | `reservations.getMyReservation` | wired |
| GET | `/reservations/availability` | `reservations.searchAvailability` | wired |
| POST | `/reservations/:id/approve` | `reservations.approveReservation` | wired |
| POST | `/reservations/:id/cancel` | `reservations.cancelReservation` | wired |
| POST | `/reservations/:id/complete` | `reservations.completeReservation` | wired |
| POST | `/reservations/:id/table-ready` | `reservations.markReservationTableReady` | wired |
| POST | `/reservations/:id/reject` | `reservations.rejectReservation` | wired |
| POST | `/reservations/:id/reschedule` | `reservations.rescheduleReservation` | wired |

### 09 - Waitlist

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/waitlist/:id/cancel` | `waitlist.cancelWaitlistEntry` | wired |
| POST | `/waitlist/:id/promote` | `waitlist.promoteWaitlistEntry` | wired |
| POST | `/waitlist` | `waitlist.joinWaitlist` | wired |

### 10 - Reviews

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/restaurants/:id/reviews` | `reviews.listRestaurantReviews` | wired |
| GET | `/reviews/:id` | `reviews.getReview` | wired |
| DELETE | `/reviews/:id/images/:id` | **MISSING** | — |
| POST | `/reviews/:id/reply` | `reviews.replyToReview` | wired |
| POST | `/reviews` | **MISSING** | — |
| POST | `/reviews/:id/images` | **MISSING** | — |
| DELETE | `/reviews/:id` | `reviews.deleteReview` | wired |

### 11 - Offers

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/restaurants/:id/offers` | `offers.createOffer` | wired |
| GET | `/restaurants/:id/offers` | `offers.listOffers` | wired |
| PATCH | `/restaurants/:id/offers/:id` | `offers.updateOffer` | wired |
| POST | `/restaurants/:id/offers/:id/publish` | `offers.publishOffer` | wired |
| DELETE | `/restaurants/:id/offers/:id` | `offers.deleteOffer` | wired |

### 12 - Menu

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/restaurants/:id/menus/:id/categories` | `menus.createMenuCategory` | wired |
| POST | `/restaurants/:id/menus` | `menus.createMenu` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/add-ons` | `menus.createMenuItemAddOn` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items` | `menus.createMenuItem` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups` | `menus.createMenuItemOptionGroup` | wired |
| POST | `/restaurants/:id/menus/:id/categories/:id/items/:id/option-groups/:id/options` | `menus.createMenuItemOption` | wired |
| GET | `/restaurants/:id/menus` | `menus.listMenus` | wired |
| GET | `/restaurants/:id/menus/:id/categories/:id` | `menus.getMenu` | wired |
| GET | `/restaurants/:id/menus/:id` | `menus.getMenu` | wired |
| GET | `/restaurants/:id/menus/default` | `menus.getDefaultMenu` | wired |
| GET | `/restaurants/:id/menus/:id/categories/:id/items/:id` | `menus.getMenu` | wired |
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

### 13 - Messaging

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/restaurants/:id/conversations` | `messaging.listRestaurantConversations` | wired |
| GET | `/conversations/:id/messages` | `messaging.listConversationMessages` | wired |
| GET | `/conversations` | `messaging.listConversations` | client-only |
| GET | `/conversations/:id` | `messaging.getConversation` | wired |
| POST | `/conversations/:id/close` | `messaging.closeConversation` | wired |
| POST | `/conversations/:id/read` | `messaging.markConversationRead` | wired |
| POST | `/conversations/:id/messages` | `messaging.sendConversationMessage` | wired |
| POST | `/conversations` | `messaging.startConversation` | wired |

### 14 - Analytics

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/restaurants/:id/analytics/customers` | `analytics.getCustomerInsights` | wired |
| GET | `/restaurants/:id/analytics/branches/:id/peak-hours` | `analytics.getBranchPeakHours` | wired |
| GET | `/restaurants/:id/analytics/branches/:id/reservations/trends` | `analytics.getBranchReservationTrends` | wired |
| GET | `/restaurants/:id/analytics/reservations/summary` | `analytics.getReservationSummary` | wired |
| GET | `/organization/analytics/reservations/summary` | `analytics.getOrganizationReservationSummary` | wired |
| GET | `/restaurants/:id/analytics/reviews-summary` | `analytics.getReviewsSummary` | wired |
| GET | `/restaurants/:id/analytics/waitlist` | `analytics.getWaitlistAnalytics` | wired |

### 15 - Restaurants

| Method | Path | Client | UI |
|---|---|---|---|
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

### 16 - Branches

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/restaurants/:id/branches` | `branches.createBranch` | wired |
| GET | `/restaurants/:id/branches` | `branches.listBranches` | wired |
| GET | `/restaurants/:id/branches/:id` | `branches.getBranch` | wired |
| GET | `/restaurants/:id/branches/:id/working-hours` | `branches.getBranchWorkingHours` | wired |
| PATCH | `/restaurants/:id/branches/:id` | `branches.updateBranch` | wired |
| PATCH | `/restaurants/:id/branches/:id/working-hours` | `branches.updateBranchWorkingHours` | wired |
| DELETE | `/restaurants/:id/branches/:id` | `branches.deleteBranch` | wired |

### 17 - Floor Plans

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/restaurants/:id/branches/:id/floor-plans` | `floorPlans.createFloorPlan` | wired |
| GET | `/restaurants/:id/branches/:id/floor-plans` | `floorPlans.listFloorPlans` | wired |
| GET | `/restaurants/:id/branches/:id/floor-plans/:id/tables` | `tables.listTablesByFloorPlan` | wired |
| PATCH | `/restaurants/:id/branches/:id/floor-plans/:id/activate` | `floorPlans.activateFloorPlan` | wired |

### 18 - Tables

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/restaurants/:id/branches/:id/tables` | `tables.createTable` | wired |
| GET | `/restaurants/:id/branches/:id/tables` | `tables.listTablesByBranch` | wired |
| GET | `/tables/:id` | `tables.getTable` | wired |
| POST | `/tables/:id/status` | `tables.changeTableStatus` | wired |
| PATCH | `/tables/:id` | `tables.updateTable` | wired |
| POST | `/tables/merge` | `tables.mergeTables` | wired |
| POST | `/tables/:id/move` | `tables.moveTable` | wired |
| POST | `/tables/:id/split` | `tables.splitTable` | wired |
| DELETE | `/tables/:id` | `tables.deleteTable` | wired |

### 19 - Employees

| Method | Path | Client | UI |
|---|---|---|---|
| POST | `/restaurants/:id/employees/:id/branches` | `employees.assignEmployeeToBranch` | wired |
| POST | `/restaurants/:id/employees/:id/role` | `employees.assignEmployeeRole` | wired |
| DELETE | `/restaurants/:id/employees/:id/branches/:id` | `employees.removeEmployeeFromBranch` | wired |
| POST | `/restaurants/:id/employees` | `employees.inviteEmployee` | wired |
| DELETE | `/restaurants/:id/employees/:id` | `employees.removeEmployee` | wired |

### 21 - Organizations

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/organizations/subscription` | `organizations.getOrganizationSubscription` | wired |
| GET | `/organizations/subscription/usage` | `organizations.getOrganizationSubscriptionUsage` | wired |

### 23 - Notifications

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/notifications` | `notifications.listNotifications` | wired |
| GET | `/notifications/identity-token` | `notifications.getOneSignalIdentityToken` | wired |
| GET | `/notifications/unread-count` | `notifications.getUnreadNotificationCount` | wired |
| PATCH | `/notifications/read-all` | `notifications.markAllNotificationsRead` | wired |
| PATCH | `/notifications/:id/read` | `notifications.markNotificationRead` | wired |

### 25 - Health

| Method | Path | Client | UI |
|---|---|---|---|
| GET | `/health` | `health.getHealth` | client-only |
| GET | `/health/liveness` | `health.getLiveness` | client-only |
| GET | `/health/readiness` | `health.getReadiness` | client-only |


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

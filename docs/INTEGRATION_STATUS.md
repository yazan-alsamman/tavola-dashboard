# INTEGRATION_STATUS.md

> **Document purpose:** Record of the Postman → dashboard linking pass (July 2026): process followed, what was added, what UI was wired, and the current live-vs-mock situation.
>
> **Contract source of truth:** `postman collection/TAVLA-API.postman_collection.json` (mirror of `../back/TAVLA-API.postman_collection.json`). If this file disagrees with Postman or `docs/API_INTEGRATION.md`, those win — update this status doc in the same change.

**Last updated:** 2026-07-24  
**Scope:** Frontend dashboard (`tavola-dashboard`) only — does not implement backend routes.

---

# 1. Process

1. Cloned / pulled the dashboard repo and installed dependencies (`npm install`).
2. Fixed local runtime blockers (missing `node_modules`, Material icon font failure, missing `.env.local`).
3. Extracted every request from the Postman collection (method + path + body).
4. Inventoried existing `src/api/*` modules and which pages still used `mockData` / `RestaurantContext`.
5. Added missing **dashboard-relevant** API client functions to match Postman (skipped Customer Auth and Platform Admin).
6. Wired UI pages that had clear Postman coverage (Branches, Settings, reservation lifecycle).
7. Updated `docs/API_INTEGRATION.md` and `docs/ARCHITECTURE.md` so the catalog matches the new modules.

---

# 2. Local setup fixes (same session)

| Issue | Cause | Fix |
|---|---|---|
| `'vite' is not recognized` | Dependencies not installed | `npm install` |
| Icons rendered as text (`mail`, `lock`, …) | Material Symbols Google Font failed to load | `MaterialIcon` now maps ligature names → **Lucide** (`src/components/ui/Icon.tsx`) |
| Login → `حدث خطأ ما` + Vite `ECONNREFUSED` on `/api/v1/auth/login` | No `.env.local` and **no backend** on proxy target | Created `.env.local` from `.env.example`; proxy still needs backend at `VITE_DEV_API_PROXY_TARGET` (default `http://localhost:3000`) |

`.env.local` (gitignored):

```
VITE_API_BASE_URL=/api/v1
VITE_DEV_API_PROXY_TARGET=http://localhost:3000
```

Restart `npm run dev` after changing env files.

---

# 3. What was added — `src/api/*`

### Extended modules

| File | Added |
|---|---|
| `src/api/auth.ts` | `forgotPassword`, `resetPassword`, `changePassword`, `listSessions`, `revokeSession` |
| `src/api/users.ts` | `updateCurrentUser`, `getMyPreferences`, `updateMyPreferences`, `uploadMyAvatar` |
| `src/api/restaurants.ts` | `createRestaurant`, `updateRestaurant`, `deleteRestaurant`, settings GET/PATCH, working-hours GET/PATCH, gallery list/add/remove, cuisine/occasion category get/set |
| `src/api/branches.ts` | `createBranch`, `updateBranch`, `deleteBranch`, branch working-hours GET/PATCH |
| `src/api/reservations.ts` | `cancelReservation`, `rescheduleReservation`, `completeReservation`, `markReservationNoShow` |

### New modules

| File | Exports |
|---|---|
| `src/api/employees.ts` | `inviteEmployee`, `assignEmployeeRole`, `assignEmployeeToBranch`, `removeEmployeeFromBranch`, `removeEmployee` |
| `src/api/taxonomy.ts` | `listCuisineCategories`, `listOccasionCategories` |

### Already present (unchanged contract)

| File | Role |
|---|---|
| `src/api/client.ts` | Envelope client, refresh, `Idempotency-Key`, FormData |
| `src/api/tokenStore.ts` | Access (memory) + refresh (`sessionStorage`) |
| `src/api/floorPlans.ts` | List / create / activate |
| `src/api/tables.ts` | Full table CRUD + move + status |

### Intentionally not added (out of dashboard scope)

- Entire **Customer Authentication** folder
- Entire **Platform Admin** folder
- Customer **favorites** endpoints under `/users/me/favorites*`

---

# 4. What UI was wired

| Page | Before | After |
|---|---|---|
| `Branches.tsx` | Mock `branches` from `mockData` | Live list from `RestaurantScopeContext` + **create** / **delete** via `src/api/branches.ts` |
| `Settings.tsx` | Mock `restaurantInfo` + static forms | Live **profile** (`GET/PATCH /restaurants/:id`), **hours** (working-hours), **rules** (settings) for selected restaurant |
| `ReservationDetail.tsx` | Gap-only empty state | Lifecycle actions for a known `:id`: cancel, reschedule, complete, no-show (still no GET detail) |
| `Reservations.tsx` | Create panel + “nothing live” copy | Create panel unchanged; copy updated to reflect lifecycle wiring; **list still absent** |

Supporting copy updates: `src/i18n/en.ts`, `src/i18n/ar.ts` (`reservations.backendGap.*`).

---

# 5. Current situation — page matrix

| Surface | Data source | Notes |
|---|---|---|
| Login / session | **Live** | `POST /auth/login`, refresh, logout; requires running backend |
| Shell scope (restaurant / branch picker) | **Live** | `listAllRestaurants` / `listAllBranches` |
| Tables | **Live** | TanStack Query + inventory mutations |
| Floor Plan | **Live** | Same inventory stack; designer is not production authority |
| Reservations create + availability | **Live** | `GET …/availability`, `POST /reservations` |
| Reservation lifecycle by id | **API + UI wired** | Needs a known reservation id; no GET detail |
| Reservation staff list | **Blocked** | No list endpoint in Postman |
| Branches page | **Live** | Create/delete wired; edit form not built yet |
| Settings (profile / hours / rules) | **Live** | Policies tab removed from this pass (no matching settings fields) |
| Dashboard home | **Mock** | `RestaurantContext` / `mockData` |
| Calendar | **Mock** | |
| Walk-In | **Mock** | |
| Waitlist | **Mock** | No waitlist resource in Postman |
| Notifications | **Mock** | Not in Postman |
| Customers | **Mock** | Staff CRM not in Postman |
| Special Occasions | **Mock** | Taxonomy list API exists; occasion booking list does not |
| Reports | **Mock** | No analytics endpoints in Postman |
| Activity Logs | **Mock** | Not in Postman |
| Staff page | **Mock / unrouted** | Invite/role/branch APIs exist; **no list-employees** in Postman; page not in `App.tsx` routes |

---

# 6. Postman coverage vs dashboard client

Legend: ✅ in `src/api` · 🧩 also used by UI · ❌ skipped / not in collection for staff dashboard

### Authentication (staff)

| Endpoint | Client | UI |
|---|---|---|
| `POST /auth/login` | ✅ | 🧩 Login |
| `POST /auth/refresh` | ✅ (`client.ts`) | 🧩 silent |
| `POST /auth/logout` | ✅ | 🧩 |
| `POST /auth/logout-all` | ✅ | 🧩 |
| `POST /auth/forgot-password` | ✅ | — |
| `POST /auth/reset-password` | ✅ | — |
| `POST /auth/change-password` | ✅ | — |
| `GET /auth/sessions` | ✅ | — |
| `DELETE /auth/sessions/:id` | ✅ | — |

### Users

| Endpoint | Client | UI |
|---|---|---|
| `GET /users/me` | ✅ | 🧩 Auth bootstrap |
| `PATCH /users/me` | ✅ | — |
| `GET/PATCH /users/me/preferences` | ✅ | — |
| `POST /users/me/avatar` | ✅ | — |

### Restaurants / Branches / Taxonomy

| Endpoint | Client | UI |
|---|---|---|
| Restaurant list/get | ✅ | 🧩 Scope |
| Restaurant create/update/delete | ✅ | 🧩 Settings (update) |
| Settings + working hours | ✅ | 🧩 Settings |
| Gallery + cuisine/occasion assign | ✅ | — |
| Branch list/get | ✅ | 🧩 Scope + Branches |
| Branch create/update/delete + hours | ✅ | 🧩 Branches (create/delete) |
| Cuisine / occasion category lists | ✅ | — |

### Floor plans / Tables

| Endpoint | Client | UI |
|---|---|---|
| Floor plans list/create/activate | ✅ | 🧩 |
| Tables CRUD / move / status | ✅ | 🧩 |

### Reservations

| Endpoint | Client | UI |
|---|---|---|
| Availability + create | ✅ | 🧩 Reservations |
| Cancel / reschedule / complete / no-show | ✅ | 🧩 Reservation detail |
| List / GET by id / approve / reject | ❌ not in Postman | — |

### Employees

| Endpoint | Client | UI |
|---|---|---|
| Invite / role / branch assign / remove | ✅ | — (no Staff route + no list API) |
| List employees | ❌ not in Postman | — |

---

# 7. Known gaps (do not invent)

These are **not** implementable from the current Postman collection without backend work:

1. `GET` reservation list (branch-scoped staff inbox)
2. `GET /reservations/:id` (detail payload)
3. Approve / reject reservation Domain Actions (if still planned backend-side)
4. List employees
5. Waitlist, notifications, CRM customers, reports, activity logs
6. Phone / walk-in guest reservation create variants (docs previously marked Phase 7.4)

Until those exist, related pages must stay on mock data or honest empty states — do not fake server contracts.

---

# 8. How to verify

```bash
npm install
# ensure .env.local exists (see §2)
# start Tavla backend on the proxy target (default :3000)
npm run dev          # http://localhost:5173
npm run build        # tsc -b && vite build
npm run test:run     # existing API/unit tests
```

Manual checks once backend is up:

1. Login with a real org Owner/Admin account.
2. Branches — list matches API; create a branch; refresh scope header.
3. Settings — load/save profile, hours, rules for selected restaurant.
4. Reservations — availability search + create; open `/reservations/<id>` and exercise lifecycle actions.
5. Tables / Floor Plan — still work under selected branch.

---

# 9. Recommended next steps

1. Start or point at a live backend; confirm login + Branches/Settings against real data.
2. When Postman gains reservation **list** + **GET by id**, replace the Reservations hub empty state and load detail before lifecycle actions.
3. When Postman gains **list employees**, add Staff route and retire mock staff.
4. Wire Settings security UI to `changePassword` + `listSessions` / `revokeSession`.
5. Prefer TanStack Query for Branches/Settings reads once mutation invalidation patterns are needed (same as inventory).
6. Keep Dashboard / Waitlist / Notifications / Reports on mock until catalog endpoints exist.

---

# 10. Related docs

| Doc | Role |
|---|---|
| `docs/API_INTEGRATION.md` | Endpoint catalog + client rules (updated in this pass) |
| `docs/ARCHITECTURE.md` | Folder map including `employees.ts` / `taxonomy.ts` |
| `docs/AUTH_AND_RBAC.md` | Auth flow + roles |
| `docs/ENVIRONMENT_SETUP.md` | Env vars + proxy |
| `docs/DECISIONS.md` | ADRs (Phase 3–8 decisions; lifecycle wiring supersedes older “cancel not live” wording in ADR-006 narrative — prefer this status + API_INTEGRATION for current surface) |
| `postman collection/TAVLA-API.postman_collection.json` | Executable contract |

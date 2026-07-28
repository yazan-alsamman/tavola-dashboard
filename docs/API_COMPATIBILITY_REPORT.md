# API_COMPATIBILITY_REPORT.md

> Compatibility audit between the **backend Postman contract** and the **dashboard `src/api` client**.
>
> **Contract source:** `postman collection/TAVLA-API.postman_collection.json`  
> **Date:** 2026-07-28  
> **Backend host verified:** `http://187.127.76.76:3000/api/v1`

---

## Verdict

| Scope | Result |
|---|---|
| Dashboard-relevant Postman endpoints | **80** |
| Unique method+path keys | **79** (`POST /reservations` appears twice: Online + Phone/Walk-In) |
| Matched in `src/api/*` | **80 / 80 (100%)** |
| Missing client functions | **0** |
| Intentionally out of scope | Customer Auth, Platform Admin, Discovery, customer favorites |

**API client layer is compatible with the backend Postman contract for all staff-dashboard endpoints.**

UI pages may still use mock data for some of those APIs (Notifications, Waitlist, reservation list) — that is a **UI wiring** gap, not an API contract gap. See §4.

---

## Method

1. Parsed Postman collection folders relevant to the restaurant dashboard.
2. Excluded non-dashboard surfaces (Customer Authentication, Platform Admin, Discovery, `/users/me/favorites*`).
3. Mapped every remaining request to a named function in `src/api/*`.
4. Added missing modules/functions until coverage reached 100%.
5. `tsc -b` passed after the additions.

Re-check matrix:

```bash
node scripts/build-compat-matrix.mjs
```

---

## What was added in this pass (to close gaps)

| Module | New functions |
|---|---|
| `src/api/notifications.ts` | `listNotifications`, `getUnreadNotificationCount`, `getOneSignalIdentityToken`, `markNotificationRead`, `markAllNotificationsRead` |
| `src/api/waitlist.ts` | `joinWaitlist`, `cancelWaitlistEntry`, `promoteWaitlistEntry` |
| `src/api/health.ts` | `getHealth`, `getLiveness`, `getReadiness` (Terminus payloads; non-envelope fetch) |
| `src/api/tables.ts` | `mergeTables`, `splitTable` |
| `src/api/reservations.ts` | `createStaffReservation`, `listMyReservations`, `getMyReservation`, `approveReservation`, `rejectReservation`, `markReservationTableReady` (+ idempotent helpers) |

---

## Full match matrix (dashboard scope)

Legend: ✅ client function exists

### Authentication

| Method | Path | Client |
|---|---|---|
| POST | `/auth/login` | ✅ `auth.login` |
| POST | `/auth/refresh` | ✅ `client.refreshSession` |
| POST | `/auth/forgot-password` | ✅ `auth.forgotPassword` |
| POST | `/auth/reset-password` | ✅ `auth.resetPassword` |
| POST | `/auth/change-password` | ✅ `auth.changePassword` |
| POST | `/auth/logout` | ✅ `auth.logout` |
| POST | `/auth/logout-all` | ✅ `auth.logoutAll` |
| GET | `/auth/sessions` | ✅ `auth.listSessions` |
| DELETE | `/auth/sessions/:sessionId` | ✅ `auth.revokeSession` |

### Users (staff profile)

| Method | Path | Client |
|---|---|---|
| GET | `/users/me` | ✅ `users.getCurrentUser` |
| PATCH | `/users/me` | ✅ `users.updateCurrentUser` |
| GET | `/users/me/preferences` | ✅ `users.getMyPreferences` |
| PATCH | `/users/me/preferences` | ✅ `users.updateMyPreferences` |
| POST | `/users/me/avatar` | ✅ `users.uploadMyAvatar` |

### Notifications

| Method | Path | Client |
|---|---|---|
| GET | `/notifications` | ✅ `notifications.listNotifications` |
| GET | `/notifications/unread-count` | ✅ `notifications.getUnreadNotificationCount` |
| GET | `/notifications/identity-token` | ✅ `notifications.getOneSignalIdentityToken` |
| PATCH | `/notifications/:id/read` | ✅ `notifications.markNotificationRead` |
| PATCH | `/notifications/read-all` | ✅ `notifications.markAllNotificationsRead` |

### Taxonomy

| Method | Path | Client |
|---|---|---|
| GET | `/cuisine-categories` | ✅ `taxonomy.listCuisineCategories` |
| GET | `/occasion-categories` | ✅ `taxonomy.listOccasionCategories` |

### Restaurants

| Method | Path | Client |
|---|---|---|
| POST/GET/PATCH/DELETE | `/restaurants`, `/restaurants/:id` | ✅ |
| GET/PATCH | `/restaurants/:id/settings` | ✅ |
| GET/PATCH | `/restaurants/:id/working-hours` | ✅ |
| GET/POST/DELETE | `/restaurants/:id/gallery…` | ✅ |
| GET/PATCH | cuisine + occasion categories | ✅ |

### Branches / Floor plans / Tables / Employees

| Area | Client status |
|---|---|
| Branches CRUD + working-hours | ✅ `branches.*` |
| Floor plans list/create/activate | ✅ `floorPlans.*` |
| Tables CRUD + move/status + **merge/split** | ✅ `tables.*` |
| Employees invite/role/branches/remove | ✅ `employees.*` |

### Reservations

| Method | Path | Client |
|---|---|---|
| GET | `/reservations/availability` | ✅ `searchAvailability` |
| POST | `/reservations` (Online) | ✅ `createReservation` |
| POST | `/reservations` (Phone/Walk-In) | ✅ `createStaffReservation` |
| GET | `/reservations` | ✅ `listMyReservations` |
| GET | `/reservations/:id` | ✅ `getMyReservation` |
| POST | `…/approve` | ✅ `approveReservation` |
| POST | `…/reject` | ✅ `rejectReservation` |
| POST | `…/cancel` | ✅ `cancelReservation` |
| POST | `…/reschedule` | ✅ `rescheduleReservation` |
| POST | `…/complete` | ✅ `completeReservation` |
| POST | `…/no-show` | ✅ `markReservationNoShow` |
| POST | `…/table-ready` | ✅ `markReservationTableReady` |

### Waitlist / Health

| Method | Path | Client |
|---|---|---|
| POST | `/waitlist` | ✅ `joinWaitlist` |
| POST | `/waitlist/:id/cancel` | ✅ `cancelWaitlistEntry` |
| POST | `/waitlist/:id/promote` | ✅ `promoteWaitlistEntry` |
| GET | `/health`, `/health/liveness`, `/health/readiness` | ✅ `health.*` |

---

## Intentionally excluded (not dashboard)

| Folder / path | Why |
|---|---|
| Customer Authentication | Customer app / OTP flows |
| Platform Admin | Internal platform tooling |
| Discovery | Public customer discovery |
| `GET/POST/DELETE /users/me/favorites*` | Customer favorites |

These remain in Postman for the wider platform but must **not** be called from this dashboard.

---

## UI vs API (remaining product work)

Compatibility of **HTTP client ↔ backend** is complete. Some pages still bind to mocks:

| Page | API client ready? | UI uses live API? |
|---|---|---|
| Login / scope / Tables / Floor Plan | Yes | Yes |
| Branches / Settings | Yes | Yes (partial) |
| Reservations create + availability | Yes | Yes |
| Reservations list / detail / approve-reject | Yes | **No** (gap / actions-only detail) |
| Notifications | Yes | **No** (mock) |
| Waitlist / Walk-In | Yes | **No** (mock) |
| Staff invite | Yes | **No** (unrouted / mock) |
| Dashboard / Calendar / Reports / Customers | N/A or partial | Mock |

Next product step: replace mock consumers with the new client functions (especially Notifications, Waitlist, reservation list).

---

## Related docs

| Doc | Role |
|---|---|
| `docs/INTEGRATION_STATUS.md` | Earlier wiring history |
| `docs/FULL_API_TEST_REPORT.md` | Live host smoke test |
| `docs/API_INTEGRATION.md` | Contract rules |
| `docs/ARCHITECTURE.md` | `src/api` folder map (updated) |
| `scripts/build-compat-matrix.mjs` | Regenerates this matrix check |

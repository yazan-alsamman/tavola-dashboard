# API_INTEGRATION.md

# Contract Ownership

The backend (`../back`) owns the API contract. This document explains how the dashboard consumes it. If anything here disagrees with `../back/docs/API_GUIDELINES.md`, `../back/docs/AUTHENTICATION_ARCHITECTURE.md`, `../back/docs/TENANCY.md`, or `../back/TAVLA-API.postman_collection.json`, those win and this file must be corrected in the same change.

The Postman collection (`../back/TAVLA-API.postman_collection.json`) and environment (`../back/TAVLA-API.postman_environment.json`) are the executable source of truth for exact request/response shapes — when in doubt, run the request in Postman against a real environment rather than guessing from this document.

---

# Base URL & Environment

Per the Postman environment:

```
baseUrl = http://<host>:3000/api/v1
apiRoot = http://<host>:3000/api        # used only by non-versioned paths, if any
```

Rules:

- The frontend must read the base URL from an environment variable (`VITE_API_BASE_URL`), never hardcode a host. See `ENVIRONMENT_SETUP.md`.
- All application endpoints are versioned under `/api/v1`. Do not construct a request against an unversioned path.

---

# The HTTP Client (`src/api/client.ts`)

Single wrapper, all requests go through it. Responsibilities:

1. Prefix every request with `VITE_API_BASE_URL` (validated as a non-empty absolute `http(s)` URL via `getApiBaseUrl()`).
2. Attach `Authorization: Bearer <accessToken>` when a token is present in `tokenStore` (see Auth section).
3. Attach `Content-Type: application/json` unless the body is `FormData` (file upload) — for `FormData`, Content-Type is left unset so the browser sets the multipart boundary.
4. Parse the JSON envelope and:
   - On `success: true`, return `data` (use `apiRequestWithMeta` when `message`/`meta` are also needed) — callers never see the envelope wrapper.
   - On `success: false` or non-OK HTTP with an error body, throw a typed `ApiError { message, code, errors, status, path?, timestamp? }`.
   - On `204 No Content` (e.g. logout), return `undefined`.
5. On a `401` whose `code` is `AUTH_EXPIRED_TOKEN`, attempt exactly one silent `POST /auth/refresh` (single-flight across concurrent requests), then retry the original request once with `skipAuthRefresh`. If the refresh itself fails, clear tokens via `tokenStore`, notify session-invalidated listeners, and rethrow. Do **not** refresh on `AUTH_INVALID_TOKEN` (malformed/revoked/session-version mismatch) — that forces re-login.
6. Never retry non-idempotent requests (`POST` without an `Idempotency-Key`) automatically for any reason other than the single post-refresh retry above.

Supporting modules:

| File | Role |
|---|---|
| `src/api/client.ts` | `apiRequest`, `apiRequestWithMeta`, `getApiBaseUrl`, `createIdempotencyKey`, `refreshSession` |
| `src/api/types.ts` | Envelope, `PaginatedData`, request option types |
| `src/api/errors.ts` | `ApiError`, `isApiError` |
| `src/api/tokenStore.ts` | In-memory access token + `sessionStorage` refresh token + session-invalidated listeners |
| `src/api/auth.ts` | `login`, `logout`, `logoutAll`, `forgotPassword`, `resetPassword`, `changePassword`, `listSessions`, `revokeSession` |
| `src/api/users.ts` | `getCurrentUser`, `updateCurrentUser`, `getMyPreferences`, `updateMyPreferences`, `uploadMyAvatar` |
| `src/api/restaurants.ts` | list/get/create/update/delete + settings, working-hours, gallery, cuisine/occasion category assignment |
| `src/api/branches.ts` | list/get/create/update/delete + working-hours |
| `src/api/reservations.ts` | availability, Online + staff Phone/Walk-In create, list/get, approve/reject/cancel/reschedule/complete/no-show/table-ready |
| `src/api/floorPlans.ts` | `listFloorPlans`, `createFloorPlan`, `activateFloorPlan` |
| `src/api/tables.ts` | list/get + CRUD + move/status + merge/split |
| `src/api/employees.ts` | `inviteEmployee`, `assignEmployeeRole`, `assignEmployeeToBranch`, `removeEmployeeFromBranch`, `removeEmployee` |
| `src/api/taxonomy.ts` | `listCuisineCategories`, `listOccasionCategories` |
| `src/api/notifications.ts` | list, unread-count, identity-token, mark read / read-all |
| `src/api/waitlist.ts` | join, cancel, promote |
| `src/api/health.ts` | health / liveness / readiness (non-envelope) |

See `docs/API_COMPATIBILITY_REPORT.md` for the full Postman ↔ client match matrix (100% for dashboard scope).

---

# Floor Plans & Tables (Phases 5–6 — reads + mutations)

Confirmed live OpenAPI / Postman (Owner/Admin org role):

| Operation | Method | Path |
|---|---|---|
| List floor plans | `GET` | `/restaurants/:restaurantId/branches/:branchId/floor-plans` → `{ items }` (unpaginated) |
| Create floor plan | `POST` | `.../floor-plans` — body `{ name }`; first plan auto-activates |
| Activate floor plan | `PATCH` | `.../floor-plans/:floorPlanId/activate` — **no body**; explicit management action (viewing ≠ activating) |
| List tables by branch | `GET` | `.../branches/:branchId/tables` paginated |
| List tables by floor plan | `GET` | `.../floor-plans/:floorPlanId/tables` paginated |
| Get table | `GET` | `/tables/:tableId` |
| Create table | `POST` | `.../branches/:branchId/tables` — always starts `Available`; `tableNumber` unique per branch |
| Update table | `PATCH` | `/tables/:tableId` — profile + geometry; **never** `floorPlanId` or `status` |
| Delete table | `DELETE` | `/tables/:tableId` — soft-delete, 204 |
| Move table | `POST` | `/tables/:tableId/move` — `{ targetFloorPlanId }` same branch only |
| Change table status | `POST` | `/tables/:tableId/status` — `{ status }`; `Available` ↔ `Occupied`/`Cleaning`/`Disabled` only |

**TableStatus:** `Available` \| `Occupied` \| `Cleaning` \| `Disabled` (no live `Reserved`).

**Geometry:** `positionX`, `positionY`, `width`, `height`, `rotation`, `shape` (`Rectangle`\|`Round`). Persist via Update; UI uses save-on-drop (no PATCH per pointer move).

**Structural status ≠** `GET /reservations/availability` (time-window booking indicator).

**Idempotency:** FloorPlan/Table creates do **not** use `Idempotency-Key` (unlike reservations). Duplicate-submit protection is pending-state UI.

**Not live:** FloorPlan update/delete/get-by-id; Merge/Split Tables.

See ADR-007 (reads) and ADR-008 (mutations).

---

# Reservations (Postman-aligned)

Confirmed against Postman / live OpenAPI:

| Operation | Method | Path | Notes |
|---|---|---|---|
| Search availability | `GET` | `/reservations/availability` | Query: `branchId`, `reservationStartTime`, `partySize`, optional `reservationEndTime`. Informational only. |
| Create | `POST` | `/reservations` | Body: `branchId`, `tableId`, `reservationStartTime`, `guests`, optional end/notes. Always `Online` / `Pending` for JWT user. Send `Idempotency-Key`. |
| Cancel | `POST` | `/reservations/:id/cancel` | Optional `{ reason }`. Customer owner or staff with `reservations:cancel`. |
| Reschedule | `POST` | `/reservations/:id/reschedule` | `{ tableId, reservationStartTime, guests, reservationEndTime? }`. |
| Complete | `POST` | `/reservations/:id/complete` | Staff `reservations:complete`; Approved → Completed. |
| No-show | `POST` | `/reservations/:id/no-show` | Staff `reservations:noshow`. |

**Not in collection yet:** list, detail (`GET /reservations/:id`), approve, reject, phone/walk-in guest create.

**Status enum (backend):** `Pending` \| `Approved` \| `Rejected` \| `Cancelled` \| `Completed` \| `Expired` \| `NoShow`

Frontend mock statuses (`confirmed`, `checked_in`, `seated`) are **not** backend statuses — reserved for legacy demo surfaces only.

See ADR-006.

---

# Restaurants & Branches (Phase 3 scope)

Confirmed against Swagger / Postman / backend docs:

## `GET /restaurants`

- Query: `page`, `limit` (pagination fields in `data`: `items`, `page`, `limit`, `total`)
- Permission: OrganizationMember **Owner** or **Admin** (Employee typically receives `FORBIDDEN`)
- Soft-deleted restaurants excluded; `Suspended` restaurants may still appear
- DTO fields used by the dashboard: `restaurantId`, `name`, `slug`, `logoId`, `coverImageId`, `description`, `cuisineType`, `averageRating`, `priceLevel`, `status` (`Active` \| `Suspended`), `createdAt`, `updatedAt`
- No `nameAr` / mock `id` field — use `restaurantId` and `name`

## `GET /restaurants/:restaurantId/branches`

- Same pagination shape
- DTO: `branchId`, `restaurantId`, `city`, `district`, `address`, `latitude`, `longitude`, `countryCode`, `currency`, `timezone`, `phone`, `createdAt`, `updatedAt`
- **No** dedicated `name` or `status` — UI label via `formatBranchLabel` (`city — district`)
- Path `:restaurantId` is **resource addressing**, not a tenant override header

## Scope selection

- Accessible lists from these endpoints are the UI selection authority (JWT `restaurantId` / `branchIds` are advisory hints only)
- Persistence: `localStorage` keys `tavla-selected-restaurant-id` / `tavla-selected-branch-id` (IDs only; revalidated every bootstrap)
- Never send `X-Tenant-Id`, `X-Organization-Id`, or client `organizationId` for tenancy

See ADR-005 and `STATE_MANAGEMENT.md`.

---

# Response Envelope

Success:

```json
{
  "success": true,
  "message": "Reservation created successfully.",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "code": "VALIDATION_ERROR",
  "errors": [],
  "timestamp": "",
  "path": ""
}
```

`code` is always present on an error response, including generic 401/403/404s. UI code must key error handling off `code`, not off `message` (message text may change; codes are the stable contract). See `ERROR_HANDLING.md` for how codes map to user-facing copy.

Known error codes (from `../back/docs/API_GUIDELINES.md` — treat as the canonical list; if the backend adds one not listed here, add it in the same change that starts handling it):

```
AUTH_INVALID_TOKEN, AUTH_EXPIRED_TOKEN, AUTH_INVALID_CREDENTIALS,
AUTH_INVALID_REFRESH_TOKEN, AUTH_EMAIL_NOT_VERIFIED, AUTH_ACCOUNT_LOCKED,
AUTH_ACCOUNT_SUSPENDED, AUTH_PASSWORD_REUSED, AUTH_TOO_MANY_SESSIONS,
AUTH_SESSION_NOT_FOUND, CONFLICT, RATE_LIMIT_EXCEEDED, RESERVATION_CONFLICT,
RESERVATION_RESCHEDULE_WINDOW_EXPIRED, PARTY_SIZE_EXCEEDS_CAPACITY,
TABLE_UNAVAILABLE, TABLE_MERGE_CONFLICT, BRANCH_HAS_FUTURE_RESERVATIONS,
RESTAURANT_NOT_FOUND, RESTAURANT_SUSPENDED, ORGANIZATION_LIMIT_EXCEEDED,
GALLERY_LIMIT_EXCEEDED, EMPLOYEE_BRANCH_NOT_ASSIGNED, TENANT_CONTEXT_MISSING,
IDEMPOTENCY_KEY_CONFLICT, VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN,
NOT_FOUND, UNKNOWN_ERROR, FILE_TOO_LARGE, UNSUPPORTED_FILE_TYPE,
INVALID_FILE, STORAGE_UNAVAILABLE
```

`AUTH_EXPIRED_TOKEN` is the only code that triggers the client's single-retry refresh flow above. `AUTH_INVALID_TOKEN` (and every other `AUTH_*` code) must force logout / re-login without a refresh attempt — the backend distinguishes expiry from invalidity.

---

# Authentication & Token Handling

The dashboard authenticates restaurant staff (Organization members / Employees), not customers — use the `Authentication` folder of the Postman collection (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/sessions`), not `Customer Authentication` or `Platform Admin`.

Token transport: the login/refresh responses return `accessToken` and `refreshToken` in the JSON body (confirmed by the Postman collection, which captures both as variables from the response) — this is **not** an httpOnly-cookie flow. The frontend is responsible for storage via `src/api/tokenStore.ts`:

- **Access token**: keep in memory only (`tokenStore` / future `AuthProvider`). Never `localStorage`. It's short-lived by design (see `../back/docs/AUTHENTICATION_ARCHITECTURE.md` §5.5) and memory-only storage limits XSS exposure.
- **Refresh token**: may be persisted to `sessionStorage` (`tavla-refresh-token`) so a page reload doesn't force a full re-login within the same tab session, but must be cleared immediately on logout, logout-all, or a detected refresh failure.
- On `POST /auth/logout` or `/auth/logout-all`, clear both tokens and all derived auth state before navigating to `/login`.
- `tokenStore.onSessionInvalidated` lets `AuthProvider` (Phase 2) clear UI auth state when the client cannot refresh.

Refresh request body (confirmed Postman + Swagger): `{ "refreshToken": "<opaque>" }`.

Login/refresh response `data` includes at least `accessToken` and `refreshToken` (plus expiry/session metadata — confirm full DTO against Swagger when wiring `src/api/auth.ts`).

Access token JWT claims (do not rely on decoding these client-side for authorization — they're documented here so you recognize what `/users/me` / login response data corresponds to):

```json
// Employee actor
{
  "sub": "<userId>",
  "actorType": "Employee",
  "employeeId": "<employeeId>",
  "organizationId": "<organizationId>",
  "restaurantId": "<restaurantId>",
  "branchIds": ["<uuid>", "..."],
  "permissions": ["reservations:approve", "tables:manage"],
  "permissionsVersion": 3,
  "sessionVersion": 1
}
```

```json
// Organization member without an Employee record (e.g. an Owner acting at the org level)
{
  "sub": "<userId>",
  "actorType": "OrganizationMember",
  "organizationId": "<organizationId>",
  "orgRole": "Owner",
  "permissionsVersion": 1,
  "sessionVersion": 1
}
```

Get the authenticated user's **profile** from `GET /users/me` and login `user`/`organization` fields. Permissions, `branchIds`, `employeeId`, and `restaurantId` are **not** on `/users/me` or the login body — they live in access JWT claims. The dashboard reads those claims via `parseAccessTokenClaims` for advisory UI gating only (see `AUTH_AND_RBAC.md`, ADR-004). Do not verify the JWT signature client-side; do not treat claim-based UI gates as authorization.

---

# Tenant Scoping — Never Send It Yourself

Per `../back/docs/TENANCY.md`, `organizationId` is extracted from the JWT by the backend and is never accepted from the client — not as a header, not as a body field, not as a query param. The frontend:

- Never sends an `organizationId`, `X-Tenant-Id`, or similar header.
- Only supplies `restaurantId`/`branchId` as legitimate path parameters when addressing a specific resource that the URL structure requires (e.g. `GET /restaurants/:restaurantId/branches/:branchId/tables`), never as a tenant override.

---

# Idempotency

`Idempotency-Key` header (client-generated UUID, e.g. `crypto.randomUUID()`) is required on:

- `POST /reservations`
- `POST /reservations/:id/reschedule`
- Any payment-initiating endpoint

Generate a fresh key per logical user action, and reuse the same key only when retrying the exact same attempt (e.g. a network-timeout retry of the same submit), never across two distinct user actions. A repeated key with a different body returns `422` / `IDEMPOTENCY_KEY_CONFLICT` — surface that as "this request already completed differently, please refresh," not as a generic validation error.

---

# Pagination

List endpoints accept `page`, `limit`, `sort`, `order` query params. Pagination fields live **inside envelope `data`**, not in envelope `meta` (confirmed against live Swagger list DTOs; `ResponseEnvelopeInterceptor` typically leaves `meta: {}`).

Shared type (`src/api/types.ts`):

```ts
interface PaginatedData<T> {
  items: T[]
  page: number
  limit: number
  total: number
}
```

There is no `totalPages` / `hasNext` in the confirmed contract — derive client-side if the UI needs them (`Math.ceil(total / limit)`).

Verify field names per list endpoint when wiring that resource; favorites/list DTOs use the shape above.

---

# File Uploads

Avatar upload (`POST /users/me/avatar`) and gallery images (`POST /restaurants/:id/gallery`) are multipart only. Validate MIME type and file size client-side for UX (fast feedback), but never rely on client-side validation alone — the backend re-validates and is authoritative (`FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `INVALID_FILE` codes).

---

# Endpoint Catalog

Grouped by Postman folder. `{base}` = `VITE_API_BASE_URL` (i.e. `/api/v1`). All routes below require `Authorization: Bearer <accessToken>` unless marked **public**.

## Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | **public**. Employee/org login. |
| POST | `/auth/refresh` | **public** (uses refresh token, not access token). |
| POST | `/auth/forgot-password` | **public** |
| POST | `/auth/reset-password` | **public** |
| POST | `/auth/change-password` | |
| POST | `/auth/logout` | Current session only |
| POST | `/auth/logout-all` | All devices |
| GET | `/auth/sessions` | List active device sessions |
| DELETE | `/auth/sessions/:sessionId` | Revoke a specific session |

## Users

| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | Profile, use for role/permissions display |
| PATCH | `/users/me` | |
| GET | `/users/me/preferences` | |
| PATCH | `/users/me/preferences` | |
| POST | `/users/me/avatar` | multipart |
| POST | `/users/me/favorites/:restaurantId` | Unlikely to apply to staff dashboard (customer-facing feature) |
| DELETE | `/users/me/favorites/:restaurantId` | |
| GET | `/users/me/favorites` | paginated |

## Taxonomy

| Method | Path | Notes |
|---|---|---|
| GET | `/cuisine-categories` | Reference data, safe to cache |
| GET | `/occasion-categories` | Reference data, safe to cache |

## Restaurants

| Method | Path | Notes |
|---|---|---|
| POST | `/restaurants` | |
| GET | `/restaurants` | paginated |
| GET | `/restaurants/:id` | |
| PATCH | `/restaurants/:id` | |
| DELETE | `/restaurants/:id` | soft delete |
| GET / PATCH | `/restaurants/:id/settings` | `RestaurantSettings` (reservationInterval, maxGuestsPerReservation, cancellationWindow, autoApproval, timezone, defaultCurrency) |
| GET / PATCH | `/restaurants/:id/working-hours` | |
| POST / GET / DELETE | `/restaurants/:id/gallery[/:galleryItemId]` | multipart on POST |
| GET / PATCH | `/restaurants/:id/cuisine-categories` | |
| GET / PATCH | `/restaurants/:id/occasion-categories` | |

## Branches

| Method | Path | Notes |
|---|---|---|
| POST | `/restaurants/:restaurantId/branches` | |
| GET | `/restaurants/:restaurantId/branches` | paginated |
| GET / PATCH / DELETE | `/restaurants/:restaurantId/branches/:branchId` | |
| GET / PATCH | `/restaurants/:restaurantId/branches/:branchId/working-hours` | |

## Floor Plans

| Method | Path | Notes |
|---|---|---|
| POST | `/restaurants/:restaurantId/branches/:branchId/floor-plans` | |
| GET | `/restaurants/:restaurantId/branches/:branchId/floor-plans` | |
| PATCH | `/restaurants/:restaurantId/branches/:branchId/floor-plans/:floorPlanId/activate` | Domain action, not a generic PATCH of floor plan attributes |
| GET | `/restaurants/:restaurantId/branches/:branchId/floor-plans/:floorPlanId/tables` | paginated |

## Tables

| Method | Path | Notes |
|---|---|---|
| POST | `/restaurants/:restaurantId/branches/:branchId/tables` | Nested create (aggregate chain) |
| GET | `/restaurants/:restaurantId/branches/:branchId/tables` | paginated |
| GET / PATCH / DELETE | `/tables/:tableId` | Flat route once id is known — never re-nest under restaurant/branch |
| POST | `/tables/:tableId/move` | Domain action — reassigns `floorPlanId`. Never via `PATCH /tables/:tableId`. |
| POST | `/tables/:tableId/status` | Domain action — body `{ "status": "<TableStatus>" }`. Allowed transitions: `Available ↔ Occupied`, `Available ↔ Cleaning`, `Available ↔ Disabled`. Any other transition is rejected server-side; don't allow it in the UI either (e.g. don't offer "Occupied → Cleaning" directly). |

## Employees

| Method | Path | Notes |
|---|---|---|
| POST | `/restaurants/:restaurantId/employees` | Invite |
| POST | `/restaurants/:restaurantId/employees/:employeeId/role` | Assign role |
| POST | `/restaurants/:restaurantId/employees/:employeeId/branches` | Assign to branch |
| DELETE | `/restaurants/:restaurantId/employees/:employeeId/branches/:branchId` | Remove from one branch |
| DELETE | `/restaurants/:restaurantId/employees/:employeeId` | Remove entirely |

## Reservations

| Method | Path | Notes |
|---|---|---|
| GET | `/reservations/availability` | Query: `branchId`, `reservationStartTime`, `reservationEndTime`, `partySize`. **Informational only** — see below. |
| POST | `/reservations` | Requires `Idempotency-Key`. Sole authoritative conflict check. |

`GET /reservations/availability` returns every table matching branch/time/party-size criteria, each carrying an explicit availability indicator — a table already holding a `Pending`/`Approved` reservation for that window is still returned, marked Reserved/Unavailable, not omitted. **Never infer bookability from a table's mere presence in this response.** Always read the per-table availability indicator, and always expect `POST /reservations` to be the final word (a table shown available here can fail at create time, and vice versa) — handle `RESERVATION_CONFLICT` / `TABLE_UNAVAILABLE` on submit regardless of what the search showed.

The Postman collection currently only documents `Search Availability` and `Create Reservation` for this resource. Approve/Reject/Reschedule/list-by-branch endpoints referenced in backend docs (`POST /reservations/:id/approve`, `/reject`, `/reschedule`) are not yet in the collection — confirm their exact path/shape directly against a running backend or an updated collection before wiring the reservation-management screens (`Reservations`, `ReservationDetail` pages), and update this table + the Postman collection together once confirmed.

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/health`, `/health/liveness`, `/health/readiness` | **public**. Under `VITE_API_BASE_URL` (`/api/v1/health*`). Terminus-style payloads — **not** the business success envelope. Useful for an environment/connectivity check in `ENVIRONMENT_SETUP.md`, not for app logic. |

---

# Type Reconciliation — Known Mismatches

`src/types/index.ts` currently defines demo/mock enums that **do not match** the backend. Do not wire a real endpoint to a field without fixing this first for that field:

| Frontend (mock) | Backend (confirmed) | Source |
|---|---|---|
| `TableStatus`: `'available' \| 'reserved' \| 'occupied' \| 'out_of_service'` | `Available \| Occupied \| Cleaning \| Disabled` (no `Reserved` state — see `POST /tables/:tableId/status`) | `../back/docs/DATABASE_SCHEMA.md`, `API_GUIDELINES.md` |
| `ReservationStatus`: `'pending' \| 'confirmed' \| 'checked_in' \| 'seated' \| 'completed' \| 'cancelled' \| 'no_show'` | Backend: `Pending`, `Approved`, `Rejected`, `Cancelled`, `Completed`, `NoShow`, `Expired`. Mock frontend statuses remain only for legacy demo (`RestaurantContext` / Calendar). Live API types use `ReservationStatusDto` in `src/api/reservations.ts`. | Live OpenAPI + ADR-006 |
| `StaffRole`: `'owner' \| 'manager' \| 'receptionist' \| 'viewer'` | Organization-level roles: `Owner \| Admin \| Billing \| Staff`. Separate branch-level Employee roles include at least `Manager`, `Receptionist` per the ownership-rules table; there is no confirmed `viewer`/`Staff`-equivalent employee role in the docs read so far | `../back/docs/DOMAIN_MODEL.md` §Ownership Rules, `AUTHORIZATION_ARCHITECTURE.md` |

When wiring auth/roles/reservation-status/table-status UI to the real API, treat the table above as a starting point, not a final answer — confirm the exact, complete enum against `GET /users/me`, a real login response, and `../back/docs/DATABASE_SCHEMA.md` before finalizing the frontend type, then update this table and `DECISIONS.md`.

---

# Keeping This Document In Sync

Whenever the backend adds, removes, or changes an endpoint that this dashboard consumes:

1. Update (or ask the backend team to update) `../back/TAVLA-API.postman_collection.json`.
2. Update the Endpoint Catalog above in the same change.
3. Record the change in `DECISIONS.md` if it altered how the frontend integrates (auth flow, envelope shape, error codes).

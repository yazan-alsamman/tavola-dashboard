# AUTH_AND_RBAC.md

# Scope

How the dashboard authenticates staff (Organization members / Employees) and gates UI by role/permission. This is the frontend consumer side of `../back/docs/AUTHENTICATION_ARCHITECTURE.md` and `../back/docs/AUTHORIZATION_ARCHITECTURE.md` — read those for the actual security model; this document only covers what the React app must do with it.

---

# Current State (Phase 2 + Phase 3)

Real staff authentication is wired:

- `src/api/auth.ts` — `login`, `logout`, `logoutAll`
- `src/api/users.ts` — `getCurrentUser` (`GET /users/me`)
- `src/context/AuthContext.tsx` — production `AuthProvider` with `isLoading`, async `login`/`logout`, session bootstrap, and `tokenStore.onSessionInvalidated` subscription
- Tokens via Phase 1 `tokenStore` (access memory-only; refresh in `sessionStorage` as `tavla-refresh-token`)
- Canonical identity: `AuthIdentity` in `src/types/auth.ts`
- Demo auth (`tavla-user`, fabricated `DEMO_USER`, passwordless login) is **removed**

Restaurant/branch scope is wired (Phase 3):

- `RestaurantScopeProvider` — accessible restaurants/branches, selected IDs, shell identity
- JWT `restaurantId` / `branchIds` remain **advisory** selection hints only — backend list responses authorize UI options
- Scope clears on logout / session invalidation / account switch; persisted IDs are revalidated

Reservations (Phase 4): live endpoints are JWT-authenticated customer-style (`JwtAuthGuard` only) for availability + Online create. Staff Domain Actions (`reservations:approve`, etc.) are not live — do not invent UI authorization for them.

Floor plans & tables (Phases 5–6): live inventory read **and** mutation endpoints require OrganizationMember **Owner or Admin** (not Employee `tables:manage`). Advisory UI gate: `useCanManageInventory()`. Backend 403 remains authoritative.

Feature pages still use mock business data via legacy `RestaurantContext` until later phases (except Reservations product surfaces and Tables/Floor Plan inventory).

---

# Auth Flow

1. `LoginPage` submits credentials → `AuthProvider.login` → `src/api/auth.ts` → `POST /auth/login`.
2. On success, tokens are stored in `tokenStore`. Identity is built from the login DTO, best-effort `GET /users/me` profile enrichment, and advisory JWT claim parsing (`src/lib/accessTokenClaims.ts`).
3. `AuthProvider` exposes `{ user, isAuthenticated, isLoading, login, logout }`.
4. On `401` + `AUTH_EXPIRED_TOKEN`, the API client performs one silent refresh (see `API_INTEGRATION.md`). Failed refresh / `AUTH_INVALID_TOKEN` clears tokens and notifies session-invalidated listeners; `AuthProvider` clears `user`, and route guards send the user to `/login`.
5. `logout()` calls `POST /auth/logout` while the access token is still present, then always clears local auth state even if the network call fails.
6. Tab/window close while signed in: `beforeunload` shows the browser leave prompt. **Cancel** opens the in-app logout dialog. **Leave** runs `logoutKeepalive()` (`POST /auth/logout` with `fetch({ keepalive: true })`), clears tokens immediately, and sets a `localStorage` pending flag so a missed unload path cannot restore the session on the next visit.

---

# Session Bootstrap (Page Reload)

Because the access token is memory-only:

1. App start → `AuthProvider` sets `isLoading: true`.
2. If no refresh token in `sessionStorage` → resolve unauthenticated.
3. If refresh token present → `refreshSession()` from `src/api/client.ts` (shared single-flight with in-request refresh) → `GET /users/me` (best-effort) → build `AuthIdentity` → authenticated.
4. `ProtectedRoute` / `PublicRoute` render a translated loading state while `isLoading` and do not redirect.

---

# Actor Types

The backend supports `User` | `Employee` | `OrganizationMember` | `PlatformAdmin` in JWT/`actorType`. This dashboard authenticates **Employee** or **OrganizationMember** actors via `POST /auth/login` — never Customer Authentication or Platform Admin routes.

---

# Determining Role & Permissions

## What each source provides (verified)

| Source | Provides |
|---|---|
| `POST /auth/login` `data` | Tokens, `user` profile slice, `organization` (incl. `role`), `actorType`, `sessionId`, `permissionsVersion` — **not** `permissions[]` / `branchIds` |
| `GET /users/me` | Profile only (`userId`, names, email, phone, language, …) — **not** permissions, org role, or branch scope |
| Access JWT claims | Advisory `permissions`, `branchIds`, `employeeId`, `restaurantId`, `orgRole` (actor-dependent) |

## Frontend model

`AuthIdentity` preserves:

- `actorType`
- `organization.role` (`OrgRole`: `Owner | Admin | Billing | Staff`) from login (fallback JWT `orgRole`)
- `permissions: string[]` and `branchIds` from JWT claims for **advisory UI gating only**
- `employeeId` / `restaurantId` from JWT when present

JWT payload parsing (`parseAccessTokenClaims`) does **not** verify the signature. It is UX-only. The server remains the sole authorization enforcement point. Do not treat claim absence as proof of lack of permission when deciding whether to call an API — always handle `403 FORBIDDEN`.

Hooks (`src/hooks/usePermissions.ts`):

- `useHasPermission(slug)`
- `useHasOrgRole(role)`
- `useCanEditFloorLayout()` — Owner/Admin org role or `tables:manage` (legacy designer advisory)
- `useCanManageInventory()` — Owner/Admin only (matches live FloorPlan/Table route authorization)

---

# UI Gating Is Not Enforcement

Hiding a button is a UX courtesy. Always handle `403 FORBIDDEN` gracefully even when the UI believed the action was allowed.

---

# Protected Routes

`ProtectedRoute` / `PublicRoute` gate on `isAuthenticated` and honor `isLoading` with a session-resolving screen (`t.auth.resolvingSession`) to avoid flash-redirects during bootstrap.

---

# Session Management UI

`GET /auth/sessions`, `DELETE /auth/sessions/:sessionId`, and `POST /auth/logout-all` exist on the backend. `logoutAll` is implemented in `src/api/auth.ts` for future Security UI; the current Header/Sidebar only call single-session `logout()`.

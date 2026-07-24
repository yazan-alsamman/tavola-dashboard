# ARCHITECTURE.md

# Tavla Dashboard — Frontend Architecture

---

# Stack

- React 19 + TypeScript (strict)
- Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- React Router v7
- Recharts (charts), Lucide + Phosphor (icons), date-fns
- Vitest + MSW for `src/api/*` unit tests (`npm test` / `npm run test:run`)

There is currently no data-fetching/cache library (no React Query/SWR). See `STATE_MANAGEMENT.md` for when to introduce one.

---

# Current Folder Structure

```
src/
├── api/            # HTTP client foundation + (later) one module per backend resource
├── assets/         # static images
├── components/
│   ├── auth/       # ProtectedRoute / PublicRoute
│   ├── dashboard/  # dashboard-page-specific composite components
│   ├── floor/      # floor plan canvas/spatial components
│   ├── layout/      # Sidebar, Header, DashboardLayout, ContextBar, etc.
│   └── ui/         # generic, reusable, presentational primitives
├── context/        # Theme, Locale, Sidebar, Auth, RestaurantScope, Restaurant (legacy mock), Toast
├── data/           # mock data — feature demos only; shell scope is not mock
├── i18n/           # en.ts / ar.ts translation dictionaries
├── lib/            # utilities (floor layout, scope selection/persistence, auth claims, cn)
├── pages/          # one file per route, thin orchestration only
└── types/          # shared TypeScript interfaces/enums
```

Path alias `@/` maps to `src/` (`vite.config.ts`, `tsconfig.app.json`). Always import via `@/...`; never use `../../..` relative climbs across top-level folders.

---

# Layering Rules

Data flows in one direction:

```
pages/                 → orchestrates a screen: layout + hooks, no business logic
  ↓ uses
features/*/hooks (new)  → data-fetching + derived state for one domain area
  ↓ uses
api/*                   → typed request functions, one module per backend resource
  ↓ uses
api/client.ts           → the single HTTP client (envelope unwrapping, auth, errors)
```

Alongside `pages/`, `components/ui/` holds pure presentational primitives (Button, Card, Modal, Input, DataTable, etc.) that take props and render — they must never import from `api/` or `context/AuthContext`. `components/layout/` and `components/dashboard/`-style composite components may consume context but should still receive data via props/hooks rather than reaching into `api/` directly when a page-level hook can supply it.

**Pages must stay thin.** A page component wires together a data hook, layout, and UI components. If a page file is doing status-transition logic, permission math, or response-shape munging inline, that logic has the wrong home — move it into an `api/` or `features/*` hook.

---

# The API Layer (`src/api/`)

Phase 1 introduced the HTTP foundation. Resource modules are added when each feature is wired to the backend (mirroring the Postman collection's folders):

```
src/api/
├── client.ts           # fetch wrapper: base URL, auth header, envelope unwrap, error mapping, refresh retry
├── types.ts            # envelope / pagination / request option contracts
├── errors.ts           # ApiError
├── tokenStore.ts       # access (memory) + refresh (sessionStorage) bridge for AuthProvider
├── auth.ts             # /auth/login, logout, logout-all
├── users.ts            # GET /users/me
├── restaurants.ts      # GET /restaurants, GET /restaurants/:id
├── branches.ts         # GET /restaurants/:restaurantId/branches*
├── reservations.ts     # GET /reservations/availability, POST /reservations (live Phase 7.1 only)
├── floorPlans.ts       # list + create + activate FloorPlan
├── tables.ts           # list/get + create/update/delete/move/status Table
├── employees.ts        # /restaurants/:restaurantId/employees* (future)
└── taxonomy.ts         # /cuisine-categories, /occasion-categories (future)
```

Files marked future must not be created as empty placeholders — add them in the same change that wires the first real call.

**Reservations note (ADR-006):** staff list/detail/approve/reject/cancel/complete are not live on the backend. Do not scaffold those client functions until Postman/OpenAPI expose them.

**Floor/Table note (ADR-007/008):** Phase 5 reads + Phase 6 mutations. Domain actions (`move`, `status`, `activate`) are never folded into generic PATCH. Selected FloorPlan for viewing is not auto-activation.

Rules:

- Every function in `src/api/*` takes typed parameters and returns a typed, already-unwrapped `data` payload (or throws a typed `ApiError`) — callers never see the `{ success, message, data, meta }` envelope directly.
- No component or page ever imports `client.ts` directly; it imports the resource module (`@/api/reservations`, etc.).
- One function per endpoint. Do not create a generic `request(method, path, body)` escape hatch that callers use instead of a named function — that defeats type safety and discoverability.

See `API_INTEGRATION.md` for the full endpoint catalog and contract details.

---

# Provider Hierarchy

`App.tsx` nests providers in this order (outermost first):

```
ThemeProvider
  LocaleProvider
    AuthProvider
      AppQueryProvider              # TanStack Query (Phase 5+)
        RestaurantScopeProvider
          RestaurantProvider        # legacy mock operational store (temporary)
            ToastProvider
              SidebarProvider
                BrowserRouter
```

This order is deliberate: `Theme`/`Locale` have no data dependency and must be available to everything, including the login page. `Auth` must resolve before scope. `RestaurantScopeProvider` must wrap any consumer that needs selected restaurant/branch IDs (shell, floor plan keys). Legacy `RestaurantProvider` remains for mock ops until feature phases migrate off it. Do not reorder providers without recording the reason in `DECISIONS.md`.

**Identity vs scope (do not conflate):**

| Concept | Owner | Meaning |
|---|---|---|
| Auth identity | `AuthProvider` / `AuthIdentity` | Who is logged in |
| Tenant | Backend JWT | Never sent as a client override header |
| Selected restaurant | `RestaurantScopeProvider` | Resource scope for shell + future APIs |
| Selected branch | `RestaurantScopeProvider` | Resource scope within the selected restaurant |
| Mock ops data | `RestaurantContext` | Temporary demo reservations/tables/etc. |

---

# Mock Data Policy

`src/data/mockData.ts` exists to support UI development before the real API is wired. Rules:

- Never import `mockData.ts` from a module under `src/api/`.
- When a page is wired to a real endpoint, its mock data usage is removed in the same change — do not leave both paths behind a flag "just in case."
- New pages/features should be built against the real API layer from the start; only fall back to a mock fixture if the backend endpoint genuinely does not exist yet, and note that gap in `DECISIONS.md`.

---

# Routing

Routes are declared centrally in `App.tsx` (React Router v7, `Routes`/`Route`). `ProtectedRoute` gates the authenticated app shell (`DashboardLayout` + nested routes); `PublicRoute` gates `/login` and redirects an already-authenticated user to `/`. Any new top-level page must be added as a route here and to the sidebar navigation (`components/layout/Sidebar.tsx`) — do not create pages that are unreachable from navigation without a documented reason.

---

# When To Introduce `features/`

The current `pages/` + `components/` split is adequate at the present size. Once a domain area (e.g. Reservations) accumulates more than a couple of hooks, sub-components, and API bindings, extract it into `src/features/reservations/` (`hooks/`, `components/`, `api.ts` re-exporting from `src/api/reservations.ts`) rather than letting `pages/Reservations.tsx` and scattered `components/` grow unbounded. Do this extraction as its own change, not bundled silently into an unrelated feature PR.

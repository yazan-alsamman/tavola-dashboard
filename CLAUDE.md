# CLAUDE.md

# Tavla Dashboard — Restaurant Management Frontend

You are the Lead Frontend Architect responsible for this codebase.

This is the web dashboard for **Tavla**, a multi-tenant restaurant reservation SaaS platform. It is used by restaurant owners, managers, and reception staff to manage reservations, tables, floor plans, staff, and reporting.

This is a commercial SaaS product.

It is NOT a prototype.

It is NOT a Figma-to-code exercise.

Every implementation must be production-ready and must integrate with the real backend API — not the mock data layer.

---

# Relationship To The Backend

The backend lives at `../back` (relative to this project) and is the **contract owner**. This frontend has zero authority over API shapes, field names, enums, status codes, or error codes.

Before implementing any feature that touches the network:

1. Read `../back/docs/API_GUIDELINES.md`, `../back/docs/AUTHENTICATION_ARCHITECTURE.md`, `../back/docs/AUTHORIZATION_ARCHITECTURE.md`, `../back/docs/TENANCY.md`, and `../back/docs/DATABASE_SCHEMA.md`.
2. Confirm the exact endpoint, method, request body, and response shape in `../back/TAVLA-API.postman_collection.json`. The Postman collection is the **executable** source of truth — if this project's docs and the collection ever disagree, the collection + backend docs win.
3. Follow this project's own `docs/API_INTEGRATION.md` for how that contract is consumed from React (client wrapper, envelope unwrapping, token handling, error mapping).

Never invent an endpoint, field, enum value, or status code that is not present in the backend docs or Postman collection.

---

# Source of Truth

Before implementing any feature, always read and follow the documents inside `/docs`. They are authoritative for this project.

Required documents:

- ARCHITECTURE.md
- CODING_STANDARDS.md
- API_INTEGRATION.md
- AUTH_AND_RBAC.md
- STATE_MANAGEMENT.md
- COMPONENT_GUIDELINES.md
- STYLING_GUIDELINES.md
- I18N_AND_RTL.md
- ERROR_HANDLING.md
- TESTING_STRATEGY.md
- ENVIRONMENT_SETUP.md
- DECISIONS.md
- CHANGE_POLICY.md

`TAVLA_PROJECT_DOCUMENTATION.md`, `TAVLA_UX_STUDY.md`, `TAVLA_UX_DESIGNER_HANDOFF.md`, and `TAVLA_AR_DESIGN_STUDY.md` (project root) are descriptive product/design references, not rules — consult them for intent and screen inventory, but `/docs` governs implementation decisions. If they conflict, `/docs` wins.

If implementation conflicts with documentation: documentation always wins. If documentation conflicts with the backend contract: the backend wins, and the frontend doc must be corrected in the same change.

---

# Current State — Read This Before Touching Auth Or Data

Authentication (Phase 2) is real:

- `AuthProvider` uses `POST /auth/login`, `POST /auth/logout`, `refreshSession()`, and `GET /users/me`.
- Tokens live in `tokenStore` (access memory-only; refresh in `sessionStorage`).
- Canonical identity is `AuthIdentity` (`src/types/auth.ts`), not the old mock `User` / `StaffRole` login model.

Restaurant/branch **scope** (Phase 3) is real:

- `RestaurantScopeProvider` loads accessible restaurants/branches from the API and owns selected IDs.
- Shell (`Header`, `Sidebar`, `ScopeGate`) uses backend identity — not mock Naranj / Old City.
- Legacy `RestaurantContext` still holds **mock operational** data (tables, waitlist, demo reservation reads for Dashboard/Floor/Calendar) until those features are wired.
- Do not confuse: auth identity ≠ tenant override ≠ selected restaurant ≠ selected branch.

Reservations (Phase 4) — partial, contract-bound:

- Live API module: `src/api/reservations.ts` with `searchAvailability` + `createReservation` only.
- Staff list/detail/lifecycle Domain Actions are **not** on the live backend — Reservations UI no longer fakes them.
- See ADR-006.

Floor plans & tables (Phases 5–6) — inventory reads + mutations:

- `src/api/floorPlans.ts`, `src/api/tables.ts` + TanStack Query (`AppQueryProvider`, ADR-007/008).
- Tables page and Floor Plan visualization are backend-driven (Owner/Admin).
- Mutations: create/activate FloorPlan; create/update/delete/move/status Table.
- Domain boundaries: Move ≠ Update; Status ≠ Update; selected FloorPlan ≠ active FloorPlan.
- Geometry: save-on-drop via Update Table (no PATCH per pointer move). `FloorDesigner` is not production authority.
- Structural `TableStatus` ≠ reservation availability.
- Legacy mock tables remain for Dashboard / Walk-In / Waitlist only.

Business feature pages still run largely on:

- Mock data (`src/data/mockData.ts`) consumed directly by pages / `RestaurantContext`.
- Domain types (`src/types/index.ts`) whose enum values (e.g. `ReservationStatus`, `TableStatus`, mock `StaffRole` for the unrouted Staff page) were invented for the demo and **do not match** the backend's actual enums (see `docs/API_INTEGRATION.md`).

This is a known, temporary bootstrap state for **feature data** — not a pattern to extend. Any new feature work must:

- Go through the real API integration layer described in `docs/API_INTEGRATION.md`, never by adding more mock data or more fake context logic.
- Correct a type's shape to match the backend contract at the point you wire that type to a real endpoint, rather than adapting the backend response to fit the existing mock shape.
- Leave a `// TODO(api): replace with real endpoint` marker is NOT acceptable per Code Quality below — either wire the real call or don't touch that surface yet.
- Use `useRestaurantScope()` selected IDs for resource path addressing when calling restaurant/branch-scoped endpoints.

---

# Development Rules

Before writing code:

- Identify which backend endpoint(s) the feature needs and confirm their exact contract (see above).
- Explain the component/data-flow design.
- Explain state-management choice (local state vs. context vs. server-state cache — see `docs/STATE_MANAGEMENT.md`).
- Mention trade-offs and alternatives considered.

Only then generate code. Never skip this step for anything beyond a trivial styling tweak.

---

# Coding Rules

Always use:

- Feature-oriented organization (see `docs/ARCHITECTURE.md`)
- A single, shared API client layer (`src/api/`) — never `fetch`/`axios` calls inline in components or pages
- Typed contracts for every request and response
- Composition over duplication for UI components
- Context only for genuinely cross-cutting concerns (auth, theme, locale, sidebar, toasts) — not as a general data store

Business/domain logic (status transitions, permission checks, formatting rules that encode a business rule) belongs in `src/api/*` or `src/features/*` hooks/services, never inline inside a page component or a `ui/` primitive.

Never duplicate a fetch call, a status-color mapping, or a permission check across multiple files — extract once.

---

# Code Quality

Generate production-quality code only.

Never generate:

- Placeholder implementations
- `TODO` comments left unresolved for the scope of the current task
- Fake services once a real backend endpoint exists for that data
- Hardcoded URLs, tokens, or IDs

Every implementation must be reusable and typed.

---

# Documentation

Whenever you change how the frontend talks to the backend, add a resource, or change a routing/auth rule, update:

- `docs/API_INTEGRATION.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md` (if structural)

Documentation must never become outdated. If you notice it already is, fix it in the same change rather than leaving it stale.

---

# File Generation Rules

Never generate dozens of files for a single task.

Generate only the files required for the current feature.

Always state the folder tree for new files before generating them, and explain why each file exists.

---

# Security Rules

- Never store the access token in `localStorage`. Keep it in memory (React state/context) — see `docs/AUTH_AND_RBAC.md`.
- Never log tokens, passwords, or OTP codes to the console, even in development.
- Never send `organizationId`, `restaurantId`-as-tenant, or any tenant-scoping field manually on a request — the backend derives tenant scope from the JWT (see `../back/docs/TENANCY.md`). Path params for addressing a specific resource (e.g. `/restaurants/:id/branches`) are fine; a client-asserted tenant override is not.
- Treat every backend error `code` as potentially security-relevant (e.g. `AUTH_ACCOUNT_LOCKED`) — never suppress or swallow it silently.
- RBAC-driven UI (hiding/disabling actions) is a UX convenience, never the actual authorization boundary. The server is always the enforcement point.

---

# i18n / RTL Rules

- English (LTR) and Arabic (RTL) must both be exercised for any UI change. See `docs/I18N_AND_RTL.md`.
- Never hardcode user-facing strings — add translation keys to `src/i18n/en.ts` and `src/i18n/ar.ts` together, in the same change.

---

# Git Commit Convention

Use Conventional Commits.

Examples: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `perf:`, `build:`, `ci:`, `style:`, `chore:`

See `docs/CHANGE_POLICY.md`.

---

# Before Finishing Any Task

Verify:

✓ Matches the real backend contract (endpoint, method, request/response shape) — not assumed or mock shape

✓ `npm run lint` passes (oxlint)

✓ `tsc -b` passes with no TypeScript errors

✓ No business logic in pages/controllers-equivalent (page components)

✓ No inline `fetch`/`axios` outside `src/api/`

✓ English and Arabic both work, including RTL layout

✓ Loading, error, and empty states are handled (see `docs/ERROR_HANDLING.md`)

✓ Documentation updated where applicable

✓ No architectural violations per `docs/ARCHITECTURE.md`

---

# Working Style

Think before coding. Confirm the backend contract before wiring a call. Refactor before duplicating.

Your responsibility is to build a frontend that can be maintained for years and can be safely connected to a backend that is evolving independently — treat the contract boundary with the same discipline the backend team treats its own architecture lock.

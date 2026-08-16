# DECISIONS.md

Architecture Decision Log for the Tavla Dashboard frontend. Append new entries at the top. Never edit or delete a past entry to "fix" it retroactively — if a decision is reversed, add a new entry that supersedes it and say so explicitly.

Format per entry:

```
## ADR-00X — <Title>
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-00Y

Context:
<why this decision was needed>

Decision:
<what was decided>

Consequences:
<trade-offs, what this rules out, follow-up work created>
```

---

## ADR-010 — Landing Page 3D Vocabulary Is The Product's Own Table Model
Date: 2026-08-16
Status: Accepted

Context:
The first landing page pass (ADR-009) used an abstract 3D vocabulary (glass panes, capsules, rings, floating cards) that was visually pleasant but generic — it didn't communicate that Tavla is specifically a *table-selection* reservation product. A follow-up brief asked for the 3D scene to be built directly from the product's real domain model (tables, shapes, statuses, floor plans) rather than invented geometry, with scrolling acting as a camera journey through "choose your table."

Decision:
1. **Domain-grounded data, not invented shapes.** `src/components/landing/restaurant.ts` defines 9 tables (5 on mobile) using the *real* `TableShapeDto` (`'Round' | 'Rectangle'`) and `TableStatusDto` (`'Available' | 'Occupied' | 'Cleaning' | 'Disabled'`) enums from `src/api/tables.ts`, with capacities and a status color language that mirrors `components/floor/FloorPlanReadView.tsx`'s existing status-fill convention. One table (`B2`, Rectangle, capacity 4, Available) is the `selected` table the whole scroll story centers on.
2. **Two-layer per-table transform.** Each table renders as an `outer` group (GSAP-owned: scroll-scrubbed scatter→grid position/rotation) wrapping an `inner` group (R3F-owned: idle float/breathe/rotate + selection emphasis, read each frame in `useFrame`). This is deliberate: GSAP and `useFrame` never write to the same transform, so they can't fight.
3. **One master scroll timeline** (`useScrollTimeline.ts`) drives three things simultaneously: the camera's 4-shot list (`CAMERA_KEYFRAMES` — wide establishing → moving in → near-overhead floor plan → close reservation shot, applied via `CameraRig`'s damped `useFrame` follow), every table's scatter→grid array-tween, and a normalized `storyProgressRef.value` (0→1) that each `TableUnit` reads locally to derive its own selection glow / dimming / availability-reveal — coordinated without GSAP having to own every material.
4. **Chairs are instanced.** `ChairInstances.tsx` recomposes every chair's world matrix each frame from its table's `innerRef.matrixWorld` into two `InstancedMesh` draw calls (seat, back) instead of one mesh pair per chair — kept desktop's ~99 potential draw calls down to ~29.
5. The selected table's info (`Table B2 · Seats up to 4 · Available`) surfaces both as a `Html`-in-Canvas floating card attached to the table *and* as real translated copy in the CTA section (`t.landing.selectedTable` / `t.landing.seatsFor` interpolated with the actual table data) — the 3D and DOM layers show the same fact, not disconnected content.
6. The CTA button still reads "Get Started" / navigates to `/login` — it does not claim to reserve that specific table, since this app has no public/anonymous booking flow (reservations are staff-created via `src/api/reservations.ts`). The table card is illustrative of the concept, not a live booking action.

Consequences:
`src/components/landing/SceneObjects.tsx` and `useIdleMotion.ts` from ADR-009 are superseded and removed. Any future change to the real `TableStatusDto`/`TableShapeDto` enums (see `docs/API_INTEGRATION.md`) should be reflected in `restaurant.ts`'s `STATUS_COLOR` / shape handling so the landing page doesn't drift from the actual product model.

---

## ADR-009 — Public 3D Landing Page At `/`, Dashboard Moved To `/app`
Date: 2026-08-16
Status: Accepted

Context:
The dashboard previously had no public/marketing surface — `/` was the protected Dashboard index and `/login` was the only unauthenticated route. A cinematic, art-directed 3D/motion landing experience was requested as a new public entry point. Mounting it at `/` required relocating the authenticated shell so the two don't collide, since `PublicRoute`/`ProtectedRoute` redirect targets and every in-app absolute link (`Sidebar`, `QuickActionsBar`, `HomeShortcuts`, `Dashboard`, `ReservationDetail`, `Menu`, `Calendar`, `GlobalSearch`, notification links, mobile nav) assumed the dashboard index lived at `/`.

Decision:
1. `/` is now the public `LandingPage` (`src/pages/Landing.tsx` → `src/components/landing/LandingExperience.tsx`), reachable unauthenticated or authenticated, and is intentionally **not** listed in `Sidebar` navigation (it is a pre-auth marketing surface, not an app screen) — the documented exception to the "every top-level page must be in Sidebar nav" rule in `ARCHITECTURE.md`.
2. The authenticated shell (`DashboardLayout` + all nested routes) moved from index-at-`/` to `path="/app"`; every previously-absolute in-app path (`/reservations`, `/calendar`, `/floor-plan`, `/tables`, `/waitlist`, `/walk-in`, `/menu`, `/gallery`, `/offers`, `/reviews`, `/notifications`, `/messaging`, `/reports`, `/branches`, `/settings`, `/staff`) is now `/app/<same>`. `ProtectedRoute` redirects unauthenticated users to `/login`; `PublicRoute` redirects authenticated users to `/app` (was `/`).
3. `LandingPage` is route-level lazy-loaded (`React.lazy` + `Suspense` in `App.tsx`) so its dependencies (Three.js, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@gsap/react`) ship only to visitors of `/`, never to the authenticated dashboard bundle. This kept the main app chunk at its pre-3D gzip size instead of adding ~300KB to every dashboard route.
4. The 3D layer is fully procedural (Drei `<Environment>` with hand-placed `<Lightformer>`s, no external HDR/CDN fetch) per the asset-strategy preference for generated over external assets, and mutates Three.js object refs directly from `useFrame` (idle motion) and GSAP/ScrollTrigger (scroll-driven group transform) rather than routing through React state, per `STATE_MANAGEMENT.md`'s render-loop rules.
5. `prefers-reduced-motion` and WebGL-unavailability both degrade gracefully: reduced motion disables idle drift/pointer-parallax/scroll-scrub (content is shown fully assembled, no motion); no-WebGL renders a static gradient fallback (`Fallback3D`) — the page is never gated on 3D support.

Consequences:
Any future top-level route addition must consider whether it belongs under `/app` (authenticated shell) or as a public route beside `/` and `/login`. `docs/ARCHITECTURE.md`'s routing section is updated accordingly. Bundle: main app chunk ≈302KB gzip (down from ≈606KB pre-split when 3D deps were eagerly bundled); `Landing` chunk ≈303KB gzip, loaded only on `/`.

---

## ADR-008 — Floor/Table Mutations With Captured-Scope Invalidation
Date: 2026-07-20
Status: Accepted

Context:
Phase 6 wires live FloorPlan/Table management mutations onto the Phase 5 TanStack Query read architecture. Mutations affect operational restaurant state; branch/floor may change while a request is in flight. Geometry drag must not flood the network. Domain actions (Move, Status, Activate) must stay separate from generic Update.

Decision:
1. Extend `src/api/floorPlans.ts` / `src/api/tables.ts` with confirmed mutation functions only (framework-free).
2. Orchestrate via `src/hooks/useInventoryMutations.ts` — each mutation captures `restaurantId`/`branchId`/(source|target)`floorPlanId` at invoke time and invalidates those exact `inventoryKeys` on success.
3. Prefer pending UI + refetch over optimistic updates for activate/move/delete/status.
4. Geometry persistence: **save-on-drop** (and form edit) via `PATCH /tables/:tableId` using `tableToUpdateRequest`; no PATCH on pointer-move. Do not remount mock `FloorDesigner` as production authority.
5. Viewing a FloorPlan never activates it; Activate is an explicit action.
6. FloorPlan/Table create does not send `Idempotency-Key` (not in backend idempotency set).
7. Advisory UI gate: organization Owner/Admin only (`useCanManageInventory`). Backend 403 remains authoritative. Employees remain unsupported for inventory.

Consequences:
Walk-In/Waitlist/Dashboard mock table mutations stay isolated. Reservation availability remains `GET /reservations/availability`. Merge/Split and FloorPlan edit/delete remain out of scope.

---

## ADR-007 — TanStack Query For Floor/Table Inventory Reads
Date: 2026-07-23
Status: Accepted

Context:
Phase 5 migrates Tables and Floor Plan to live backend inventory. Both pages (and future mutations) need the same branch-scoped FloorPlan/Table lists with loading/error/refetch, branch/floor switching, and auth cache isolation. Phase 3/4 deliberately deferred TanStack Query; `STATE_MANAGEMENT.md` threshold is now crossed.

Decision:
1. Add `@tanstack/react-query` with `AppQueryProvider` under `AuthProvider`.
2. Keep `src/api/floorPlans.ts` and `src/api/tables.ts` framework-free.
3. Query keys via `inventoryKeys` always include restaurantId + branchId (+ floorPlanId when scoped).
4. Clear `inventory` queries + floor-plan persistence on logout/unauthenticated identity.
5. FloorPlan selection priority: active → persisted (revalidated) → first.
6. Primary Floor Plan UI uses read-only `FloorPlanReadView` with backend `positionX`/`positionY` (physical `left`/`top`, `dir="ltr"` canvas). Local `FloorDesigner` is not mounted on the production Floor Plan page (layout mutations deferred).
7. Do not integrate FloorPlan/Table mutation endpoints in Phase 5.

Consequences:
Reservation availability remains a separate time-dependent API. Dashboard/Walk-In/Waitlist still use legacy mock tables. Employee access remains blocked by Owner/Admin-only inventory endpoints and Phase 3 restaurant-list ScopeGate.
*(Phase 6 / ADR-008 supersedes item 6–7 for production mutations while keeping FloorDesigner off the production path.)*

---

## ADR-006 — Reservations Phase 4 Bound To Live Backend Surface (No Staff List Yet)
Date: 2026-07-23
Status: Accepted

Context:
Phase 4 aimed to replace mock reservation management with the real API. Live OpenAPI / Postman / `../back/TASKS.md` confirm only two reservation endpoints are implemented (Phase 7.1): `GET /reservations/availability` and `POST /reservations` (Online create as the JWT user, always `Pending`). Staff list, detail, approve, reject, cancel, complete, no-show, reschedule, and phone/walk-in guest create are architecture-frozen for later backend phases and are **not** callable. Inventing client-side list/status APIs would violate contract authority.

Decision:
1. Implement `src/api/reservations.ts` for the two live operations only, with exact DTOs and `Idempotency-Key` on create.
2. Do **not** introduce TanStack Query yet — there is no shared reservation list/detail cache across pages; availability+create are form-local. Revisit when staff list/mutations ship.
3. Rework Reservations / ReservationDetail to remove mock lists and fake lifecycle mutations; surface an honest backend-gap empty state; offer branch-scoped availability + Online create using Phase 3 scope + branch timezone conversion.
4. Keep legacy mock reservation **reads** only where other demo features still need them (Dashboard metrics, Floor Plan guest labels, Calendar, GlobalSearch, Walk-In/Waitlist seating) inside `RestaurantContext`, clearly non-authoritative for the Reservations product surface.
5. Remove public confirm/check-in/seat/complete/cancel/reassign methods from `RestaurantContext`.

Consequences:
Staff cannot manage inbound reservations until backend Phase 7.2+. Online create books as the signed-in user, not a guest — document for users. Employee actors remain blocked by Phase 3 Owner/Admin restaurant-list scope (unchanged). Recommended next frontend phase after backend staff reservation APIs: wire list/detail/Domain Actions; until then Tables may still proceed independently for floor inventory.

---

## ADR-005 — RestaurantScopeProvider Separate From Legacy RestaurantContext
Date: 2026-07-23
Status: Accepted

Context:
Phase 3 must replace mock shell restaurant/branch identity with backend-derived scope (`GET /restaurants`, `GET /restaurants/:restaurantId/branches`). The existing `RestaurantContext` owns a large mock operational store (reservations, tables, waitlist, mutations). Rewriting it in place would force unrelated feature migrations. JWT `restaurantId` / `branchIds` are advisory only and must not authorize access. Tenant identity remains JWT-derived on the server — path params are resource addressing, not tenant overrides.

Decision:
1. Introduce `RestaurantScopeProvider` (`src/context/RestaurantScopeContext.tsx`) as the sole owner of authenticated restaurant/branch **selection/scope**: accessible lists, selected IDs, presentation DTOs needed by the shell, status (`idle`/`loading`/`ready`/`empty_*`/`forbidden`/`error`), and select/refresh actions.
2. Keep legacy `RestaurantContext` as temporary mock operational state until each feature is wired.
3. Provider order: `AuthProvider` → `RestaurantScopeProvider` → `RestaurantProvider` (mock) → …
4. Persist only IDs in `localStorage` (`tavla-selected-restaurant-id`, `tavla-selected-branch-id`); always revalidate against backend lists. Clear persistence on logout / account switch, not on idle unauthenticated mount (so reload-after-login restore works).
5. Selection priority — restaurant: persisted ∈ list → JWT hint ∈ list → first Active else first. Branch: persisted ∈ list → first JWT `branchIds` hit → first branch. Restaurant change clears branch persistence and reloads branches with AbortController + request-id race guards.
6. Do not introduce TanStack Query for Phase 3 alone — provider-owned load is sufficient; revisit when multiple pages share the same lists with mutations.
7. Shell (`Header`, `Sidebar`, `ScopeGate`) consumes scope; login uses Tavla platform branding (no pre-auth restaurant identity).

Consequences:
Feature pages remain mock-backed. Branches page is not CRUD-wired. Organization Employees may receive `FORBIDDEN` on restaurant list (Owner/Admin only per backend) — `ScopeGate` surfaces that state. Future feature modules must take `selectedRestaurantId` / `selectedBranchId` from scope for resource paths.

---

## ADR-004 — Production AuthProvider and Advisory JWT Claims
Date: 2026-07-23
Status: Accepted

Context:
Phase 1 left fake `AuthContext` in place. Live OpenAPI confirmed that neither `POST /auth/login` nor `GET /users/me` returns `permissions`, `branchIds`, `employeeId`, or `restaurantId` — those live in access JWT claims. Prior frontend docs incorrectly said to obtain permissions from login/`/users/me` and to never decode the JWT at all, which left no way to expose confirmed branch/permission data for advisory UI gating.

Decision:
1. Replace fake auth with `src/api/auth.ts`, `src/api/users.ts`, and a production `AuthProvider` using `tokenStore` + exported `refreshSession()` for bootstrap (shared single-flight with client 401 refresh).
2. Canonical identity is `AuthIdentity` (`src/types/auth.ts`), preserving `actorType`, organization role, and operational claim fields separately — not a flattened mock `StaffRole`.
3. Parse access JWT payload without signature verification solely to populate advisory `permissions` / `branchIds` / ids for UI hooks (`useHasPermission`, `useHasOrgRole`). Server enforcement is unchanged.
4. `GET /users/me` is best-effort profile enrichment after login/bootstrap; login remains authoritative for org membership when present.
5. Remove all `tavla-user` / DEMO_USER / passwordless login paths.

Consequences:
Floor-plan edit gating uses org Owner/Admin or `tables:manage` instead of mock `owner|manager`. Feature pages remain on mock data. A future dedicated claims/profile endpoint could supersede JWT parsing without changing `AuthIdentity` consumers.

---

## ADR-003 — API Client Foundation (Phase 1)
Date: 2026-07-23
Status: Accepted
Supersedes: ADR-002 (partially — foundation exists; feature wiring still pending)

Context:
The dashboard had no `src/api/` layer, no env-based base URL, and no test runner. Feature work could not safely call the real backend. Frontend docs previously said both `AUTH_INVALID_TOKEN` and `AUTH_EXPIRED_TOKEN` should trigger silent refresh, and described pagination as living in envelope `meta` with `totalPages`. Live backend contract (Swagger + Postman + `API_GUIDELINES.md`) differs: refresh body is `{ refreshToken }`, only `AUTH_EXPIRED_TOKEN` is a clean expiry signal, and list pagination fields (`items`/`page`/`limit`/`total`) live inside `data` while envelope `meta` is typically `{}`.

Decision:
1. Introduce `src/api/client.ts` (+ `types.ts`, `errors.ts`, `tokenStore.ts`) as the sole HTTP boundary; no resource modules or AuthContext rewrite in this phase.
2. Access token in memory via `tokenStore`; refresh token in `sessionStorage` (`tavla-refresh-token`); session-invalidated listeners for future AuthProvider.
3. Silent refresh-and-retry only on `401` + `AUTH_EXPIRED_TOKEN`, single-flight, one retry; never on `AUTH_INVALID_TOKEN`.
4. Optional per-request `idempotencyKey`; never attach globally. FormData must not force `Content-Type: application/json`.
5. Adopt Vitest + MSW with `src/api/client.test.ts` covering envelope/error/auth/FormData/idempotency/refresh behavior.
6. Correct frontend docs (`API_INTEGRATION.md`, etc.) to match the backend pagination and refresh-code contract.

Consequences:
Feature pages still use mock data until their Phase N wiring. Phase 2 should replace fake `AuthContext` with real `POST /auth/login` / `GET /users/me` using `tokenStore` + `apiRequest`. Empty `src/api/auth.ts` placeholders are forbidden until that phase.

---

## ADR-001 — Governance Docs Established, Mirroring Backend's Doc-Driven Approach
Date: 2026-07-23
Status: Accepted

Context:
The backend (`../back`) is governed by an extensive `/docs` set (API_GUIDELINES, AUTHENTICATION_ARCHITECTURE, TENANCY, DATABASE_SCHEMA, etc.) plus a root `CLAUDE.md` that makes those docs authoritative. The frontend had no equivalent rule set — only descriptive product/design docs (`TAVLA_PROJECT_DOCUMENTATION.md`, UX studies) and no enforced contract for how it integrates with the backend.

Decision:
Establish a root `CLAUDE.md` and `docs/` set for the frontend (`ARCHITECTURE.md`, `CODING_STANDARDS.md`, `API_INTEGRATION.md`, `AUTH_AND_RBAC.md`, `STATE_MANAGEMENT.md`, `COMPONENT_GUIDELINES.md`, `STYLING_GUIDELINES.md`, `I18N_AND_RTL.md`, `ERROR_HANDLING.md`, `TESTING_STRATEGY.md`, `ENVIRONMENT_SETUP.md`, `DECISIONS.md`, `CHANGE_POLICY.md`), explicitly deferring contract authority (endpoint shapes, enums, error codes) to `../back/docs` and `../back/TAVLA-API.postman_collection.json`.

Consequences:
Future feature work has a concrete contract to check against instead of guessing. The docs also record, as of this date, that the app runs entirely on mock data and a fake `AuthContext.login`, and that several frontend types (`TableStatus`, `ReservationStatus`, `StaffRole`) do not match the backend's real enums — this is tracked as required reconciliation work, not fixed by this ADR itself (see `API_INTEGRATION.md`'s Type Reconciliation table).

---

## ADR-002 — Real API Integration Layer Not Yet Wired
Date: 2026-07-23
Status: Superseded by ADR-003 (foundation landed; per-feature wiring still open)

Context:
The dashboard has no `src/api/` folder, no HTTP client, and no real auth flow. All pages read from `src/data/mockData.ts` and `AuthContext` fabricates a demo user on any non-empty login input.

Decision:
Treat this as explicitly temporary bootstrap state. `ARCHITECTURE.md` specifies the `src/api/` layer to build; `API_INTEGRATION.md` specifies the contract (base URL, envelope, auth/token handling, tenant scoping, endpoint catalog) it must follow once built.

Consequences:
No feature should extend the mock/fake-auth pattern further. Each feature area's real wiring should be its own change, updating this log and `API_INTEGRATION.md`'s endpoint catalog as endpoints are confirmed against a live backend or an updated Postman collection.

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

## ADR-025 — A branch pin is the restaurant’s place on the map
Date: 2026-09-29
Status: Accepted

Context:
Guest discovery finds restaurants with `GET /discovery/restaurants/nearby`. The coordinates live on the branch (`latitude`, `longitude`) in create and update. The branch form saved those fields as null because it never asked for them.

Decision:
The branch form includes a map. A click, typed coordinates, or this device’s location sets the pin. Save sends both numbers on the existing branch create or update body. One number without the other is rejected in the form. The nearby endpoint is not called to store a location.

Consequences:
Each branch has its own pin. A branch left without coordinates stays off the guest map. The map tiles come from OpenStreetMap.

---

## ADR-024 — Menu and marketing lead with the next publish
Date: 2026-09-29
Status: Accepted

Context:
Offers, gallery, menu, and reviews were live, but each row showed every action at once. Gallery upload was a file button with a hover-only delete wash. Menu items hid availability inside the editor. Reviews had no summary, and the reply was an icon beside delete.

Decision:
1. A draft offer’s primary action is Publish. Edit and delete move to the overflow. Delete stays behind confirmation. The period is one compact range. Offers, reviews, and menu items use cards below `md` so that action stays on screen.
2. The cover is a capped card. Replace sits on the image and still calls the cover upload. Gallery photos are added from a drop zone. Progress is the pending upload, and a rejected file or a failed call stays on the zone. The grid no longer uses a dark wash.
3. Categories show how many items they hold. The item switch sets `availabilityMode` to `Always` or `Unavailable` through the existing item update. Saving the item sends the current mode, because the update rejects a body that omits it. The accepted values are `Always`, `Unavailable`, and `Scheduled`. Windows are written only after the mode is `Scheduled`.
4. The reviews page shows the reviews-summary average and count when that call returns them. Star filters apply to the loaded page, because the list endpoint accepts page and limit only. Reply is the labeled primary action. A photo and delete stay in the overflow, and delete still confirms.

Consequences:
A scheduled item with no windows still follows the availability windows already stored on the item. A star filter does not ask the server for that rating, so another page can still hold matching reviews.

---

## ADR-023 — The service floor keeps the map in front
Date: 2026-09-29
Status: Accepted

Context:
The floor editor shared the screen with a permanent side column, the waiting list opened with a form, and walk-in asked for every field before a table could be chosen. Table inventory showed every action on the row. Geometry still saves when a drag ends. The waiting list has no branch-wide read, so the page can only show guests added in this tab.

Decision:
1. The floor canvas fills the screen. Zoom, fit, snap, table sizes, draw, and zones sit on one toolbar. Zones collapse. The selected table opens in a drawer. The save chip shows saving, saved, or retry, and a failed save keeps its message on the page until retry or discard. A browser leave prompt is not added: closing the tab already goes through the signed-in leave flow.
2. The tables list uses one primary action, change status, and puts edit, move, split, and delete in the overflow. Below the `md` breakpoint the same rows are cards. Status stays the structural table status.
3. The waiting list leads with the queue. Add opens in a drawer. Wait time is how long ago the guest was added on this device.
4. Walk-in starts at the current time and a party size, searches once, and keeps email and notes behind a disclosure.

Consequences:
A failed floor save stays on screen until it is retried or discarded. Drawn zone rectangles stay in this browser, as they did before. The waiting list still is not the branch queue.

## ADR-022 — Operations screens lead with the next decision
Date: 2026-09-29
Status: Accepted

Context:
The home, booking list, booking ticket, and calendar showed the same weight of information. Staff could not see which number needed a decision, and reject, no-show, and cancel sat beside the primary action. Cancel is the only lifecycle call that accepts a reason.

Decision:
1. One home metric is loud: bookings waiting for a yes or no, then a high no-show rate, then unread notices, then arrivals still to come, then today's total. A zero stays quiet.
2. The next-arrivals list is short and each row offers the next step: confirm a pending booking, or open an approved one. Walk-in stays the only primary action in the page header.
3. A booking ticket shows guest, party, time, table, and status. The reference is the first eight characters; the full id is behind a disclosure and can be copied. Source uses the existing source labels.
4. Lifecycle controls show one primary button. Reject, no-show, and cancel open `ConfirmDialog`. The reason field is shown and sent only for cancel.
5. The booking list filters today, upcoming, and status on the loaded window, and can switch comfortable or compact cards. The calendar marks the current hour on today and caps how many bookings a single hour draws.

Consequences:
Reject and no-show stay without a reason because those endpoints take an empty body. A reason must not be added to those requests from the client. Compact cards hide the phone and notes; they do not drop the primary action.

## ADR-021 — One formatter and a small set of shell primitives
Date: 2026-09-29
Status: Accepted

Context:
Dates, times, and numbers were formatted in each page, and the calendar axis wrote English "10 AM". Icon buttons, overflow actions, confirmations, and side panels were being reinvented per screen.

Decision:
1. Staff-facing dates, times, ranges, relative times, and numbers go through `src/lib/format.ts` with the active locale. Tabular numerals stay on `.nums`.
2. `Tooltip`, `DropdownMenu`, `Drawer`, and `CopyButton` are the shared primitives. `ConfirmDialog` stays on `Modal` and can ask for a reason. Toasts accept an optional undo action.
3. `StatCard` uses quiet / default / loud. A zero is quiet unless the card is loud. `EmptyState` has a compact size. `DataTable` can swap to caller-provided cards below `md` and can render skeleton rows.
4. Focus uses the single `:focus-visible` outline in `index.css`.

Consequences:
A new status or a new screen should not add another date helper or another menu. Pages adopt the row-action and card patterns as they are rebuilt.

## ADR-020 — Session notice and mobile shell stay in view
Date: 2026-09-29
Status: Accepted

Context:
The signed-in notice was a fixed bar with a constant height. The sticky header used the viewport top, so it slid under the notice, and the notice truncated at a phone width. Below the large breakpoint, search and the restaurant/branch switcher were not in the header at all.

Decision:
1. Keep the notice visible. Measure its height and store it in `--logout-leave-banner-h`. The header sticks at that offset, and the sidebar already does. Logout and the confirm step are unchanged.
2. Below the large breakpoint, a search icon opens the existing search field, and a location icon opens the same restaurant and branch selects. The desktop search owns the keyboard shortcut only while it is on screen.
3. Reservation status names use `reservationStatusLabel` and `t.status`. Reports maps those labels before the chart.

Consequences:
Two search fields are not mounted with the shortcut at once. A new status still shows its raw value until a translation key exists. No new dialog or drawer primitive.

## ADR-019 — Home and search use the branch booking list
Date: 2026-09-29
Status: Accepted

Context:
The organization Owner (and Admin) can list branch reservations and run lifecycle actions. The home screen and header search still called `GET /reservations`, which returns only bookings owned by the signed-in account, so guest arrivals never appeared. A local floor designer, a shortcut grid, and two shell bars were not mounted on any route and did not call an endpoint.

Decision:
1. The home "arriving" and "needs action" lists, and header search, use the branch date-window list. A 403 still falls back to the caller's own reservations.
2. Remove the unmounted floor designer, the shortcut grid, and the unused shell bars.
3. Keep Owner and Admin as the operators the API authorizes. Staff and Billing organization members stay read-limited by the server. Transfer of ownership remains Owner-only.

Consequences:
Searching loads the branch window only after the query has two characters. Guest detail still depends on the row already loaded in this session, because there is no staff get-by-id endpoint.

## ADR-018 — Owner and Admin can read and update branch reservations
Date: 2026-09-29
Status: Accepted

Context:
Postman now allows the restaurant Owner or Admin to list a branch's reservations and to approve, reject, mark table-ready, complete, and mark no-show. Those calls were previously documented as Employee-only. ADR-016 kept the owner on day counts because the list returned 403.

Decision:
1. Keep calling the branch date-window list first. A successful response is the booking board, including guest, table, and the Arrived / Finished / Didn't come actions.
2. Fall back to the caller's own reservations only when that list returns 403 (Staff or Billing organization members, or an Employee who is not assigned to the branch).
3. Do not treat Owner/Admin as missing the `reservations:*` permission slugs. Those slugs remain the Employee gate.

Consequences:
Invite-employee still requires a restaurant role id. The collection did not add a role catalog. Guest name and status changes for the owner depend on the running API matching this Postman revision.

## ADR-017 — Staff invite assigns the selected branch in the same action
Date: 2026-09-28
Status: Accepted

Context:
An Owner cannot open guest bookings. Only an Employee assigned to the branch can. The staff page asked for raw role, employee, and branch ids, and there is still no `GET` employees list and no role catalog. Invite alone leaves `assignedBranchIds` empty, which the server treats as restaurant-wide scope rather than the branch the owner had selected.

Decision:
1. The staff form takes the person's name, email, phone, a branch from the loaded scope, and the restaurant role id the server requires.
2. Submit calls invite, then assign-branch. If assign fails, the invited person stays visible and the error is shown.
3. People returned by those calls are kept for the browser visit only. Do not invent a roster endpoint.

Consequences:
Previously invited employees are not listed after a new visit. The role id remains a manual field until the server publishes a role catalog.

## ADR-015 — Restaurant cover is a staff upload, not the gallery
Date: 2026-09-28
Status: Accepted

Context:
The guest app shows `coverImageUrl` from public discovery. Gallery images and the restaurant logo do not set that field. Postman now has `POST /restaurants/:id/cover` for Owner/Admin and a separate Platform Admin upload.

Decision:
1. This dashboard calls `POST /restaurants/:id/cover` with the staff access token and a single multipart field `file`.
2. The Photos page shows the returned `coverImageUrl`, and refreshes it from `GET /discovery/restaurants/:id`. The URL is not stored or rebuilt from `coverImageId`.
3. Platform Admin `POST /platform-admin/restaurants/:id/cover` stays out of this app.

Consequences:
Replacing the cover deletes the previous object on the server. An employee sees the cover and cannot upload one.

## ADR-016 — Owner sees branch booking counts when the staff inbox is forbidden
Date: 2026-09-28
Status: Accepted

Context:
`GET /restaurants/:id/branches/:id/reservations` is Employee-only. An Owner/Admin token receives 403, and the previous fallback listed `GET /reservations`, which never includes guest bookings. The reservations page and calendar then looked empty even when the branch had bookings. Owner/Admin can read `GET /restaurants/:id/analytics/reservations/summary` and `GET …/analytics/branches/:id/reservations/trends`.

Decision:
1. Map branch rows (`partySize`, `reservationSource`, `table`, `customer`, `specialRequest`) and ownership rows onto one view before rendering.
2. When the branch list returns 403, keep the ownership rows that do exist, and fill the gap with the analytics day counts and status totals. Do not invent a guest-level list.
3. The reservations board leads with those bookings. Creating a reservation stays behind an explicit action and refreshes the list.

Consequences:
Guest name, phone, and table stay hidden until the signed-in actor is an Employee assigned to the branch. The owner still sees which days have bookings and how they break down by status.

## ADR-012 — Platform Owner console is a separate Vite app
Date: 2026-09-14
Status: Accepted

Context:
ADR-011 isolated platform code under `src/platform/` inside the restaurant dashboard repo. Operators still wanted a dedicated workspace folder so the two products cannot share routes, auth, or accidental UI coupling.

Decision:
1. Move the Platform Owner console to `Tavola_platform` (sibling of `Tavola`), with its own Vite app on port 5174.
2. Restaurant app (`Tavola`) keeps `/app` only. `/platform/*` in this app is a pointer page to `http://localhost:5174/platform`.
3. Remove `loginPlatformAdmin` and `src/platform/` from the restaurant client.

Consequences:
Two `npm run dev` processes are required for local full-stack UI. Shared UI primitives were copied, not linked — visual drift is possible and should be reconciled later if both apps keep evolving.

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
4. Geometry persistence: **save-on-drop** (and form edit, rotate, resize) via `PATCH /tables/:tableId` using `tableToUpdateRequest` / `withCompleteGeometry`; no PATCH on pointer-move. The production editor is `FloorPlanReadView` (presets, snap, zoom/fit, tap-to-place). Always persist complete `width`/`height`/`rotation` when previously null so guest clients can render the same CSS-pixel, top-left, LTR coordinate space. Do not remount mock `FloorDesigner` as production authority.
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

## ADR-009 — Wire Phase 19 Postman staff gaps (branch calendar, broadcast, org team)
Date: 2026-08-28
Status: Accepted

Context:
The adopted `postman/TAVLA-API.postman_collection.json` (224 requests, production `baseUrl`) added Restaurant Dashboard Calendar, restaurant notification broadcast, organization members/invitations/transfer, and public invitation accept. The dashboard still used ownership `GET /reservations` for Calendar/Reservations and had no Team/broadcast/accept-invite surfaces. Platform Admin routes remain out of scope.

Decision:
1. Add `listBranchReservations` and drive Calendar + Reservations from the branch date-window API; on Employee-only 403, fall back to ownership list with an honest banner.
2. Add Owner/Admin broadcast on Notifications via `POST /restaurants/:id/notifications/broadcast`. (Withdrawn in ADR-016.)
3. Add Settings → Team for members/invitations/role/remove/transfer (Owner/Admin).
4. Add public `/invite/:token` accept flow.
5. Do not invent waitlist board or employee roster list endpoints (still absent from Postman).

Consequences:
Owner/Admin OrganizationMember sessions may see the ownership fallback for calendar/inbox until they also hold an Employee actor. Customer and Platform Admin collections remain intentionally unwired.

## ADR-011 — Isolate Platform Owner console under `src/platform/`
Date: 2026-09-14
Status: Accepted

Context:
The Platform Owner console was implemented next to the restaurant dashboard (`src/pages/platform/`, `src/components/platform/`, `src/api/platformAdmin.ts`). That mixed two products in the same folders and made it easy to change restaurant routes while touching platform files.

Decision:
1. Move all Platform Owner code into `src/platform/` (`api/`, `auth/`, `layout/`, `pages/`, `routes.tsx`).
2. Keep public URLs unchanged (`/platform`, `/platform/login`, `/app`).
3. Restaurant dashboard remains in `src/pages/` + `src/components/layout/DashboardLayout`.
4. Leave compatibility re-exports at `src/api/platformAdmin.ts` and `src/components/auth/PlatformRoute.tsx` so older imports do not break.
5. Shared providers (Theme, Locale, Auth, Toast, Sidebar) stay in `App.tsx`; they are not duplicated.

Consequences:
New platform screens belong under `src/platform/pages/`. New restaurant screens belong under `src/pages/`. Do not add platform pages to `src/pages/`.

## ADR-010 — Platform Owner console (/platform)
Date: 2026-08-28
Status: Accepted (folder layout superseded by ADR-011)

Context:
Restaurant dashboard (/app) serves OrganizationMember/Employee actors. Platform operators need a separate console for restaurants/organizations lifecycle, revenue, acquisitions, admins, and account access control. Contracts live in `postman/TAVLA-Platform-Back-Office.postman_collection.json` plus `03 - Platform Owner` in `TAVLA-API.postman_collection.json`.

Decision:
1. Ship a separate route tree at `/platform` with `PlatformLayout` and `PlatformRoute` (requires `actorType === PlatformAdmin`).
2. Authenticate via `POST /platform-admin/login` (`loginPlatformAdmin`); do not mix with restaurant `POST /auth/login`.
3. Client module `src/api/platformAdmin.ts` owns all `/platform-admin/*` calls.
4. `RestaurantAppRoute` redirects PlatformAdmin away from `/app`.

Consequences:
Platform sessions may lack refresh tokens (issuer isolation) — re-login after full reload is acceptable until a platform refresh contract is confirmed. Restaurant and platform consoles share Theme/Locale/Toast providers but not RestaurantScope.

## ADR-012 — Table status matches the live response enum
Date: 2026-09-23
Status: Accepted

Context:
The live OpenAPI `TableResponseDto.status` enum is `Available | Occupied | Cleaning | Disabled | Reserved | Merged` and the DTO carries `isMergePrimary`. The dashboard typed only the first four, so a merged or reserved table had no colour and no label.

Decision:
1. `TableStatusDto` mirrors the full response enum; `TableDto` includes `isMergePrimary`.
2. `ManualTableStatusDto` (first four values) types `POST /tables/:tableId/status`. `Reserved` and `Merged` offer no transitions.
3. Partitions/areas stay unimplemented: no route or `partitionId` exists in the live OpenAPI (see `TAVOLA_REMAINING_BACKEND_REQUIREMENTS.md`).

Consequences:
The floor page and tables list display `Reserved`/`Merged` read-only. The dashboard never sets or infers them.

## ADR-013 — Floor-plan areas are backend FloorPlans
Date: 2026-09-23
Status: Accepted

Context:
Restaurants need named areas (Main Hall, Terrace, VIP Room). The live OpenAPI (187 paths) and the latest Postman collection have no partition, section, zone, or area resource and no `partitionId` on Table. FloorPlan already has a staff-chosen `name`, tables belong to exactly one FloorPlan, and seeded branches use FloorPlan names such as "Main Hall".

Decision:
1. The Floor Plan page shows one tab per FloorPlan (`FloorAreaTabs`) with its table count and a Guests badge on the active one.
2. Add area calls Create FloorPlan with a typed or suggested name. Move to area calls Move Table.
3. An inactive area shows that guests can't see it, with a "Show this area to guests" action (Activate FloorPlan).
4. No area data is stored in the browser, table names, positions, `floor`, or `layer`.

Consequences:
Guests see one area per branch until the backend adds partitions or returns every floor plan publicly. True sub-areas inside one map stay BACKEND REQUIRED (`TAVOLA_REMAINING_BACKEND_REQUIREMENTS.md` section 1).

Update (same day): the Floor Plan page can show every floor plan together (`FloorAreasOverview`). That view is a layout of real FloorPlan records. It does not create a second coordinate system, and it does not persist a rectangle, a color, or a `sectionId`. Dropping a table on another area calls Move Table.

## ADR-014 — Dining halls are FloorPlanAreas inside one floor plan
Date: 2026-09-24
Status: Accepted
Supersedes: the ADR-013 claim that Main Hall and Terrace must each be a FloorPlan.

Context:
The Postman collection now exposes Floor Plan Areas (ADR-040). A hall is concurrent with other halls on the same floor plan. `FloorPlan.isActive` is still “one layout per branch is shown to guests.” Area fields are `name`, `#RRGGBB` `color`, and `sortOrder`. Tables carry `floorPlanAreaId` and an optional `color`. The area resource has no geometry.

Decision:
1. Add and draw a hall on the open floor plan via `src/api/floorPlanAreas.ts`. Create sends `{ name, color, sortOrder }`.
2. Drawing a rectangle assigns intersecting tables through Update Table (`floorPlanAreaId`). Every later geometry save includes `floorPlanAreaId` and `color` so a drag does not clear membership.
3. The colored outline is derived from those tables. It is not stored.
4. Delete is refused in the UI copy when the server returns 409 because tables remain.
5. Floor-plan tabs and the all-plans overview stay. They are layouts, not halls.

Consequences:
Guests still see the active floor plan only. A hall with no placed tables has a chip and no outline until tables join it.

## ADR-015 — Waitlist and staff come from the server
Date: 2026-11-08
Status: Accepted
Supersedes: the session-storage boards described for the Waitlist and Staff pages.

Context:
The backend now lists a branch's waitlist for one day and a restaurant's employees and roles. Before that, both pages kept what this browser tab had created, so another device or another staff member saw nothing, and an invite needed a role UUID typed by hand.

Decision:
1. The Waitlist page reads `GET …/branches/:bid/waitlist?date=` through React Query (`waitlistKeys.branchDay`) and refetches every 30 seconds. Join, promote, and cancel invalidate it.
2. A staff join always sends `reservationGuest`. Without it the backend queues the signed-in owner as the customer.
3. The Staff page reads `GET …/employees` and `GET …/roles` (`employeeKeys`). Role is a select. Nothing is stored in `sessionStorage`.

Consequences:
Both pages need the backend release that adds these routes. Against an older backend they show the load-error state.


> **Numbering note.** The CR round 2 decisions below reuse the numbers ADR-016 to ADR-020, which earlier entries above also use. Cite these as "ADR-0NN (CR round 2)". The next new decision is ADR-032.

## ADR-016 — Floors, the table queue, offer bookings and no broadcast (CR round 2)

Context: the owner's round-2 feedback on change request WJ-R-2026-002.

Decision:
1. Floors are the existing `Table.floor` number (null = ground floor) inside the active floor plan. The floor plan page shows one tab per floor; "Add floor" opens an empty tab for the session until a table is placed on it. No new endpoint.
2. A table with no position is "not placed yet". New tables are created without a position and wait in the queue beside the canvas; staff drag one onto the map (HTML5 drag and drop) or tap it and tap a free spot. Placing sets `positionX/positionY` and the current `floor` in one Update Table call. The create/edit table dialog asks only for number, seats, shape, floor and area.
3. The restaurant broadcast surface is removed (backend ADR-042 withdrew the route).
4. Branch reservation rows carry `offer { offerId, title } | null`; cards and the detail page show "Through the offer: …".
5. The home page splits reservations by source from the existing reservations summary: `Online` is the app, every other source is the dashboard.

Consequences: guests still see the active floor plan only, now across all its floors. Areas belong to a floor plan, so an area shows on the floors its tables stand on, and an empty area shows on every floor.

## ADR-017 — One reservations page, booking context and alerts (CR round 2, batch 2)

Context: the owner's round-2 feedback on the reservations and calendar pages (backend ADR-043).

Decision:
1. Reservations and the waitlist are tabs on `/app/reservations` (`?tab=waitlist`). `/app/waitlist` redirects there and leaves the sidebar. (Walk-in was a third tab until ADR-019.)
2. "New booking" books on the customer's behalf (`source = Phone` with `reservationGuest` name and phone), always in branch time. `?new=YYYY-MM-DDTHH:mm` opens it pre-filled; an empty calendar hour links there.
3. One list layout (no comfortable/compact switch) that always shows the phone. Status labels follow the CR wording (Awaiting approval, Confirmed, Visit ended, Approval timed out); a waitlist booking reads "From the waitlist".
4. Branch rows feed: who cancelled or declined and why (`statusChange`), the staff internal note (`PATCH /reservations/:id/internal-note`), a returning-customer badge (`customer.visitCount`), a countdown to `approvalDeadlineAt`, and a "closes automatically in N min" warning during the server's 30-minute auto-close grace. A daily "tables the system closed" card lists today's and yesterday's bookings completed by the System.
5. `/app/customers/:customerKey` lists one customer's bookings at the branch through the list's `customerKey` filter.
6. The dashboard shell watches Pending bookings every 30 seconds: a chime and toast for a new one, and once more 10 minutes before its approval window ends. The first load only records what is already pending.
7. The calendar draws the branch's own hours for the day (`GET /reservations/available-slots`, the only hours route open to employees; past days fall back to 10:00–23:00), drops the period stats (they live in Reports), and every week starts on Saturday.

Consequences: the watch adds one list request per 30 seconds per open dashboard. Sound only plays after the user has interacted with the page, as browsers require.

## ADR-018 — Venue plan on a fixed grid (CR round 2, batch 3)

Context: the owner's round-2 feedback on the floor plan ("مخطط المكان", CR pages 04–05), backend ADR-044. Supersedes the free-form canvas parts of ADR-008 and ADR-016 (zoom, snap/free toggle, presets, resize handles, local area drafts).

Decision:
1. One plan per branch (the active floor plan; a branch without one gets a one-click start) with a tab per floor, shown as a Map or a List (`?view=list`). `/app/tables` redirects to the list and leaves the sidebar.
2. The map is a fixed square grid that fills the width. A table snaps to whole squares and its size comes from the size table: 2–4 seats one square; 5–8 seats two by two (round/square) or two in a row (long). Geometry is still saved in layout units (`GRID_CELL` = 80 per square) so the guest app keeps real boxes; turning a long table swaps width and height and saves `rotation: 0`.
3. Areas are coloured rectangles drawn on the grid with a name and guest features (`features`, `floor`, `positionX/Y`, `width/height` on the area). A table belongs to the area holding its top-left square; dragging it in or out changes `floorPlanAreaId` in the same PATCH, together with the legacy `indoor/vip/smoking` flags derived from the area features (app 1.0.2 still reads them). Deleting an area first moves its tables out of it.
4. Dragging uses pointer events (mouse and touch) from the grid or from the "not placed yet" box; tap-then-tap also works. A spot that overlaps a table is refused. Clicking a table opens a small menu: rotate, edit, delete.
5. Saves are optimistic: `useUpdateTableMutation` patches every cached table list first and rolls back on failure, which is offered for retry. The refetch waits for the last queued save.
6. Add/edit table asks only number, seats, shape and area. The number continues the area's highest T-number and is never reused in the branch.
7. "Review plan" shows tables and seats per floor and lists tables still off the grid before the plan is shown to guests.
8. Staff can only take a table out of service and back; other statuses come from bookings. Merge/split stay in the list view; merge and split return `MergedUnitDto` (the merged seats are `effectiveCapacity`).

Consequences: tables saved by the old free-form editor are drawn at the nearest square and resized to the size table the next time they move.

## ADR-019 — No walk-in in the dashboard (CR round 2, batch 4)

Context: the owner decided the dashboard should not register walk-in guests at all. Supersedes ADR-017 item 1's walk-in tab and the walk-in parts of earlier UX decisions.

Decision:
1. The walk-in tab, its page, the `/app/walk-in` route and the dashboard home's walk-in links are removed. Staff book on a guest's behalf only through "New booking" (`source = Phone`).
2. `CreateStaffReservationRequest.source` is `'Phone'` only. The backend keeps `WalkIn` in `ReservationSource` for existing rows and API compatibility, so the dashboard still labels an old walk-in booking and counts it with dashboard bookings.

Consequences: an old `/app/walk-in` bookmark lands on the not-found page.

## ADR-020 — Three-axis reviews, re-rating and no deletion (CR round 2, batch 4)

Context: the CR splits a review into service, place and food, hides the restaurant's rating until it has enough recent reviews, and lets the restaurant ask a guest to rate again instead of deleting. Backend contract: ADR-045.

Decision:
1. The Reviews page shows the 6-month rating (or "new on Tavola" under 5 reviews), the axis averages with strongest and weakest badges, and server-side axis/star filters.
2. Owner/Admin read `/reviews/manage` to see each guest's private note; other roles read the public list. `useCanManageReviews` gates reply and reopen; the server still enforces both.
3. The restaurant replies once and may open a review for re-rating. The dashboard has no delete and no review-photo upload; the Gallery no longer manages review images.

Consequences: a single-rating review from app 1.0.2 shows its stars without axes.

## ADR-026 — Menu names, branch menus, price level, gallery order; offer kinds, conditions and impact (CR round 2, batch 4)

Context: the CR's menu page (item names in Arabic and English with the branch currency, a menu per branch or shared, a computed price level, ordered photos) and offers page (four kinds in Arabic, days and hours, conditions, visible edit and delete, an impact card; broadcast removed from round 2). Backend contracts: ADR-046 and ADR-047. Numbered 026 because 016–020 were reused by the round-2 entries above.

Decision:
1. Menu items carry `nameAr`/`nameEn`; the list shows the reader's language first and the other below. The backend's item update is a full replace, so every update goes through `menuItemUpdateBody(item, changes)`; this also fixes the availability toggle, which used to send only `availabilityMode`.
2. Prices show the item currency, else the menu's (`menuCurrency`: its branch's, or the one currency all branches share). A new menu can be shared or belong to one branch.
3. The price level is computed per branch and shown as stars on the Menu and Branches pages; Settings no longer edits it.
4. Gallery photos reorder by drag (desktop) or by move buttons (touch, keyboard) through `PUT /restaurants/:id/gallery/order`; upload tips sit above the drop zone. The Gallery tab stays (round-2 exclusion).
5. Offers: the four current kinds (older kinds still display), percentage or amount in the covered branches' currency, days/hours/conditions, the server's status (Ended past the period). Edit, delete, publish and impact are visible buttons. The impact card reads `GET /restaurants/:id/offers/:offerId/impact`.

Consequences: a shared menu over branches with different currencies shows prices without a currency unless the item has one. The impact card is fetched only while open.

## ADR-027 — Alert staff when a customer sends a message

Context: a customer's message from the app reached nobody until someone refreshed the inbox. The backend now creates a `StaffMessageReceived` In-App notification for each person who may answer (backend ADR-049). The dashboard has no socket client.

Decision:
1. The dashboard shell watches the newest 20 unread notifications every 20 seconds (`useUnreadNotificationsWatchQuery`, key `notificationKeys.watch()`). The first load only records what is already unread.
2. A new notification refreshes the unread badge and the notification list. A new `StaffMessageReceived` also refreshes the inbox and any open conversation, plays the chime and shows a toast (`useNewMessageAlerts`).
3. Opening a conversation marks its `StaffMessageReceived` notifications from the watch as read, so the badge does not keep counting messages already seen.

Consequences: one notification request per 20 seconds per open dashboard. A message can take up to 20 seconds to alert. Sound only plays after the user has interacted with the page, as browsers require.

## ADR-028 — Working hours, currency and timezone per branch; every text in both languages

Context: the owner wants working hours, currency and timezone to belong to each branch, not the whole restaurant (backend ADR-050), and every word of the dashboard to show in the selected language. Restaurant settings still had a restaurant-wide hours tab and English-only reservation rule labels; the hours editors had English weekday names and no way to close a day; and errors showed the backend's English `message` even in Arabic.

Decision:
1. Settings drops the Working Hours tab and the timezone/currency fields. The Reservation Rules tab says these are set per branch and links to Branches. `PATCH /restaurants/:id/settings` still sends the loaded `timezone`/`defaultCurrency` back unchanged, because the backend body requires them.
2. Branches edits hours with `WeeklyHoursEditor` (`src/components/branches/`): translated weekday names, an open/closed switch per day, and a note that a closing time before the opening time runs past midnight. A closed day is sent as no entry (`weekToEntries`), matching the backend rule that a weekday without a row is closed.
3. `apiErrorText(err, t, fallback)` (`src/lib/apiErrorText.ts`) picks an error's text: the dictionary's `apiErrors.serverMessages` is `show` in English (the backend's specific message) and `hide` in Arabic, where the translated `apiErrors.codes[code]` is used, falling back to the caller's translated text. Every page and component uses it instead of `err.message`.
4. UI primitives (`Skeleton`, `DataTableSkeleton`, `ErrorState`, `PageHeader`) default their screen-reader and retry labels from `t.common`; the calendar arrows and the menu availability weekdays use translated labels.

Consequences: the restaurant-level `GET/PATCH /restaurants/:id/working-hours` calls are gone from the dashboard. In Arabic, a validation error shows a general translated sentence instead of the backend's specific English detail.


## ADR-029 — Rules, photos and cover per branch; bilingual restaurant profile; Settings as in the owner's sheets

Context: the owner's Settings and Branches sheets (2026-11-13) move reservation rules, photos and the cover to each branch, keep name, description, cuisine and categories on the restaurant, and ask for every label in the selected language. The backend now stores rules per branch (`/branches/:branchId/settings`), takes `branchId` on gallery and cover calls (backend ADR-051), stores the name and description in Arabic and English (backend ADR-052), and describes each session's browser and system.

Decision:
1. Branches gets a Reservation rules dialog (`BranchRulesForm`) with ready-made choices for length, slot interval, cancellation window, pending timeout, late grace and reminder (`formatDuration`, `withCurrent` in `src/lib/durationLabel.ts` keep a saved value that is not a preset). Settings loses its Rules tab and no longer calls `/restaurants/:id/settings`. This replaces ADR-028 point 1.
2. The Photos page works on the selected branch: gallery list, upload, delete, order and cover all send `branchId`; the cover preview reads the public branch discovery endpoint. The Branches page has a Photos button that selects the branch and opens it. Settings loses its Gallery tab (ADR-026 point 4 no longer applies).
3. Settings → Profile edits the name and description in Arabic and in English (`splitByLanguage` files older single-language text by script). The shell, Dashboard, Menu and Branches show the name in the selected language with `restaurantName`.
4. Hours start on Saturday (`WEEK_ORDER`). Account language and preferred currency are dropdowns (`src/lib/currencies.ts`, names from `Intl.DisplayNames`). Security lists each session as "browser on system" with sign-in and last-used dates.

Consequences: a branch that never saved rules shows the restaurant's rules until it does. Without `branchId` the backend answers gallery reads for the oldest branch, which keeps the 1.0.2 app working.

## ADR-030 — Venue type, closures, booking limits, branch plan, front desk and setup guide

Context: the owner asked for the proposed additions to Branches and Settings, except the map items. The backend adds them in ADR-053: venue type and features per branch, temporary closures, an auto-approval party limit, minimum notice, furthest day ahead and a daily guest cap, a free trial and pause per branch, and a Front Desk role with the `reservations:today-only` permission.

Decision:
1. The branch form edits venue type and features (`BranchVenueFields`); the branch card shows them with the plan badge (`BranchPlanBadge`).
2. Branches has a Temporary closure dialog (`BranchClosuresPanel`) and a Pause/Resume button (`BranchPauseButton`). Settings → Subscription lists every branch's plan with the same button (`BranchPlansCard`). Billing stays with the organization.
3. `BranchRulesForm` adds the auto-approval limit and an "Extra booking limits" group. These limits apply to bookings from the app only; staff can still book by phone.
4. Staff shows role names and descriptions in the selected language (`roleLabel`). A user holding `reservations:today-only` (`useIsTodayOnly`) sees Reservations locked to today with a note; the backend enforces the same window.
5. The Dashboard shows a setup guide (`SetupGuideCard`, `useSetupProgress`, `src/lib/setupProgress.ts`) with nine steps, a percentage and the next step. It hides at 100% or when dismissed.

Consequences: a paused branch disappears from guest discovery and takes no online bookings; staff keep its reservations. The Front Desk role exists only after `prisma db seed` runs on the server.

## ADR-031 — Cuisine type is picked from the cuisine category list

Context: the restaurant profile had a free-text "cuisine type", so owners typed values the app could not group or translate. The backend now accepts only the name or slug of an active cuisine category for `cuisineType`, and cuisine/occasion categories carry an Arabic `nameAr`.

Decision:
1. The profile's cuisine type is a dropdown of `GET /cuisine-categories`, sending the category's `name`. Option labels follow the UI language (`taxonomyLabel`).
2. A value saved before the restriction stays selectable as "previous value", since the backend keeps it when it is sent back unchanged. Picking any other option replaces it.
3. The category checklists in the Categories tab use the same Arabic labels.

Consequences: a new cuisine needs a backend seed change, not a dashboard release. Older hand-typed values remain until an owner picks from the list.

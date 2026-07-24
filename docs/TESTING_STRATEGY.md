# TESTING_STRATEGY.md

# Current State

Vitest is configured via `vite.config.ts` (`npm test` / `npm run test:run`). MSW is used for HTTP-boundary tests. React Testing Library + happy-dom cover auth and restaurant/branch scope providers.

Covered today:

- `src/api/client.test.ts` — envelope, errors, FormData, idempotency, refresh single-flight
- `src/api/auth.test.ts` — login/logout/logout-all/`/users/me`
- `src/api/restaurants.branches.test.ts` — restaurant/branch list DTOs, pagination, errors, `formatBranchLabel`
- `src/api/reservations.test.ts` — availability query, create DTO + Idempotency-Key, CONFLICT/VALIDATION, branch timezone conversion
- `src/api/floorPlans.tables.test.ts` — floor/table reads + mutations, domain-action boundaries, FORBIDDEN, floor selection
- `src/components/floor/FloorPlanReadView.test.tsx` — RTL physical coordinate invariance; save-on-drop (no PATCH on pointer-move)
- `src/hooks/useInventoryMutations.test.tsx` — captured-scope TanStack Query invalidation
- `src/lib/accessTokenClaims.test.ts` — JWT claim parsing
- `src/lib/scopeSelection.test.ts` — restaurant/branch selection priority
- `src/context/AuthContext.test.tsx` — bootstrap, login/logout, session invalidation, route guards
- `src/context/RestaurantScopeContext.test.tsx` — scope init, persistence revalidation, restaurant switch races, empty/forbidden, logout clear

---

# Tooling

- **Vitest** — matches the existing Vite setup (`test` block in `vite.config.ts`).
- **MSW (Mock Service Worker)** — for testing `src/api/*` against realistic HTTP responses (success/error envelope) without a real backend.
- **React Testing Library** — add when component-level tests are introduced; do not add the dependency without a meaningful first test.

---

# What Must Be Tested

Priority order:

1. **`src/api/*` modules and `client.ts`** — envelope unwrapping, error mapping (`ApiError` shape, `code` propagation), auth-refresh-and-retry (single-flight, no infinite loop), idempotency key attachment, FormData vs JSON Content-Type. Covered by `src/api/client.test.ts` for the foundation.
2. **`lib/*` utilities with real logic** — floor-plan layout math (`floorDesigner.ts`, `floorLayout.ts`), currency/date formatting, the `cn` utility's edge cases if extended.
3. **Hooks with business rules** — permission resolution (`useHasPermission`), status-transition validation mirrored client-side.
4. **Critical user flows** (integration/component-level, RTL included) — login, creating a reservation, approving/rejecting a reservation, changing a table's status.

`components/ui/*` presentational primitives are lower priority for dedicated tests unless one accumulates real conditional logic.

---

# What Not To Do

- Don't write snapshot tests as a substitute for asserting real behavior.
- Don't mock `src/api/*` in a way that lets a component-level test pass while the actual HTTP contract (envelope shape, error codes) has silently drifted — prefer MSW at the network boundary over mocking the API module functions themselves.
- Don't gate a merge on tests that don't exist yet as an excuse to skip testing new logic — see `CHANGE_POLICY.md`/root `CLAUDE.md` quality gates.

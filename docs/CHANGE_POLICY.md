# CHANGE_POLICY.md

# Commit Convention

Conventional Commits, matching the backend's convention for consistency across the monorepo-adjacent projects:

`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `perf:`, `build:`, `ci:`, `style:`, `chore:`

Examples:

- `feat: wire reservations list to GET /reservations`
- `fix: correct TableStatus enum to match backend (Available/Occupied/Cleaning/Disabled)`
- `refactor: extract floor-plan layout math into lib/floorLayout.ts`
- `docs: update API_INTEGRATION.md endpoint catalog for reservation approve/reject`

---

# Pull Requests

Every pull request should state:

- **Purpose** — what feature/fix, and which backend endpoint(s) it depends on (link the Postman request or backend doc section).
- **Implementation summary** — key files touched, any new `src/api/*` module or context.
- **Testing notes** — what was manually verified (including both locales/RTL per `I18N_AND_RTL.md`), and what automated tests were added once `TESTING_STRATEGY.md`'s tooling exists.
- **Breaking changes** — any change to a shared type, context shape, or `src/api/*` function signature that other in-flight work might depend on.
- **Documentation updates** — which `docs/*` files were updated, or an explicit note that none applied.

---

# When Documentation Must Be Updated

| Change | Update |
|---|---|
| New/changed backend endpoint consumed | `docs/API_INTEGRATION.md` endpoint catalog |
| New context, provider reorder, or new top-level folder | `docs/ARCHITECTURE.md` |
| Auth flow, token storage, or permission-gating change | `docs/AUTH_AND_RBAC.md` |
| A frontend type corrected to match a real backend enum | `docs/API_INTEGRATION.md` Type Reconciliation table |
| Any non-trivial architectural or tooling choice (e.g. adopting a query library, a form library, a test runner) | `docs/DECISIONS.md` (new ADR) |
| New reusable UI primitive or component convention | `docs/COMPONENT_GUIDELINES.md` if the convention itself changes, not for every ordinary new component |

Documentation must never be left outdated by a merged change — if a PR makes a doc inaccurate, fixing the doc is part of that PR, not a follow-up.

---

# Quality Gates Before Merge

- `npm run lint` passes.
- `npm run build` (`tsc -b && vite build`) passes.
- No direct `fetch`/`axios` calls outside `src/api/`.
- Both locales (English/Arabic, LTR/RTL) manually verified for any UI-visible change.
- Relevant `docs/*` updated per the table above.
- No new mock-data or fake-auth logic introduced for a feature that has a real, available backend endpoint.

No change is considered complete until these are satisfied — matching the discipline the backend enforces on itself.

---

# Versioning & Releases

This project does not yet have its own versioning/release scheme separate from the backend's (`../back/docs/VERSIONING.md`, `RELEASE_POLICY.md`, `BRANCHING_STRATEGY.md`). Until the frontend needs independent release cadence (e.g. it's deployed separately from a specific backend API version), track compatibility informally: note in `DECISIONS.md` which backend API version (`/api/v1`, and any future `/api/v2`) a given frontend release targets, and revisit this policy — as its own ADR — the first time the frontend and backend need to version independently.

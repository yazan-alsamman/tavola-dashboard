# CODING_STANDARDS.md

# General Principles

Code must be readable, maintainable, testable, consistent, and modular.

Optimize for long-term maintenance over short-term speed.

---

# TypeScript

`strict` is already enabled (`tsconfig.app.json`) along with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`. Keep it that way.

- Never use `any`. Use `unknown` only at a genuine boundary (e.g. an unparsed API error body) and narrow it immediately.
- No type assertions (`as X`) without a runtime check backing them, except for well-understood DOM/event casts.
- Prefer `interface` for object/contract shapes (props, API payloads); prefer `type` for unions, intersections, and utility compositions (exactly the existing pattern in `src/types/index.ts`).
- Every exported function has explicit parameter and return types. Do not rely on inference across a module boundary.

---

# Naming

| Kind | Convention | Example |
|---|---|---|
| Components | PascalCase | `StatCard`, `DashboardLayout` |
| Context providers/hooks | PascalCase file, `useX` hook | `AuthContext.tsx` exporting `useAuth()` |
| Hooks (non-context) | camelCase, `use` prefix | `useReservations.ts` |
| API resource modules | camelCase file | `reservations.ts`, `floorPlans.ts` |
| Utility/lib functions | camelCase | `formatCurrency`, `cn` |
| Types/interfaces | PascalCase | `Reservation`, `TableStatus` |
| Enum-like string unions | PascalCase type name, lower/camel values matching the backend's wire format | see `API_INTEGRATION.md` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| Component/context files | PascalCase.tsx | `Button.tsx` |
| Non-component files | camelCase.ts | `utils.ts`, `floorLayout.ts` |

This matches the codebase as it stands — do not introduce kebab-case files into `components/`, `context/`, or `pages/`; that would make the tree inconsistent.

---

# Components

- One component's primary responsibility per file. A file may export small, tightly-coupled private subcomponents, but never two unrelated public components.
- Prefer composition (children, slots, render props) over boolean-prop explosion (`variant`, not five booleans that are mutually exclusive).
- Presentational components (`components/ui/*`) accept data and callbacks via props only. They do not import `context/AuthContext`, `api/*`, or `data/mockData`.
- Keep components under roughly 200 lines. If a component exceeds that, it is usually doing layout + data-fetching + business logic at once — split it.

---

# Pages

- A page file (`src/pages/*.tsx`) wires a data hook + layout + components together. It does not:
  - Contain fetch/axios calls directly.
  - Contain status-transition or permission-resolution logic inline.
  - Contain more than light formatting/derivation (a `.filter()`/`.map()` for display is fine; multi-step business rules are not).

---

# Functions & Hooks

- Each function has one responsibility. Keep functions under ~50 lines unless complexity genuinely requires more — if so, that's a sign to extract.
- Extract reusable logic into `lib/` (pure, framework-agnostic) or a custom hook (stateful/React-specific).
- Custom hooks that fetch data return a consistent shape: `{ data, isLoading, error }` (or the richer shape chosen in `STATE_MANAGEMENT.md` if a query library is introduced) — do not invent a bespoke shape per hook.

---

# The API Layer

- No component, page, or context may call `fetch`/`axios` directly. All network access goes through `src/api/*` (see `ARCHITECTURE.md`, `API_INTEGRATION.md`).
- Every `api/*` function is typed end-to-end: typed params in, typed `data` out, typed `ApiError` thrown on failure.
- Never duplicate a request function. If two features need the same endpoint, they import the same `api/*` function.

---

# Comments

Write self-documenting code. Only comment:

- A non-obvious backend contract detail (e.g. "organizationId is never sent — derived server-side from the JWT, see back/docs/TENANCY.md").
- A genuinely tricky algorithm (floor-plan layout math, date/timezone edge cases).
- The reason for a workaround, with a reference (issue, ADR, backend doc section).

Avoid comments that restate what the code already says.

---

# Error Handling

- Throw/return a typed error (`ApiError` from the API layer), never a bare `Error` or a raw string, for anything that crosses the network boundary.
- Every data-fetching hook surfaces `error` to its caller; no page may silently swallow a failed request.
- See `ERROR_HANDLING.md` for UI-level conventions (toasts vs. inline errors vs. empty states).

---

# Styling

Tailwind utility classes only, per `STYLING_GUIDELINES.md`. No inline `style={}` except for computed values that cannot be expressed as a class (e.g. floor-plan table `x`/`y`/`width`/`height` positioning, which already uses inline styles for exactly this reason).

---

# Internationalization

Every user-facing string goes through the `i18n` dictionaries (`src/i18n/en.ts`, `src/i18n/ar.ts`), added in the same change on both files. See `I18N_AND_RTL.md`.

---

# Testing

See `TESTING_STRATEGY.md` for the tooling to introduce and what must be tested. At minimum, any new `src/api/*` module and any non-trivial `lib/*` utility should ship with unit tests once the test runner exists.

---

# Linting & Type Checking

- `npm run lint` (oxlint) must pass with zero errors.
- `tsc -b` (via `npm run build`) must pass with zero errors.
- Do not disable a lint rule or add a `// @ts-ignore` to make a failure go away — fix the underlying issue. If a rule is genuinely wrong for this codebase, change it in `.oxlintrc.json` deliberately and note why in `DECISIONS.md`.

---

# Git

Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `perf:`, `ci:`, `build:`, `style:`, `chore:`. See `CHANGE_POLICY.md`.

---

# Quality Gates

Before considering any change complete:

- Lint passes.
- Type check passes.
- No direct network calls outside `src/api/`.
- No business logic inside `components/ui/*` or `pages/*`.
- English + Arabic both verified, including RTL.
- Documentation updated where the change affects architecture, API integration, or a recorded decision.

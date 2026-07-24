# COMPONENT_GUIDELINES.md

# Folder Meaning

- `components/ui/` — generic, reusable, presentational primitives with no domain knowledge (`Button`, `Card`, `Modal`, `Input`, `DataTable`, `StatCard`, `StatusBadge`, `EmptyState`, `FilterChip`, `PageHeader`, `Icon`, `Num`). These must work in any context given the right props; they never know what a "Reservation" is.
- `components/layout/` — app-shell composition (`Sidebar`, `Header`, `DashboardLayout`, `ContextBar`, `GlobalSearch`, `LiveServiceBar`, `NotificationPopover`, `QuickActionsBar`). May use context (auth, sidebar, locale) since the shell is inherently cross-cutting.
- `components/dashboard/`, `components/floor/` — domain-specific composite components tied to one feature area (dashboard home shortcuts, floor plan canvas/spatial rendering). New domain areas get their own subfolder here (or under `features/<area>/components` once `ARCHITECTURE.md`'s `features/` threshold is hit) rather than growing flat inside `components/`.
- `components/auth/` — route guards (`ProtectedRoute`, `PublicRoute`).

---

# Presentational vs. Container

`components/ui/*` are pure and prop-driven: no `api/*` imports, no `context/AuthContext`/`RestaurantContext` imports, no business-rule branching (e.g. a `StatusBadge` takes a `status` + `variant`/`color` prop rather than importing a domain enum and deciding its own color mapping for every possible domain status — keep the status→color mapping in the domain layer, pass the resolved variant in).

Everything else (`layout/`, `dashboard/`, `floor/`, and page-level components) can be a container: fetch/derive data via a hook and pass it down to `ui/` primitives.

---

# Building New UI Primitives

Before adding a new one-off styled `<div>` pattern inside a page, check `components/ui/` for an existing primitive that fits (`Card`, `DataTable`, `EmptyState`, etc.). Extend an existing primitive's props before creating a near-duplicate. Only add a new primitive when the visual/behavioral pattern will plausibly be reused, per the project's general "no premature abstraction" rule — a single, one-off layout doesn't need a new `ui/` component.

---

# Props & Composition

- Prefer `children`/composition over a large flat prop list for layout-like components.
- Prefer a small closed set of variants (e.g. `variant: 'primary' | 'secondary' | 'danger'`) over independent boolean flags that can combine into invalid states.
- Every component that takes a list of items handles the empty case explicitly (via `EmptyState`, not a blank render) — see `ERROR_HANDLING.md`.

---

# Accessibility

- Every interactive element (`button`, link, icon-only action) has an accessible name (`aria-label` when there's no visible text, e.g. icon-only buttons in `Header`/`Sidebar`).
- Modals (`Modal.tsx`) trap focus and are dismissible via `Escape` and an explicit close control — verify this remains true when extending `Modal`, don't reimplement modal behavior ad hoc elsewhere.
- Color must never be the only signal for status (`StatusBadge` pairs color with a text label — keep it that way for any new status-like indicator).
- Verify RTL (Arabic) rendering for any new component with directional content (icons that imply direction, padding/margin using logical properties) — see `I18N_AND_RTL.md` and `STYLING_GUIDELINES.md`.

---

# Reuse Over Duplication

If you find yourself copying a component and tweaking a few lines, stop and extract the shared piece first. Three near-identical `Card`-based layouts across `Dashboard`, `Reports`, and `Customers` pages should become one parameterized component, not three.

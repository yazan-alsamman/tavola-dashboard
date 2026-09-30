# COMPONENT_GUIDELINES.md

# Folder Meaning

- `components/ui/` — generic, reusable, presentational primitives with no domain knowledge (`Button`, `Card`, `Modal`, `ConfirmDialog`, `Input`, `DataTable`, `StatCard`, `StatusBadge`, `EmptyState`, `Tooltip`, `DropdownMenu`, `Drawer`, `CopyButton`, `FilterChip`, `PageHeader`, `Icon`, `Num`). These must work in any context given the right props; they never know what a "Reservation" is. `CopyButton` calls the toast context so the copied confirmation is the same everywhere. `Modal` reads the close label from the locale so the dismiss control is not stuck in English. Dates and numbers go through `src/lib/format.ts`.
- `components/layout/` — app-shell composition (`Sidebar`, `Header`, `DashboardLayout`, `GlobalSearch`, `LiveServiceBar`, `NotificationPopover`). May use context (auth, sidebar, locale) since the shell is inherently cross-cutting. The signed-in notice sets `--logout-leave-banner-h` to its measured height; the sticky header and sidebar offset from that variable. Below the large breakpoint, search and the restaurant/branch switcher open from icon buttons in `Header` and reuse `GlobalSearch` and the same selects — they are not a separate primitive.
- `components/floor/` — domain-specific floor-plan canvas tied to live table geometry. New domain areas get their own subfolder here (or under `features/<area>/components` once `ARCHITECTURE.md`'s `features/` threshold is hit) rather than growing flat inside `components/`.
- `components/auth/` — route guards (`ProtectedRoute`, `PublicRoute`).

---

# Presentational vs. Container

`components/ui/*` are pure and prop-driven: no `api/*` imports, no `context/AuthContext`/`RestaurantContext` imports, no business-rule branching (e.g. a `StatusBadge` takes a `status` + `variant`/`color` prop rather than importing a domain enum and deciding its own color mapping for every possible domain status — keep the status→color mapping in the domain layer, pass the resolved variant in).

Everything else (`layout/`, `dashboard/`, `floor/`, and page-level components) can be a container: fetch/derive data via a hook and pass it down to `ui/` primitives.

---

# Menu and marketing

Draft offers lead with Publish. Edit and delete sit in the overflow, and delete still confirms. The period is one date range. Offers, reviews, and menu items are cards below `md`. The gallery cover is a card with a max height and Replace on the image. New gallery photos go through a drop zone that shows upload progress and the error on the zone. Menu categories show a count. An item’s availability switch writes `availabilityMode` (`Always` or `Unavailable`). Saving a description sends that mode too, because the item update requires it. Windows are saved only after the mode is `Scheduled`. Reviews show the reviews-summary average when the analytics call returns one. Star filters apply to the current page, because the list call has no rating query. Reply is the row’s primary action.

# Service floor

The floor canvas is the page. Zoom, fit, snap, presets, and zones share one toolbar; zones collapse, and the selected table opens in `Drawer`. `FloorSaveStatus` is the save chip, including retry. The tables list uses `DataTableRowActions` (change status, then the overflow) and cards below `md`. The waiting list is the queue; add opens in `Drawer`. Walk-in starts from now and a party size.

# Operations screens

The home page has one loud metric: the count that needs a decision. Zeros stay quiet through `StatCard`. Next arrivals stay short, and each row links to the next step. A booking ticket leads with guest, party, time, table, and status; the reference is short, and the full id sits behind a disclosure with `CopyButton`. `ReservationActions` shows one primary button. Reject, no-show, and cancel use `ConfirmDialog`. Only cancel collects a reason, because only that call accepts one.

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

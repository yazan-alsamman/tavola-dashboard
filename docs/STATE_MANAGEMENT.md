# STATE_MANAGEMENT.md

# Categories Of State

Be deliberate about which bucket a piece of state belongs to — most avoidable complexity in this codebase will come from putting server data in Context or putting cross-cutting UI state in a page.

| Kind | Where it lives | Examples |
|---|---|---|
| Local UI state | `useState`/`useReducer` in the component | Modal open/closed, form field values, hover state |
| Cross-cutting app state | Context | Theme, locale, sidebar collapsed/expanded, toast queue, current auth session, active restaurant/branch selection |
| Server state (data owned by the backend) | A data-fetching hook backed by `src/api/*` | Reservations list, tables, branches, employees — anything that comes from `GET` and can go stale |
| Derived/computed state | Not stored at all — computed inline or via `useMemo` | Filtered reservation list, occupancy percentage |

---

# Context Usage Rules

Existing providers (`ThemeContext`, `LocaleContext`, `SidebarContext`, `AuthContext`, `RestaurantScopeContext`, `RestaurantContext`, `ToastContext`) are the right shape for genuinely cross-cutting concerns. Do not add a new Context for something only one feature needs — a custom hook local to that feature is almost always the better fit.

**`RestaurantScopeContext` (Phase 3)** owns authenticated restaurant/branch **selection/scope** only:

- accessible restaurant/branch lists (loaded for scope initialization)
- selected restaurant/branch IDs + minimal DTOs for shell presentation
- scope status / error / select / refresh

It must **not** become a home for reservations, tables, customers, reports, or unrelated mutations.

**`RestaurantContext` (legacy)** still holds mock operational entities until those features are API-wired. Do not add new server resources there.

Selection IDs may be persisted in `localStorage` as UX convenience only — always revalidate against backend-accessible lists (see ADR-005). Do not persist full restaurant/branch objects as an authorization mechanism.

Phase 3 does **not** introduce TanStack Query: a single provider-owned load of restaurants/branches does not cross the threshold below. Revisit when multiple feature pages share lists with refetch-after-mutation.

Phase 4 (reservations) also does **not** introduce TanStack Query (ADR-006): only availability search + Online create are live; there is no shared reservation list/detail cache yet.

Phase 5 **introduces TanStack Query** (ADR-007) for FloorPlan/Table inventory shared by Tables + Floor Plan pages. Phase 6 (ADR-008) adds mutation hooks that invalidate **captured** restaurant/branch/floor keys — never the currently selected UI scope after a mid-flight switch. Configure via `AppQueryProvider`. API modules remain free of React Query. Clear inventory queries on auth loss.

---

# Server State — Introduce A Query Library Before It Hurts

There is currently no data-fetching/cache library in this project (no React Query/SWR/RTK Query). Once more than a couple of pages need real API data with loading/error/refetch/cache behavior, introduce **TanStack Query** rather than hand-rolling `useEffect` + `useState` fetch hooks repeatedly across pages. Signs it's time:

- More than one page needs the same data (e.g. branches list used by both a branch switcher and the Branches page) and you'd otherwise fetch it twice or thread it through props.
- A page needs refetch-after-mutation behavior (e.g. reservation list refreshing after approve/reject).
- You're about to write a third bespoke `{ data, isLoading, error }` hook by hand.

Until then, a hand-written hook per resource is acceptable, but must still follow the consistent shape:

```ts
function useReservations(params: ReservationsQuery): {
  data: Reservation[] | undefined
  isLoading: boolean
  error: ApiError | null
  refetch: () => void
}
```

Do not introduce a query library and hand-rolled fetch hooks side by side for new code once the library is adopted — migrate the pattern wholesale for new work, and note the adoption decision in `DECISIONS.md`.

---

# Mutations

Every mutation (create/update/delete/domain action) should:

- Call the relevant `src/api/*` function (never inline `fetch`).
- Surface success via `ToastContext` (see `ERROR_HANDLING.md`).
- Invalidate/refetch the affected list/detail data rather than trusting stale local state to still be correct (e.g. approving a reservation should refresh the reservations list and the dashboard's today-stats, not just flip a local flag).

---

# Forms

No form library is currently in use (plain controlled `useState` per field). That's fine for the current form complexity (Login, Settings). If a form grows non-trivial cross-field validation or many fields (e.g. a full reservation-creation form with party size vs. table capacity vs. availability), consider a form library (e.g. `react-hook-form`) rather than hand-rolling growing validation logic — but don't add one preemptively for a two-field form.

---

# What Not To Do

- Don't put server data in `localStorage`/`sessionStorage` as a cache — that's a query library's job once introduced, and stale cached server data silently shown to the user is a correctness bug, not a convenience.
- Don't lift state to a Context "just in case a sibling needs it later" — pass it down as props, or wait until there's an actual second consumer.
- Don't duplicate the same server-fetched list in two different pages' local state — fetch once in a shared hook, or wait for the query library.

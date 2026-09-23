# Tavola Dashboard — Master Upgrade Audit

**Date:** 22 September 2026  
**Scope:** Restaurant dashboard at `D:\Tavola`, with the floor plan as the priority module.  
**Contract:** `postman/TAVLA-API.postman_collection (2).json` and `postman/_endpoint_inventory.json`. The client in `src/api` is what the app actually calls.

This audit was written from the repository before the floor-plan changes in this pass, then updated to record what those changes did and did not do.

---

## How the app is built

React 19, TypeScript, Vite, Tailwind v4, React Router 7, TanStack Query. One HTTP client (`src/api/client.ts`) unwraps `{ success, data }`, sends `Authorization: Bearer`, and refreshes once on `AUTH_EXPIRED_TOKEN`. Access token is memory-only. Refresh token is `localStorage` (`tavla-refresh-token`).

```text
Pages
  → components
  → hooks (TanStack Query)
  → src/api/*
  → backend /api/v1
```

Selected restaurant and branch come from `RestaurantScopeContext`. They are path ids, not a tenant header. Table identity is `tableId` from the server. The label staff see is `tableNumber`.

## Critical problems

| Problem | Evidence | Status after this pass |
| --- | --- | --- |
| No section/room entity | Floor-plan API is list, create, activate only. Tables have `indoor` / `vip` / `smoking` flags, not a section id | **BACKEND REQUIRED.** Not faked |
| Save failure was a single sentence with no retry | `FloorPlan.tsx` used an empty `catch` and `repositionFailed` | **Fixed.** Retry and Discard, server message via `mapInventoryMutationError` |
| Overlap was silent on manual drag | `boxesOverlap` was private and used only by auto-place | **Fixed as a warning.** Drop still saves |
| Duplicate would have cloned an id if done in the browser | No duplicate action existed | **Fixed.** `POST` create; UI selects `created.tableId` |
| Unused designer writes `localStorage` | `src/components/floor/designer/*` is not mounted by any page | **Not deleted this pass.** Still a trap if someone mounts it |
| Waitlist board is `sessionStorage` | `Waitlist.tsx` | Unchanged. Not a floor-plan defect |
| Staff actions use pasted ids | `Staff.tsx` | Unchanged |
| Full-body `PATCH /tables/:id` | `updateTable` sends the whole profile | Unchanged. Last write wins. `updatedAt` is not sent |
| Docs lag the code | `docs/API_INTEGRATION.md` still says merge/split are not live and refresh is `sessionStorage` | Unchanged docs. Merge/split are in Postman and in `Tables.tsx` |

No production floor path generates a UUID for a table. Creates return the server `tableId`.

## UX problems

- Adding a table is already a size preset plus a tap, or the create dialog. Staff never type a UUID.
- The inspector showed number, seats, and actions, but not position, flags, or the fact that status is not a reservation.
- A failed drag looked like a generic error and did not offer retry of the same coordinates.
- Overlapping tables looked the same as a clean layout.
- Calendar hour labels are still English-only (`Calendar.tsx`). Out of this floor pass.
- Tablet: pointer drag and 44px-class controls exist. Pinch zoom does not. Wheel zoom requires Ctrl/Cmd so normal scroll still pans the viewport.

## Architecture problems

- Live map: `FloorPlan.tsx` → `FloorPlanReadView` → `useInventoryMutations` → `tables.ts` / `floorPlans.ts`.
- Dead map: `FloorDesigner` + `FloorMapCanvas`. Local document, not the API.
- Geometry helpers live in `src/lib/floorGeometry.ts` (snap, size, chairs, overlap). That is the right split. API calls are not inside the glyph.

## Performance

Drag does not call the network until pointer-up. Zoom is CSS `scale` and is not written to `positionX` / `positionY`. Table lists walk pages (`listAllTablesByFloorPlan`, 100 per page, cap 50). Auto-place is one `PATCH` per table, sequential, and stops on the first failure.

## Source of truth

| Data | Owner |
| --- | --- |
| Floor plan name, active flag, id | Backend |
| Table id, number, capacity, shape, box, flags, status | Backend |
| Selection, drag preview, zoom, snap, preset | Frontend, discarded on refresh except what a successful mutation stored |
| Sections / rooms | **Do not exist.** Do not store them in the browser |

Refreshing the page reloads floor plans and tables. A position remains only if `PATCH /tables/:tableId` succeeded.

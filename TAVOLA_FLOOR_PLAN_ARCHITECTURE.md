# Tavola Floor Plan — Architecture

**Production path:** `src/pages/FloorPlan.tsx` → `src/components/floor/FloorPlanReadView.tsx` → `src/hooks/useInventoryMutations.ts` → `src/api/tables.ts` and `src/api/floorPlans.ts`.

The unused designer under `src/components/floor/designer/` is not this architecture. It must not be wired up as a second database.

## Real model

```text
Restaurant
  └── Branch
        └── Floor plan (named layout, one active per branch)
              └── Table (tableId from the server, tableNumber for staff)
```

There is no Section resource. `indoor`, `vip`, and `smoking` are flags on the table. `floor` is an optional number, not a second map.

Reservations are a separate module. The floor page does not load them. Structural status can be set to `Available | Occupied | Cleaning | Disabled`. The response may also carry `Reserved` or `Merged`; the dashboard displays them read-only.

## Layers

| Layer | Files | Owns |
| --- | --- | --- |
| API | `floorPlans.ts`, `tables.ts` | HTTP, DTO types |
| Server state | `useInventoryQueries.ts`, `useInventoryMutations.ts` | Cache keys, invalidation |
| Geometry | `floorGeometry.ts` | Snap (16px), size clamp 48–240, chairs, overlap, update body |
| Interaction | `FloorPlanReadView.tsx` | Drag, resize, place, zoom, wheel |
| Page | `FloorPlan.tsx` | Which plan, which table, dialogs, save failure, duplicate |
| Presentation | `FloorTableGlyph.tsx`, `FloorTableInspector.tsx`, `FloorLayoutToolbar.tsx` | What staff see |

## Coordinate model

One system: CSS pixels, origin top-left, `positionX`, `positionY`, `width`, `height`, `rotation`.

- Screen deltas are divided by the current zoom before they become world deltas (`toWorldDelta`).
- The world is `transform: scale(zoom)`. Saved fields are world pixels, not screen pixels.
- Fit-to-view and Ctrl/Cmd wheel zoom change `zoom` state only.
- `dir="ltr"` is set on the canvas so Arabic layout does not mirror X.

`null` position means unplaced. The table is listed under the map until a place action sends coordinates.

## Drag and save

```text
pointer down → local DragState
pointer move → preview only
pointer up    → PATCH /tables/:tableId with the full profile plus new box
success       → query invalidation, server row is canonical
failure       → banner with Retry and Discard; the cache is not overwritten
```

Retry sends the same overrides against the table currently in the query cache. Discard clears the banner. The canvas returns to the last successful server box because the page does not write the failed coordinates into the query cache.

## Identity

| | Field |
| --- | --- |
| Database | `tableId` (server) |
| Staff | `tableNumber` (`T1`, or whatever the form entered) |
| Duplicate | new `POST /tables` body, new `tableNumber` from `nextTableNumber`, position offset by 32px, then `setSelectedTableId(created.tableId)` |

Array indexes are not ids. The client does not mint `tableId`.

## Chairs

`chairAnchors` draws seats from `capacity` and `shape`. They are not stored. Capacity on the table is the number that matters for the API.

## What this architecture will not do

- Invent a section id and hide it in component state.
- Batch-save a layout. There is no batch endpoint. Each drop is one PATCH.
- Treat `FloorDesigner` localStorage as publish.

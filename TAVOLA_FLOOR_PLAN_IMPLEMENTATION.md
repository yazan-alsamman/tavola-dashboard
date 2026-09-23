# Floor Plan Implementation

**Date:** 23 September 2026

## What this pass did

The partition editor was **not** built. The API has no partition resource, and a local list would not reach the mobile app.

What did change:

- `src/lib/tableShape.ts` accepts only `Rectangle` and `Round`. Any other value is `unknown`.
- `FloorTableGlyph` draws a circle only for `Round`, a rounded rectangle only for `Rectangle`, and a dashed top when the value is unknown. It does not swap the two shapes.
- `src/lib/tableShape.test.ts` locks that mapping.

Existing behavior left in place, because it already matches the contract:

- Create and drop persist `positionX`, `positionY`, `width`, `height`, `rotation`, `shape`.
- Drag saves once on release. Failure shows Retry and Discard.
- Duplicate creates a new server table.
- Canvas is `dir="ltr"`. Zoom does not change stored coordinates.
- Chairs are drawn from `capacity`. They do not choose the shape.

## What mobile must do

Read the public floor plan `GET /discovery/.../floor-plan` or the table list, and draw each table from `shape`, `positionX`, `positionY`, `width`, `height`, and `rotation`.

Compare shape with the exact strings `Rectangle` and `Round`. Do not use `width === height`. Do not invent Window, Dining, Service, or Entrance. Do not assign a table to an area from its coordinates.

Those areas can be shown after the backend adds partitions and returns `partitionId` on the table. Until then, mobile and dashboard both show tables on the active floor plan.

## Error handling

Geometry save failure uses `mapInventoryMutationError` and does not write the failed box into the cache. Refresh shows the last successful server row.

## Tests

`src/lib/tableShape.test.ts`. Geometry tests remain in `src/lib/floorGeometry.test.ts`. The API → guest stage was checked live: `GET /discovery/.../floor-plan` returns the exact `shape` strings and box values the dashboard saved. The mobile rendering stage was not run here because the mobile project is not in this repo.

`TableStatusDto` now matches the response enum (`Reserved`, `Merged` added) and `TableDto` carries `isMergePrimary`. `allowedTableStatusTransitions` returns no transitions for `Reserved` and `Merged`, and the status request body is typed as `ManualTableStatusDto`.

# Floor Plan Sections — Implementation

**Date:** 23 September 2026

## Existing implementation

The live contract was read again from `https://api.tavola.business/api/v1/docs-json` (187 paths) before this change.

| Resource | Fields the server actually stores |
| --- | --- |
| Floor plan | `floorPlanId`, `branchId`, `name`, `isActive`, `createdAt`, `updatedAt` |
| Table | `tableId`, `floorPlanId`, `tableNumber`, `capacity`, `shape` (`Rectangle` \| `Round`), `positionX`, `positionY`, `width`, `height`, `rotation`, plus status and flags |

There is still no path, schema, or field named section, partition, zone, or area. Create floor plan accepts `{ name }` only. Update table cannot change `floorPlanId`; moving a table is `POST /tables/:tableId/move` with `{ targetFloorPlanId }`.

The production page is `src/pages/FloorPlan.tsx`. It already created named areas by creating floor plans (ADR-013) and edited one plan at a time.

## New architecture

```text
Restaurant
  └── Branch
        └── Floor plan   (the area: real id + name)
              └── Table  (floorPlanId)
```

That is the model the API can store. A rectangle drawn on the canvas is not part of it.

The page has two views of those same records:

| View | What the manager sees |
| --- | --- |
| All areas | Every floor plan as a labeled frame, tables inside the frame they belong to |
| One area | The existing editor: grid, zoom, fit, snap, place-by-tap, resize |

Tabs are navigation. **كل المناطق** shows the branch. A named tab opens that floor plan. The frames are not separate disconnected databases.

## Section lifecycle

**Create.** **إضافة منطقة** opens the existing name dialog and `POST .../floor-plans` with `{ name }`. The returned `floorPlanId` is what the UI keeps. There is no draw step: a drag rectangle would have nowhere to go, and showing “saved” after dropping it would be false.

**Name.** Any string the create endpoint accepts. Suggestions in the dialog are examples, not a fixed list.

**Color.** Not stored. Each frame uses a tint from `areaTint` so areas are easy to tell apart. The inspector says the color is not saved. There is no color picker.

**Geometry.** Not stored. `areaCanvasSize` grows the frame from the tables’ boxes, with a minimum so an empty area is still visible. Zoom on the single-area editor is a CSS scale and is not written back.

**Move / resize the frame.** Not available. Moving a table inside its frame updates `positionX` / `positionY` on pointer-up (`PATCH /tables/:id`). One request, not one per pixel.

**Duplicate.** Creates a new floor plan (`name` + ` 2`, ` 3`, …) and a new table row for each table, with a new table number. Ids are the ones the server returns.

**Delete.** Not available. The inspector says so. The server has no floor-plan delete, so the dashboard does not remove an area and leave its tables without a plan.

## Table relationship

A table belongs to the floor plan in `table.floorPlanId`.

Dragging a table onto another frame:

1. Highlight that frame.
2. On release, `POST /tables/:id/move` with that plan’s id.
3. Then `PATCH` the drop position in that plan’s own top-left coordinates.

If the move fails, the position is not patched. If the move succeeds and the position patch fails, the error stays on screen with retry. Membership is never guessed from `x` or `y`.

Creating a table while an area is open, or after one is selected on the all-areas view, preselects that floor plan.

## API mapping

| Action | Method | Path | Body |
| --- | --- | --- | --- |
| List areas | GET | `/restaurants/:restaurantId/branches/:branchId/floor-plans` | — |
| Add area | POST | same | `{ name }` |
| Show area to guests | PATCH | `.../floor-plans/:floorPlanId/activate` | none |
| List tables | GET | `.../tables` and `.../floor-plans/:floorPlanId/tables` | — |
| Add / duplicate table | POST | `.../branches/:branchId/tables` | profile + geometry + `shape` + `floorPlanId` |
| Move / resize table | PATCH | `/tables/:tableId` | full profile, including `shape`, `width`, `height`, `rotation` |
| Move table to another area | POST | `/tables/:tableId/move` | `{ targetFloorPlanId }` |

Guest read: `GET /discovery/restaurants/:restaurantId/branches/:branchId/floor-plan` returns the **active** floor plan only. Inactive areas are staff-only until the guest API returns every plan.

## UI flow

Nothing selected: the side panel is the restaurant overview (examples of names, then the real areas).

An area selected: name, table count, whether guests can see it, and the notes that size and color are not stored. Actions: open the area, show it to guests, duplicate. No delete button.

A table selected: number, capacity, shape, position, width, height, rotation, area, and the existing edit / move / duplicate / delete actions.

Save state, from the mutation, not from a timer:

| State | When |
| --- | --- |
| تم الحفظ | The canvas matches the last successful read or write |
| تعديلات غير محفوظة | A drag is in progress and has not been released |
| جاري الحفظ… | A create, update, or move request is in flight |
| فشل الحفظ | The request failed; retry or discard is on screen |

The single-area canvas no longer paints “Kitchen” or “Entrance”. Those words are not floor plans.

## Persistence

What survives refresh: floor plan id and name, which plan is active, and each table’s `floorPlanId`, `shape`, position, width, height, and rotation.

What does not survive, because it was never sent: frame rectangles, chosen colors, and any temporary drag preview.

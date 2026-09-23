# Floor Plan Audit

**Date:** 23 September 2026  
**Repo:** `D:\Tavola` (restaurant dashboard). The mobile app is not in this repository.  
**Contract:** `postman/_endpoint_inventory.json` and `postman/TAVLA-API.postman_collection (2).json`.

## Architecture

```text
FloorPlan.tsx
  → FloorPlanReadView + FloorTableGlyph
  → useInventoryQueries / useInventoryMutations
  → src/api/floorPlans.ts + src/api/tables.ts
  → PATCH/POST on the live API
```

Restaurant and branch ids come from `RestaurantScopeContext`. Table id is `tableId` from the server. The label is `tableNumber`.

An unused designer (`src/components/floor/designer/*`) writes `localStorage`. No page mounts it. It is not the floor customers see.

## Partitions

**Not implemented, because the API does not have them.**

Inventory of floor and table routes:

| Method | Path |
| --- | --- |
| GET, POST | `/restaurants/:restaurantId/branches/:branchId/floor-plans` |
| PATCH | `.../floor-plans/:floorPlanId/activate` |
| GET | `.../floor-plans/:floorPlanId/tables` |
| GET, POST | `.../branches/:branchId/tables` |
| GET, PATCH, DELETE | `/tables/:tableId` |
| POST | `/tables/:tableId/move`, `/status`, `/split`, `/tables/merge` |
| GET | `/discovery/restaurants/:restaurantId/branches/:branchId/floor-plan` (public) |

No list/create/update/delete for a partition. `TableDto` has no `partitionId`. Flags are `indoor`, `vip`, `smoking`.

The mobile screenshot (Window, Dining, Service, Entrance) is a drawing inside the mobile app. Those names are not returned by the dashboard and are not fields on the table.

## Tables and geometry

Create and drop send `positionX`, `positionY`, `width`, `height`, `rotation`, `shape`. Origin is top-left. Zoom is CSS scale and is not written back. Drag calls the API once on pointer-up.

`null` position means the table was never placed.

## Shape bug

Dashboard side, traced in this repo:

| Stage | Rectangle | Round |
| --- | --- | --- |
| Form options | `value="Rectangle"` | `value="Round"` |
| Create / update body | `shape: form.shape` or preset `shape` | same |
| `TableShapeDto` | `'Rectangle'` | `'Round'` |
| `FloorTableGlyph` | `data-shape="rectangle"`, `rounded-xl` | `data-shape="round"`, `rounded-full` |

The glyph does not use `if not round then rectangle` for unknown strings anymore. Only the exact contract values map. `RECTANGLE`, `ROUND`, `circle`, and `rect` stay `unknown` so they are not drawn as the other shape.

**This repo does not invert Rectangle and Round.**

The mobile app source is not here, so the renderer that swaps the shapes was not inspected. The likely failure, given this contract, is a client that compares a different string (`ROUND` / `circle` / `width === height`) and falls through to the other drawing. That has to be confirmed in the mobile project.

A second mismatch: `TableAvailabilityDto` (`GET /reservations/availability`) includes `shape` and does **not** include `positionX`, `positionY`, `width`, `height`, or `rotation`. A mobile screen that lays out the room from availability alone cannot place tables. The geometry is on the table resource and, for guests, on the public floor-plan read. **Verified 2026-09-23** against the live OpenAPI and live responses: `GET /discovery/.../floor-plan` returns `shape` (`Rectangle` | `Round`) and `positionX`, `positionY`, `width`, `height`, `rotation` per table, for the **active** floor plan only. Square `Rectangle` tables and `Round` tables can share the same box, so mobile must read `shape`.

## Risks

- Building Main Hall / Terrace in the dashboard now would be a second database. Mobile would still not receive them.
- Two editors can overwrite a table: update sends the full profile and does not send `updatedAt`.
- The unused designer must not be finished. It does not talk to the API.

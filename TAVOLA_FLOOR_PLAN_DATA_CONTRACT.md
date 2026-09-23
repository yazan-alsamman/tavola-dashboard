# Floor Plan Data Contract

Field names below are the ones in `src/api/tables.ts` and `src/api/floorPlans.ts`. They were re-checked against the live OpenAPI document (`https://api.tavola.business/api/v1/docs-json`, schemas `TableResponseDto`, `TablePublicResponseDto`, `FloorPlanWithTablesResponseDto`). Do not rename these fields in either client.

## Floor plan

| Field | Type | Notes |
| --- | --- | --- |
| floorPlanId | string | Server id. Not the name |
| branchId | string | Parent branch |
| name | string | Staff label. Create body is `{ name }` only |
| isActive | boolean | One active plan per branch. First create is activated by the server. Viewing does not activate |
| createdAt, updatedAt | string | |

No color, no box, no partition list.

## Partition

**Not in the contract.** No id, name, color, geometry, or sort field exists to document. See `TAVOLA_REMAINING_BACKEND_REQUIREMENTS.md`.

## Table

| Field | Type | Notes |
| --- | --- | --- |
| tableId | string | Server id. Never `tableNumber` |
| branchId | string | |
| floorPlanId | string | Which plan. Change it with `POST /tables/:tableId/move` `{ targetFloorPlanId }`, not with PATCH |
| tableNumber | string | Label such as `T5`. Unique per branch |
| capacity | number | Seats. Not the shape |
| shape | `Rectangle` \| `Round` | Exact Pascal-case strings. No other enum value is defined. A square table is `Rectangle` with `width == height` (OpenAPI). Never infer the shape from the box |
| positionX, positionY | number \| null | CSS pixels. Origin top-left. X right. Y down. Null = unplaced |
| width, height | number \| null | Same pixel space. Dashboard fills nulls with a preset or 80 before save |
| rotation | number \| null | Degrees. Not mirrored for Arabic |
| layer | number \| null | |
| floor | number \| null | Optional index. Not a second map and not a partition |
| indoor, vip, smoking | boolean | Flags. Not area membership |
| status | `Available` \| `Occupied` \| `Cleaning` \| `Disabled` \| `Reserved` \| `Merged` | Response enum. Staff can only set `Available` ↔ `Occupied`/`Cleaning`/`Disabled` via `POST /tables/:tableId/status`. `Reserved` and `Merged` are read-only in the dashboard |
| mergeGroupId | string \| null | Active merge group, or null |
| isMergePrimary | boolean | True only for the primary table of an active merge group |
| createdAt, updatedAt | string | |

There is no `partitionId`.

## Availability read (not the floor layout)

`TableAvailabilityDto`: `tableId`, `tableNumber`, `capacity`, `shape`, `isAvailable`. No coordinates. Do not use this payload to place tables on a map.

## Guest read

`GET /discovery/restaurants/:restaurantId/branches/:branchId/floor-plan`  
Public, unauthenticated. Response `FloorPlanWithTablesResponseDto`:

```text
{ floorPlan: { floorPlanId, branchId, name },
  tables: [ { tableId, floorPlanId, tableNumber, capacity, shape,
              floor, positionX, positionY, width, height, rotation, layer,
              indoor, vip, smoking } ] }
```

- Returns the branch's **active** floor plan only. Tables on an inactive plan are not visible to guests. `404 NOT_FOUND` when no plan is active.
- `shape` is the same `Rectangle` \| `Round` enum as the staff routes.
- No `status`, `mergeGroupId`, or `isMergePrimary` (customer-safe projection).

Live check on 2026-09-23: this endpoint returned the exact `shape` strings and box values for every published branch, including square `Rectangle` tables (80×80, 72×72) and `Round` tables with the same box. A client that decides round vs rectangle from `width == height` will draw them wrong.

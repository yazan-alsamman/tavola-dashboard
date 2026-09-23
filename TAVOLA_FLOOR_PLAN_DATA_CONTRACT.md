# Floor Plan Data Contract

Field names below are the ones in `src/api/tables.ts` and `src/api/floorPlans.ts`, which match the staff Postman routes. The public discovery response is not exemplified in Postman. Do not rename these fields in either client.

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
| shape | `Rectangle` \| `Round` | Exact Pascal-case strings. No other enum value is defined |
| positionX, positionY | number \| null | CSS pixels. Origin top-left. X right. Y down. Null = unplaced |
| width, height | number \| null | Same pixel space. Dashboard fills nulls with a preset or 80 before save |
| rotation | number \| null | Degrees. Not mirrored for Arabic |
| layer | number \| null | |
| floor | number \| null | Optional index. Not a second map and not a partition |
| indoor, vip, smoking | boolean | Flags. Not area membership |
| status | `Available` \| `Occupied` \| `Cleaning` \| `Disabled` | Structural. Not a reservation. No `Reserved` |
| mergeGroupId | string \| null | |
| createdAt, updatedAt | string | |

There is no `partitionId`.

## Availability read (not the floor layout)

`TableAvailabilityDto`: `tableId`, `tableNumber`, `capacity`, `shape`, `isAvailable`. No coordinates. Do not use this payload to place tables on a map.

## Guest read

`GET /discovery/restaurants/:restaurantId/branches/:branchId/floor-plan`  
Public. Envelope message: “Floor plan retrieved successfully.”  
Response fields are **not** documented in the collection example. Mobile must not assume a different shape enum until that JSON is confirmed. Staff writes use `Rectangle` and `Round`.

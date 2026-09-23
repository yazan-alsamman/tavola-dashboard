# Remaining Backend Requirements

Only items that cannot be done safely in the dashboard without inventing a contract. Confirmed absent from `src/api/floorPlans.ts` and from the floor-plans routes in `postman/_endpoint_inventory.json`.

## 1. Partitions / areas

```text
BACKEND REQUIRED
```

Searched `postman/_endpoint_inventory.json`, `src/api`, and the live OpenAPI document (187 paths, re-checked 2026-09-23). There is no partition, section, zone, or area resource. Table has no `partitionId`. Floor plan has `floorPlanId`, `branchId`, `name`, `isActive` only.

Do not store areas in the dashboard or the mobile app until these routes exist.

| | |
| --- | --- |
| Feature | Named areas inside one floor plan (Main Hall, Terrace, VIP, or any custom name), with color and optional box, and tables that belong to one area |
| List | `GET /restaurants/:restaurantId/branches/:branchId/floor-plans/:floorPlanId/partitions` |
| Create | `POST` same path. Body `{ name, color }` and, if the map should draw the area, `{ positionX, positionY, width, height, rotation }` using the same pixel space as tables |
| Update | `PATCH /partitions/:partitionId` |
| Delete | `DELETE /partitions/:partitionId` — must say what happens to tables |
| Response | Server `partitionId`, `floorPlanId`, `name`, `color`, geometry, timestamps |
| Table link | `partitionId` on create and update table, returned on `TableDto` |
| Why | Without this, mobile cannot know that T5 is on Terrace. Position must not be used to guess the area |

Until this exists, the dashboard saves tables on a floor plan. `indoor`, `vip`, and `smoking` are flags, not areas.

## 2. Floor-plan rename and delete

```text
BACKEND REQUIRED
```

| | |
| --- | --- |
| Purpose | Fix a bad plan name; remove an unused plan |
| Suggested method | PATCH and DELETE `/restaurants/:restaurantId/branches/:branchId/floor-plans/:floorPlanId` |
| Response | Updated plan, or 204. Delete must say what happens to tables |
| Why | Client only has list, create, and activate |

## 3. Optimistic concurrency on table update

```text
BACKEND REQUIRED
```

| | |
| --- | --- |
| Purpose | Stop two editors from last-write-wins on a full-body PATCH |
| Suggested | Accept `updatedAt` or a version and return 409 when it mismatches |
| Why | `TableDto.updatedAt` is returned and never sent back. The UI cannot claim two users are safe |

## 4. Reservation state on the map

```text
BACKEND REQUIRED
```

| | |
| --- | --- |
| Purpose | Show booked vs free for a service, not the manual Occupied flag |
| Suggested | A read that returns tableId plus availability for a date/time window |
| Why | `Reserved` appears in the response enum, but the API says it belongs to the reservation engine and is deferred. The floor page shows it when returned and never sets or infers it |

## Not required from the backend for the current editor

Duplicate, drag-save, retry, overlap warning, zoom, and fit all use create and update table as they already exist.

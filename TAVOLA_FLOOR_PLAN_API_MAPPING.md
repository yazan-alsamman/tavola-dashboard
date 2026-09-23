# Floor Plan API Mapping

Staff calls use the bearer token. Restaurant and branch ids come from the scope picker. Ids in responses are the canonical ids.

| Feature | Method | Endpoint | Request | Response used | Frontend |
| --- | --- | --- | --- | --- | --- |
| List floor plans | GET | `/restaurants/:restaurantId/branches/:branchId/floor-plans` | — | `{ items: FloorPlanDto[] }` | Plan dropdown |
| Create floor plan | POST | same | `{ name }` | `FloorPlanDto` | Create dialog |
| Activate floor plan | PATCH | `.../floor-plans/:floorPlanId/activate` | empty | `FloorPlanDto` | Activate button |
| Update floor plan | — | — | — | — | **Not in the API** |
| Delete floor plan | — | — | — | — | **Not in the API** |
| List partitions | — | — | — | — | **Not in the API** |
| Create partition | — | — | — | — | **Not in the API** |
| Update partition | — | — | — | — | **Not in the API** |
| Delete partition | — | — | — | — | **Not in the API** |
| List tables on a plan | GET | `.../floor-plans/:floorPlanId/tables?page&limit` | page, limit | `TableDto` pages | Canvas, walked up to 50 pages |
| List tables on a branch | GET | `.../branches/:branchId/tables?page&limit` | page, limit | `TableDto` pages | Tables page |
| Get table | GET | `/tables/:tableId` | — | `TableDto` | Not the main canvas |
| Create table | POST | `.../branches/:branchId/tables` | `floorPlanId`, `tableNumber`, `capacity`, `shape`, box, flags. No `status`. No `partitionId` | `TableDto` with new `tableId` | Preset tap, dialog, duplicate |
| Update table | PATCH | `/tables/:tableId` | Full profile including `shape` and box. No `floorPlanId`. No `status` | `TableDto` | Drop, resize, rotate, edit |
| Delete table | DELETE | `/tables/:tableId` | — | 204 | Confirm dialog |
| Move to another plan | POST | `/tables/:tableId/move` | `{ targetFloorPlanId }` | `TableDto` | Move dialog |
| Change status | POST | `/tables/:tableId/status` | `{ status }` | `TableDto` | Status dialog |
| Guest floor plan | GET | `/discovery/restaurants/:restaurantId/branches/:branchId/floor-plan` | — | Envelope only; body example missing | **Not called by the dashboard.** This is the public read for mobile |

Shape values on staff create and update are the strings `Rectangle` and `Round`. The dashboard does not send `ROUND`, `circle`, or a boolean.

Zoom, snap, and selection are not requests.

# Floor Plan Test Report

**Date:** 23 September 2026

## Automated

| Case | File | Result |
| --- | --- | --- |
| `Rectangle` stays rectangle | `src/lib/tableShape.test.ts` | Passed |
| `Round` stays round | same | Passed |
| `RECTANGLE`, `ROUND`, `circle`, `rect` are unknown, not the other shape | same | Passed |
| Snap, unplaced layout, overlap warning | `src/lib/floorGeometry.test.ts` | Passed |
| Canvas render | `src/components/floor/FloorPlanReadView.test.tsx` | Passed |

12 tests, 3 files, passed on 23 September 2026.

Command:

```text
npx vitest run src/lib/tableShape.test.ts src/lib/floorGeometry.test.ts src/components/floor/FloorPlanReadView.test.tsx
```

## Scenario that cannot pass yet

Create Main Hall and Terrace, put T1 Round and T2 Rectangle in Main Hall, put T3 Round on Terrace, refresh, open mobile, and see the same areas.

**Blocked.** There is no partition API and no `partitionId` on the table. Doing this in the dashboard would not be stored, so mobile could not read it.

## Shape and geometry scenario that the dashboard already supports

Create T1 with shape `Round` and T2 with shape `Rectangle` on a floor plan, move them, refresh the dashboard.

Expected on the next `GET` of that floor plan’s tables: the same `shape`, `positionX`, `positionY`, `width`, `height`, `rotation`, and `tableId`. This was verified by reading the create and update payloads, not by a logged-in click against production in this pass.

## Mobile

Not executed. The app is not in `D:\Tavola`. The screenshot of Window / Dining / Service with T5 in the corner does not match a client that places tables from `positionX` and `positionY`.

## Remaining

- Done 2026-09-23: `GET /discovery/.../floor-plan` returns `shape` and the box fields unchanged for every published branch (active plan only).
- Add partitions on the backend before the area editor and the mobile area list.

# Floor Plan Test Report

**Date:** 23 September 2026

## Automated

| Case | File | Result |
| --- | --- | --- |
| `Rectangle` stays rectangle, `Round` stays round, synonyms stay unknown | `src/lib/tableShape.test.ts` | Passed |
| Tables are grouped by `floorPlanId`, not by coordinates | `src/lib/floorAreas.test.ts` | Passed |
| A square rectangle keeps both sides; copy names do not collide | same | Passed |
| All-areas view shows Main Hall and Terrace; T2 is 180×80, rotated 30°, `data-shape="rectangle"`; T1 is `data-shape="round"` | `src/components/floor/FloorAreasOverview.test.tsx` | Passed |
| Area tabs and counts | `src/components/floor/FloorAreaTabs.test.tsx` | Passed |
| Canvas keeps physical left/top under RTL | `src/components/floor/FloorPlanReadView.test.tsx` | Passed |
| Snap, overlap, unplaced layout | `src/lib/floorGeometry.test.ts` | Passed earlier the same day |

Command for this pass:

```text
npx vitest run src/lib/floorAreas.test.ts src/lib/tableShape.test.ts src/components/floor/FloorAreasOverview.test.tsx src/components/floor/FloorAreaTabs.test.tsx src/components/floor/FloorPlanReadView.test.tsx
```

14 tests, 5 files, passed. `tsc -b` passed.

## What was exercised in the UI code

| Case | Result |
| --- | --- |
| All areas on one page | Implemented. Each block is a floor plan returned by list floor plans |
| Open one area | Tab switches to the existing editor (zoom, fit, grid, snap) |
| Add area | Existing create dialog, `POST { name }`, real `floorPlanId` |
| Draw a rectangle and save its bounds | **Not built.** Create floor plan has no geometry fields |
| Pick a color and save it | **Not built.** No color field. Tint is display-only |
| Delete an area that has tables | **Not built.** No delete floor plan route. The panel explains that |
| Duplicate an area | New floor plan plus new table rows. Not an id clone |
| Drag a table inside its area | Local until release, then `PATCH` position |
| Drop a table on another area | `POST /move`, then `PATCH` position. Failed move does not patch |
| Shape and box | Glyph uses `table.shape` only. Width, height, and rotation are copied on duplicate |
| Save status | Saving / unsaved while dragging / failed with retry / saved when the screen matches the last successful response |
| Hardcoded Kitchen / Entrance on the editor | Removed from `FloorPlanReadView` |

## Scenario that still cannot pass

Create drawn sections Main Hall, Terrace, Outdoor, and VIP on **one** floor plan, assign T1–T8, refresh, and see the same rectangles and colors on mobile.

**Blocked.** There is no section resource, no `sectionId`, and the guest floor-plan route returns only the active floor plan. Doing this with local rectangles would disappear on refresh and would never reach mobile.

What can be saved instead, with the current API:

1. Create four floor plans named Main Hall, Terrace, Outdoor, and VIP.
2. Create T1–T8 on those plans with the shapes in the brief.
3. Refresh the dashboard. Names, `floorPlanId`, `shape`, and the box come back from the API.
4. Move T5 with Move Table. Change its shape with Update Table. Refresh again.
5. Mobile shows only the plan marked for guests, with that plan’s `shape` and box. It will not show the other three areas until the guest API returns them.

This pass did not log into production and did not create that restaurant. The mobile app is not in this workspace, so the phone screen was not opened.

## Alignment

Align / distribute for a multi-selection was not added. The editor selects one table. The update endpoint can move tables one by one; a multi-select tool can sit on that later without a new resource.

# Tavola Implementation Changelog

**Date:** 22 September 2026  
**Area:** Floor plan editor. No new endpoints.

## Changed

| File | Change |
| --- | --- |
| `src/lib/floorGeometry.ts` | Exported `boxesOverlap` and `overlappingTableIds`. Auto-place still uses an 8px gap. Manual overlap uses gap 0 and is a warning only |
| `src/lib/floorGeometry.test.ts` | Covers overlap detection |
| `src/pages/FloorPlan.tsx` | Failed geometry save keeps the attempted box and shows Retry / Discard with `mapInventoryMutationError`. Duplicate calls `createTable` and selects the returned `tableId` |
| `src/components/floor/FloorPlanReadView.tsx` | Overlap warning line; glyphs receive an overlapping flag |
| `src/components/floor/FloorTableGlyph.tsx` | Warning ring when a table intersects another and is not selected |
| `src/components/floor/FloorTableInspector.tsx` | Position, flags, status note, Duplicate. Still does not show `tableId` |
| `src/i18n/en.ts`, `src/i18n/ar.ts` | Strings for overlap, retry, discard, duplicate, position, flags, status note |

## Unchanged on purpose

- Save-on-drop via `PATCH /tables/:tableId`. No per-pixel requests. No invented batch endpoint.
- Zoom and fit do not write coordinates. That behavior was already correct.
- Section create/update/delete. There is no section API.
- Floor-plan rename and delete. Not in the floor-plans controller.
- `FloorDesigner` and `FloorMapCanvas`. Still unused by routes. Left in place so this change does not delete a large unused tree in the same patch as editor behavior.
- Reservation coloring. `Reserved` is not a table status.
- Waitlist session board and staff id forms.

## Verification

`npx vitest run src/lib/floorGeometry.test.ts src/components/floor/FloorPlanReadView.test.tsx` — 2 files, 9 tests, passed.

Not run against a live API in this pass: create, drag, refresh, duplicate, and a forced 500. Those need a logged-in Owner session. The code path is the existing mutation plus the new failure banner.

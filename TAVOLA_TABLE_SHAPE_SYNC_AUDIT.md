# Table Shape Sync Audit

**Date:** 23 September 2026

Question: when the dashboard saves `Rectangle`, something shows `Round`, and the reverse. Where does the value change?

## Canonical values

The live API enum is exactly `Rectangle` and `Round` (`TableResponseDto.shape`, `CreateTableRequestDto.shape`, `UpdateTableRequestDto.shape`, `TablePublicResponseDto.shape`). A square table is `Rectangle` with `width == height`. The OpenAPI text says shape is presentation only and must not be inferred from the box.

One function interprets that enum for the production floor page: `normalizeTableShape` / `tableShapeKind` in `src/lib/tableShape.ts`.

| Input | Kind |
| --- | --- |
| `Round` | round (circle, chairs around the perimeter) |
| `Rectangle` | rectangle (rounded corners, chairs on the edges) |
| `ROUND`, `RECTANGLE`, `circle`, `rect`, anything else | unknown (dashed border, not drawn as the other shape) |

`FloorTableGlyph` is the only production table drawing. The all-areas view and the single-area editor both use it. Resize of a round table sets `height = width` through `tableShapeKind === 'round'`. A rectangle keeps width and height independent, including when they are equal.

## Trace

| Step | What happens | Inverts? |
| --- | --- | --- |
| Table creator and presets | Send `shape: 'Rectangle'` or `'Round'` | No |
| Drag, resize, duplicate, duplicate area | Copy `table.shape` unchanged | No |
| `POST /tables` and `PATCH /tables/:id` | The same `shape` string is in the body | No |
| Glyph | `data-shape` is `round` or `rectangle` from `tableShapeKind` only | No |
| Canvas | `dir="ltr"`. Zoom is CSS scale and is not stored | No |
| All-areas frames | Group by `floorPlanId`. Frame size uses width and height as a box, never as a shape | No |

The unused designer under `src/components/floor/designer/` uses `round` / `square` / `rect` and is not mounted by a page. It does not call the API.

## What the live API returns to mobile

`GET /discovery/.../floor-plan` includes `shape`, `positionX`, `positionY`, `width`, `height`, `rotation` on each public table. Examples read on 23 September 2026:

| Restaurant | Table | shape | width | height | rotation |
| --- | --- | --- | --- | --- | --- |
| seeki | T1 | Rectangle | 100 | 30 | 90 |
| seeki | T6 | Round | 64 | 64 | 0 |
| La Joya | T1 | Round | 80 | 80 | 0 |
| La Joya | T22 | Rectangle | 72 | 72 | 0 |

A square `Rectangle` and a `Round` table can both have equal width and height. A client that uses `width === height` draws La Joya T22 as a circle. That matches a swap whenever the restaurant’s rectangles are square.

Rotation is stored as sent (seeki T1 is `90`). This dashboard does not clear it or swap width and height on save.

## Where the inversion is

Not in this dashboard, and not in the guest payload. The mobile project is not in `D:\Tavola` or `D:\Tavola_platform`, so this pass cannot change the mobile renderer.

Mobile must read `shape` as `Rectangle` or `Round` and draw that shape at `width` × `height` with `rotation`. It must not derive shape from width, height, capacity, or table number.

## Fix in the dashboard

`normalizeTableShape` and `tableShapeKind`, tests in `src/lib/tableShape.test.ts`, the glyph, and the resize path. The all-areas overview test checks that a 180×80 rectangle stays a rectangle with its rotation, and that a round table is not given the rectangle marker.

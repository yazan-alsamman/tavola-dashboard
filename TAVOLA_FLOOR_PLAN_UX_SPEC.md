# Tavola Floor Plan — UX Specification

Audience: a restaurant owner or admin arranging a real room. Not a developer.

**Partitions (Main Hall, Terrace, VIP, custom names, colors) are not in this UI.** The API has no partition resource and no `partitionId` on a table. Drawing those boxes only in the dashboard would not show up on mobile. The editor below is the floor plan and its tables. Areas wait on the backend contract in `TAVOLA_REMAINING_BACKEND_REQUIREMENTS.md`.

## Mental model

A **floor plan** is a named layout for the selected branch. One plan is **active**. Opening another plan does not activate it. The Activate control is separate and only appears when the plan being viewed is inactive.

A **table** is a place guests sit. Staff know it by its number (`T12`). The system id stays hidden.

There are no saved rooms. Indoor, VIP, and smoking are properties of a table. A future section API can sit beside the plan list; it must not be drawn as if it already saves.

## Layout

```text
Floor Plan                          Create plan · Add table
[ Floor plan ▾ Main hall (Active) ]     12 tables · 3 occupied · 9 available

[ − 100% +  Fit ] [ Snap ] [ Round 2 ] [ Round 4 ] [ Rect 4 ] [ Rect 6 ] [ Rect 8 ]

┌──────────────────────────────────────┐  ┌─────────────────────┐
│ kitchen strip (label only)           │  │ T12                 │
│                                      │  │ 4 seats · Round     │
│           ( T1 )        [ T2 ]       │  │ Available           │
│                                      │  │ Position 128, 64    │
│ entrance strip (label only)          │  │ Indoor              │
└──────────────────────────────────────┘  │ Duplicate Edit …    │
                                          └─────────────────────┘
```

Kitchen and entrance strips are labels on the canvas. They are not sections and they are not saved.

## Add a table

1. Choose a size chip (round 2, round 4, rectangle 4, 6, or 8), then tap the floor.  
   Or use Add table and fill number, capacity, and shape in the dialog.
2. The server creates the row and returns `tableId`.
3. The table is drawn from that response after the list refreshes.
4. It can be dragged immediately.

Duplicate does the same create call with the next free number and a position 32 pixels down and to the right. It never reuses `tableId`.

## Move

Drag on the map. The table follows the pointer. Nothing is sent until release. Snap (16px grid) is on by default and can be turned off.

If the save fails, a banner says the save failed, shows the mapped server message, and offers **Retry** and **Discard**. Discard does not pretend the move stuck. The map shows the last saved box.

Zoom, fit, and Ctrl/Cmd + wheel change the view only.

## Overlap

If two tables intersect, they get a warning ring and a line of copy: the layout can stay. The drop is not rejected. Auto-place still avoids overlap when it packs unplaced tables.

## Inspector

Selecting a table shows number, capacity, shape, structural status, the plan name, position, and flags. Copy states that status is not today’s reservations. Actions: duplicate, edit, move to another plan, change status, delete (confirm). Resize and rotate stay on the inspector. The database id is not shown.

## Empty and errors

- No plans: empty state and create.
- No placed tables: hint to pick a size and tap.
- Load failure: retry, including a specific message when the role is forbidden.
- Employees who are not Owner or Admin see the map without edit controls (`useCanManageInventory`).

## Tablet

Drag uses pointer events and `touch-none` so the page does not scroll under a finger on the table. Buttons in the inspector use at least 44px height on the size controls. Pinch zoom is not implemented; use the zoom buttons. The inspector stacks under the map on small screens (`max-lg`).

## Out of scope until the API exists

Creating “Main Hall”, “Terrace”, and “VIP” as saved areas. Aligning a whole selection in one gesture. A single Save Layout button. Coloring tables from a reservation at 20:00.

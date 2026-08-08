# Integration Status — Postman Production Completion

**Date:** 2026-08-04  
**Contract:** `postman/TAVLA-API.postman_collection.json` (authoritative)

## Status

Restaurant Dashboard product surfaces are wired to live `src/api/*` clients + TanStack Query. Legacy `RestaurantContext` and `src/data/mockData.ts` are removed.

## Phase delivery

| Phase | Status |
|---|---|
| 0 Foundation (pagination, availability, query keys) | Done |
| 1 Wire existing pages (reservations, waitlist, notifications, walk-in, staff, merge/split) | Done |
| 2 Analytics + org subscription (Reports, Dashboard, Settings) | Done |
| 3 Menu management `/menu` | Done |
| 4 Offers + Reviews | Done |
| 5 Messaging inbox | Done |
| 6 Matrix / docs / lint / test / build | Done |

## Contract gaps (removed from product UI)

Surfaces with **no staff backend endpoint** were removed (not EmptyState placeholders):

- Customers directory
- Activity logs
- Special occasions
- Calendar (no calendar API)

Waitlist and Staff remain: they have join/promote/cancel and invite/role/branch/remove endpoints (no list/read roster — intentional session / manage-by-id UX).

Reservations list is ownership-only (not a branch inbox) — still uses `GET /reservations`.

## Out of scope (unchanged)

Customer Auth, Platform Admin, Discovery, Platform Subscriptions (folder 22), customer favorites, Prometheus metrics UI, customer review submit/image flows.

## Regenerating coverage

```bash
node scripts/build-compat-matrix.mjs
```

See `docs/API_COMPATIBILITY_REPORT.md`.

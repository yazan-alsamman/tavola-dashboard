# FULL_API_TEST_REPORT.md

> Live connectivity test of dashboard-relevant API endpoints against the Postman Production host.
> Complements manual Postman testing done on 2026-07-28.

**Date:** 2026-07-28  
**Base URL:** `http://187.127.76.76:3000/api/v1`  
**Working login:** `owner@bellavista.demo`  
**Result:** **29 passed / 1 expected fail** (placeholder `owner@example.com` from Postman env is invalid)

---

## Method

1. Health endpoints (no auth).
2. Login — tried Postman env `owner@example.com` (fails) then demo owner (succeeds).
3. Authenticated **reads** used by the dashboard scope: users, taxonomy, restaurants, branches, floor plans, tables, reservation availability + list, notifications.
4. Token refresh + logout.
5. Destructive DELETEs / create mutations were **not** run on production data in this automated pass (safe for shared server).

Re-run:

```bash
node scripts/full-api-test.mjs
```

---

## Results

| Status | HTTP | Method | Path | Notes |
|---|---:|---|---|---|
| PASS | 200 | GET | `/health` | db/redis/minio up |
| PASS | 200 | GET | `/health/liveness` | |
| PASS | 200 | GET | `/health/readiness` | |
| FAIL | 401 | POST | `/auth/login` | `owner@example.com` placeholder — expected |
| PASS | 200 | POST | `/auth/login` | `owner@bellavista.demo` |
| PASS | 200 | GET | `/auth/sessions` | |
| PASS | 200 | GET | `/users/me` | |
| PASS | 200 | GET | `/users/me/preferences` | |
| PASS | 200 | GET | `/cuisine-categories` | |
| PASS | 200 | GET | `/occasion-categories` | |
| PASS | 200 | GET | `/restaurants` | restaurant `e97df5d1-…` |
| PASS | 200 | GET | `/restaurants/:id` | |
| PASS | 200 | GET | `/restaurants/:id/settings` | |
| PASS | 200 | GET | `/restaurants/:id/working-hours` | |
| PASS | 200 | GET | `/restaurants/:id/gallery` | |
| PASS | 200 | GET | `/restaurants/:id/cuisine-categories` | |
| PASS | 200 | GET | `/restaurants/:id/occasion-categories` | |
| PASS | 200 | GET | `/restaurants/:id/branches` | branch `ea76853e-…` |
| PASS | 200 | GET | `/restaurants/:id/branches/:branchId` | |
| PASS | 200 | GET | `…/branches/:branchId/working-hours` | |
| PASS | 200 | GET | `…/floor-plans` | floor plan `7b18e4c2-…` |
| PASS | 200 | GET | `…/tables` (by branch) | table `fb6fbaf5-…` |
| PASS | 200 | GET | `…/floor-plans/:id/tables` | |
| PASS | 200 | GET | `/tables/:tableId` | |
| PASS | 200 | GET | `/reservations/availability` | |
| PASS | 200 | GET | `/reservations` | **list exists on backend** |
| PASS | 200 | GET | `/notifications` | |
| PASS | 200 | GET | `/notifications/unread-count` | |
| PASS | 200 | POST | `/auth/refresh` | |
| PASS | 204 | POST | `/auth/logout` | |

---

## Seed context discovered

| Resource | Id |
|---|---|
| Restaurant | `e97df5d1-5233-46a8-b217-10d391428aa2` |
| Branch | `ea76853e-91df-4519-ad8b-0fa20959f6b8` |
| Floor plan | `7b18e4c2-53b5-48f7-a45a-d79d6959cfcf` |
| Table | `fb6fbaf5-c6cd-465e-9044-fe1b4b4f621a` |

---

## Dashboard implication

Backend is ready for dashboard experiments. Important deltas vs older frontend assumptions:

| Endpoint | Backend | Dashboard `src/api` / UI |
|---|---|---|
| `GET /reservations` (list) | Live | Not wired yet (UI still shows list gap) |
| `GET /reservations/:id` | In Postman | Not wired |
| Notifications list/unread | Live | Still mock UI |
| Waitlist | In Postman | Still mock UI |

Update Postman environment `ownerEmail` / `ownerPassword` to the working demo account so env placeholders stop failing.

---

## Related

- `docs/INTEGRATION_STATUS.md` — wiring matrix  
- `scripts/full-api-test.mjs` — re-runnable harness  
- `.env.local` — proxy target `http://187.127.76.76:3000`

# Dashboard Endpoint Probe

**Date:** 2026-08-08  
**Base URL:** `https://api.tavola.business/api/v1`

## Verdict

| Area | Status |
|---|---|
| Health / liveness / readiness | PASS |
| Auth login (owner@bellavista.demo) | **BLOCKED** — `AUTH_TOO_MANY_SESSIONS` (max 10) |
| Scoped dashboard reads (reviews, offers, menus, analytics, …) | Not re-probed (login blocked) |

## Reviews page failure (root cause)

The Reviews UI called:

`GET /restaurants/:id/reviews?page=1&pageSize=20`

Live API rejects `pageSize` with **400 VALIDATION_ERROR** on list endpoints that expect **`limit`** (same as restaurants / branches / tables).

### Fix applied in `src/api`

| Module | Change |
|---|---|
| `reviews.ts` | send `limit` |
| `offers.ts` | send `limit` |
| `notifications.ts` | send `limit`; omit `unread=false` (boolean query string could fail validation) |
| `reservations.ts` | list + availability send `limit` |
| `messaging.ts` | `listConversations` send `limit` |

Hard-refresh the app after restart so the new client code loads.

## Session limit

Automated probes created many sessions. Login now returns:

`409 AUTH_TOO_MANY_SESSIONS — Maximum active sessions (10) exceeded.`

**To unblock:** open any still-logged-in dashboard tab → **Settings → Security → logout all sessions**, then log in once. Or revoke sessions from the backend.

## Earlier partial probe (before session lock)

When login still worked:

- PASS: health, login, sessions, users/me, preferences, taxonomy, notifications unread, org subscription/usage  
- FAIL: `GET /notifications?pageSize=…`, `GET /restaurants?pageSize=…` (fixed by switching to `limit`)

Regenerate after clearing sessions:

```bash
node scripts/probe-dashboard-api.mjs
```

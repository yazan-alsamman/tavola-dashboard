# ENVIRONMENT_SETUP.md

# Prerequisites

- Node.js (matching whatever the repo's `.nvmrc`/CI uses — if none exists yet, use a current LTS compatible with Vite 8 / React 19).
- Access to a running instance of the Tavla backend (`../back`), or its hosted URL, for anything beyond pure UI work against mock data.

---

# Install & Run

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build     # tsc -b && vite build
npm run preview
npm run lint       # oxlint
npm run test:run   # vitest run (API client / unit tests)
```

---

# Environment Variables

```
# .env.local (gitignored — never commit real credentials or internal hosts)

# Prefer same-origin path + Vite proxy when the API host does not allow localhost CORS:
VITE_API_BASE_URL=/api/v1
VITE_DEV_API_PROXY_TARGET=http://localhost:3000

# Or call a CORS-enabled / local backend directly:
# VITE_API_BASE_URL=http://localhost:3000/api/v1
```

A tracked `.env.example` documents the same variables with safe placeholders.

Rules:

- `src/api/client.ts` reads `import.meta.env.VITE_API_BASE_URL` via `getApiBaseUrl()`. Nothing else in the codebase constructs a base URL independently.
- `getApiBaseUrl()` accepts an absolute `http(s)` URL **or** a path starting with `/` (for same-origin Vite proxying).
- `VITE_DEV_API_PROXY_TARGET` is read only by `vite.config.ts` to proxy `/api` → that host during `npm run dev`. It is not a tenant override and is not used by production builds.
- Never commit a real backend host/IP to a tracked `.env` file. Keep `.env.local` gitignored (`.gitignore` ignores `.env` / `.env.*` except `.env.example`).
- The Postman environment (`../back/TAVLA-API.postman_environment.json`) may point at a shared remote `baseUrl` — treat that as a reference for Postman only; put whatever host you use in your local `.env.local`, not in source.

---

# Verifying Backend Connectivity

Before debugging a feature-level integration issue, confirm the backend itself is reachable:

```
GET {VITE_API_BASE_URL}/health
GET {VITE_API_BASE_URL}/health/liveness
GET {VITE_API_BASE_URL}/health/readiness
```

These are public, unauthenticated endpoints (see `API_INTEGRATION.md`) — a failure here means an environment/connectivity problem, not an application bug.

---

# CORS

Browsers enforce CORS when the page origin differs from the API host. Prefer asking whoever owns `../back` to allow the Vite origin (`http://localhost:5173`) for local work.

Until that is configured on a shared remote host, use the supported **Vite `/api` proxy** (`VITE_API_BASE_URL=/api/v1` + `VITE_DEV_API_PROXY_TARGET=<backend>`). The browser then calls same-origin `/api/v1/...`; Vite forwards to the backend. Do not disable CORS checks in the browser or invent client-side credential bypasses.

---

# Using The Postman Collection Locally

`../back/TAVLA-API.postman_collection.json` + `../back/TAVLA-API.postman_environment.json` can be imported directly into Postman/Insomnia to exercise the real API independently of the frontend — the fastest way to confirm an endpoint's actual request/response shape before wiring it into `src/api/*`. Update `baseUrl` in a local copy of the environment to point at whichever backend instance you're testing against.

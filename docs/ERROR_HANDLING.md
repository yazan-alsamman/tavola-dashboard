# ERROR_HANDLING.md

# Three States Every Data-Driven View Must Handle

Any component that renders server data must explicitly handle:

1. **Loading** — a skeleton or spinner, not a blank screen or a flash of empty content.
2. **Error** — a visible, actionable message, not a silent console log or a blank screen.
3. **Empty** — use the existing `EmptyState` component (`components/ui/EmptyState.tsx`, `icon` + `title` + optional `description`/`action`), not a bare "no data" string or an empty `<table>`.

A page that only handles the happy path is not done.

---

# Toasts vs. Inline Errors

`ToastContext` (`useToast()`, `toast(type, title, message?)` with `type: 'success' | 'error' | 'info' | 'warning'`) already exists and auto-dismisses after 4s. Use it for:

- Mutation results (a reservation was approved, a table status changed, a save succeeded/failed).
- Transient, non-blocking errors (a background refresh failed but stale data is still shown).

Use an inline error (within the component, near the affected field/section) for:

- Form validation errors — tie them to the specific field, don't just toast "Validation failed."
- A primary data-fetch failure that leaves the whole view unable to render (e.g. the reservations list itself failed to load) — show a retry affordance in place of the list, not just a toast that scrolls away.

---

# Mapping Backend Error Codes To UI

Per `API_INTEGRATION.md`, every API error carries a stable `code`. Branch UI behavior on `code`, not on the free-text `message` (which may change wording or need translation). Suggested handling by category:

| Code(s) | UI behavior |
|---|---|
| `AUTH_INVALID_TOKEN`, `AUTH_EXPIRED_TOKEN` | `AUTH_EXPIRED_TOKEN` is handled by the API client's single refresh-and-retry (see `API_INTEGRATION.md`). `AUTH_INVALID_TOKEN` is not refreshable — treat as forced logout. If either surfaces to the UI after the client has given up, force logout. |
| `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`, `AUTH_ACCOUNT_SUSPENDED`, `AUTH_EMAIL_NOT_VERIFIED`, `AUTH_TOO_MANY_SESSIONS` | Inline error on the login form via translated keys in `t.login.errors.*` (see `Login.tsx` code→message map). `RATE_LIMIT_EXCEEDED` and `VALIDATION_ERROR` are also mapped there. |
| `VALIDATION_ERROR` | Inline, per-field errors from the `errors` array — never a single generic toast when field-level detail is available. Inventory forms use `extractValidationFieldErrors` + `mapInventoryMutationError`. |
| `CONFLICT` | Inventory create/update (e.g. duplicate `tableNumber` within branch) — form-level translated conflict message. |
| `FORBIDDEN` | Toast + no-op for mutations. For restaurant/branch **scope** load, `ScopeGate` shows a dedicated forbidden empty state (Owner/Admin list endpoints) — not a crash. See `AUTH_AND_RBAC.md`, "UI Gating Is Not Enforcement." |
| `NOT_FOUND` | Navigate to an empty/not-found state for that resource, not a raw error screen. |
| `RESERVATION_CONFLICT`, `TABLE_UNAVAILABLE`, `PARTY_SIZE_EXCEEDS_CAPACITY`, `RESERVATION_RESCHEDULE_WINDOW_EXPIRED` | Inline, specific error on the reservation form/action — these are expected business-rule outcomes, not exceptional failures, and deserve a clear explanation, not a generic "something went wrong." |
| `IDEMPOTENCY_KEY_CONFLICT` | "This request may have already completed — refreshing," then refetch, per `API_INTEGRATION.md`. |
| `RATE_LIMIT_EXCEEDED` | Toast asking the user to wait/retry shortly. |
| `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `INVALID_FILE`, `STORAGE_UNAVAILABLE` | Inline error on the upload control. |
| Anything else / `UNKNOWN_ERROR` | Generic toast ("Something went wrong, please try again"), and log the code (not the raw message, not any token) for debugging. |

Any new code introduced by the backend should be added to this table (and to the canonical list in `API_INTEGRATION.md`) in the same change that starts handling it — don't let an unhandled code silently fall through to a confusing generic message without at least being deliberate about that choice.

---

# What Never To Do

- Never swallow a caught error with an empty `catch {}`.
- Never log a raw error response, token, or password to the console — log the `code` and a correlation id if available, per the security rules in root `CLAUDE.md`.
- Never show a raw, untranslated backend `message` string as the only feedback for an error the UI could handle more specifically (see table above) — but a generic fallback showing the backend's `message` is acceptable for the true "unknown error" case, since the backend already writes it as user-facing copy.

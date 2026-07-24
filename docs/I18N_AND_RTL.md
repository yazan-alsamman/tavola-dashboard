# I18N_AND_RTL.md

# Mechanism

`LocaleContext` (`src/context/LocaleContext.tsx`) holds the active locale (`'en' | 'ar'`), persisted to `localStorage` (`tavla-locale`). On change it sets `document.documentElement.lang` and `document.documentElement.dir` directly — this is what drives RTL layout, not a per-component flag. `useLocale()` exposes `{ locale, t, toggleLocale, setLocale, isRTL }`.

`t` is the fully-typed translation object for the active locale (`TranslationKeys`, inferred from `src/i18n/en.ts`), organized as nested namespaces (`t.nav.dashboard`, `t.common.save`, etc.). `src/i18n/ar.ts` must implement the exact same shape as `en.ts` — it's typed against `TranslationKeys`, so a missing key is a type error, not a silent fallback.

---

# Rules

- Every user-facing string goes through `t`, added to **both** `en.ts` and `ar.ts` in the same change. Never ship an English-only string, even temporarily.
- Never hardcode a locale check (`if (locale === 'ar') ...`) to pick different copy inline in a component — add the key to both dictionaries instead. `if (isRTL)` is fine for *layout* branching (rare, since logical CSS properties should handle most cases — see below), not for picking text.
- Keep the namespace structure flat and purposeful (`nav`, `common`, and one namespace per feature area) — mirror the existing pattern in `en.ts` rather than inventing a new organizing scheme per feature.
- Date/number formatting must be locale-aware (`date-fns` locale support, or `Intl.NumberFormat`/`Intl.DateTimeFormat` with the active locale) — don't format a date with an implicit English-only pattern that will look wrong mirrored/read in Arabic.

---

# RTL Is Layout, Not Just Text Direction

Because `dir` is set on `<html>`, most layout mirroring should happen automatically through the browser plus Tailwind's logical properties (see `STYLING_GUIDELINES.md`: `ps-*`/`pe-*`, `ms-*`/`me-*`, `start-*`/`end-*` instead of `pl-*`/`pr-*`, `left-*`/`right-*`). Things that do **not** flip automatically and need explicit handling:

- **Icons implying direction** (chevrons, arrows, "next/previous" controls) — must be explicitly mirrored or swapped when `isRTL`, not left pointing the wrong way.
- **Charts** (Recharts) — axis order and any directional annotation may need explicit RTL handling; verify visually, don't assume the library mirrors itself.
- **The floor plan canvas** (`components/floor/FloorMapCanvas.tsx`, `FloorMapSpatial.tsx`) — table `x`/`y` coordinates are absolute pixel positions tied to a physical floor layout, not logical/flow layout. These must **not** be mirrored by RTL — a table's real-world position doesn't change because the UI language changed. Any RTL handling here should be limited to surrounding chrome (labels, legends), never the coordinate system itself.

---

# Testing A Change

Any UI change must be visually checked in both `en` (LTR) and `ar` (RTL) via `toggleLocale()` before considering the change done — this is called out explicitly in the root `CLAUDE.md` checklist because it's easy to verify only the default locale and ship a broken mirror.

---

# Fonts

Arabic text should render with `font-arabic` (`Noto Sans Arabic`, see `STYLING_GUIDELINES.md`), not the default `font-sans`. If a component hardcodes a font class, make sure it doesn't fight the locale-driven default.

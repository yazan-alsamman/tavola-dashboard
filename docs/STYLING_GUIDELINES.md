# STYLING_GUIDELINES.md

# Tailwind v4, Token-Driven

Styling is Tailwind CSS v4 utility classes, driven by the design tokens defined in `src/index.css` under `@theme`. No CSS-in-JS, no separate stylesheet per component, no inline `style={}` except for computed/dynamic values that cannot be a static class (the floor plan canvas's per-table `x`/`y`/`width`/`height` positioning is the existing, legitimate example).

---

# Use Tokens, Not Raw Values

`src/index.css` defines a Material 3-derived palette as Tailwind theme variables (`--color-primary`, `--color-surface`, `--color-on-surface`, `--color-outline`, `--color-error`, etc.) plus legacy aliases actually used across the app (`--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, and their `-light`/`-hover` variants). Always style against these tokens (e.g. `bg-surface`, `text-text-secondary`, `border-border`) rather than arbitrary hex values or Tailwind's default palette (`bg-purple-600`, etc.) — a new arbitrary color breaks dark mode and the mauve brand identity.

If a needed color truly doesn't exist yet, add it to the `@theme` block in `index.css` first, then use the generated utility — don't reach for an arbitrary Tailwind value (`bg-[#123456]`) as a shortcut.

---

# Dark Mode

Dark mode is a `.dark` class toggle (`@custom-variant dark (&:where(.dark, .dark *));`), driven by `ThemeContext`. Every new component must be checked in both modes — because tokens are theme-aware CSS variables, most components get this for free by using tokens instead of raw colors, but always verify visually rather than assuming.

---

# Status Colors

`StatusBadge` and any status-like indicator use the semantic tokens (`success`, `warning`, `danger`, `info`) mapped from the domain status, not one-off colors per screen. When the real backend enums are wired in (see `API_INTEGRATION.md`'s type-reconciliation table), the status→color mapping lives in one place (e.g. alongside the domain type or in a small `lib` mapping function), not copy-pasted per page.

---

# Layout & Responsiveness

- Mobile-first, using Tailwind's default breakpoints (`sm`, `md`, `lg`, `xl`) — verify desktop, tablet, and mobile per the project's stated responsiveness goal (see root `README.md`).
- Prefer Flexbox/Grid utilities over fixed pixel widths for anything that needs to adapt.

---

# RTL

Arabic is a fully supported, mirrored layout, not just translated text. Use logical Tailwind properties (`ps-*`/`pe-*`, `ms-*`/`me-*`, `start-*`/`end-*`) instead of physical ones (`pl-*`/`pr-*`, `left-*`/`right-*`) wherever a value should flip between LTR and RTL. See `I18N_AND_RTL.md` for the direction-switching mechanism and what still needs manual handling (icons implying direction, charts, the floor-plan canvas).

---

# Component Styling Conventions

- Use `clsx`/`tailwind-merge` (`cn` in `lib/utils.ts`) to compose conditional class strings — don't hand-concatenate template strings for class names.
- Keep class lists on one element readable; if a component's className string becomes unwieldy, that's a sign that a smaller sub-component (in `components/ui/`) is missing, not a signal to move styles into CSS.

---

# Fonts

`Inter` for Latin, `Noto Sans Arabic` for Arabic content (`--font-sans` / `--font-arabic`). Arabic-rendered surfaces should pick up `font-arabic` automatically via the locale-driven direction/font switch — don't hardcode `font-sans` on text that must render Arabic.

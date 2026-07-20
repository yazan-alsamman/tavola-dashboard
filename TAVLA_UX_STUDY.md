# Tavla Dashboard — UX Study & Development Roadmap

> A complete UX audit, design philosophy, and staged improvement plan for the Tavla restaurant dashboard — the control panel every restaurant in Damascus will use to run service.

**Version:** Stage 1 Complete (July 2026)  
**Audience:** Product, design, and development teams

---

## 1. UX Vision

### The core question

> *"Can a receptionist seat the next guest in under 10 seconds during Friday night rush?"*

Tavla is not a generic admin panel. It is a **service command center** where:

- Reservations arrive from the **customer mobile app** (table selected, occasion requested, notes included)
- Staff **confirm, seat, and complete** guests without friction
- **Walk-ins** and **waitlist** guests are handled in the same visual language
- The **floor plan** is the mental model — not a spreadsheet

### Design principles

| Principle | Meaning |
|-----------|---------|
| **Operations first** | Tonight's service beats monthly analytics on the home screen |
| **One glance, one action** | Status + next step visible without drilling down |
| **Forgiving under pressure** | Large touch targets, confirm dialogs, undo-friendly flows |
| **Respect Arabic staff** | Full RTL, Noto Sans Arabic, no hardcoded English in ops paths |
| **Feel alive** | Live clock, relative times, toast feedback — not a frozen prototype |
| **Elegant restraint** | Mauve + white, generous whitespace, no visual noise |

---

## 2. User Personas & Jobs-to-be-Done

### Receptionist / Host (primary UX focus)

**Arrives at stand with tablet. Needs to:**

1. See who is coming in the next 90 minutes
2. Approve pending app reservations instantly
3. Check in and seat confirmed guests
4. Register walk-ins and assign tables
5. Move waitlist guests when tables free up
6. Glance at floor plan for availability

**Pain if UX fails:** Long queues, double-booked tables, angry guests, staff stress.

### Restaurant Manager

**Needs:** Today's occupancy, pending approvals, occasion prep, staff overview.  
**Uses:** Dashboard, Reports, Special Occasions — less frequently during service.

### Owner

**Needs:** Multi-branch view, settings, staff, analytics.  
**Uses:** Admin section — mostly outside service hours.

---

## 3. Complete Dashboard Audit

### What existed before Stage 1

| Area | State | Problem |
|------|-------|---------|
| Login | Missing | No sense of "restaurant account" |
| Data | Static mock | Buttons did nothing |
| Dashboard | 7 stat cards + widgets | Analytics wall, not action center |
| Navigation | 15 flat items | Overwhelming for reception |
| Search | Decorative | Critical for phone/name lookup |
| Reservations | No today filter | Mixed dates, no inline actions |
| Walk-in | Form stub | Could not seat anyone |
| Waitlist | Buttons dead | Broken loop |
| Floor plan | View only | Could not change table state |
| Notifications | Separate page only | No in-context alerts |
| i18n | Partial | English strings in ops screens |
| Time | Hardcoded July 13, 2026 | Felt like a demo, not live ops |

### What was removed or deprioritized

| Removed / Hidden | Reason |
|------------------|--------|
| Second row of stat cards on dashboard | Redundant; merged into compact strip |
| Notifications from main sidebar | Moved to header popover |
| Non-functional Export / Filter buttons | False affordances |
| Equal weight for all 15 nav items | Split into Operations / Management / Admin |
| Trend percentages on home dashboard | Manager metric, not reception |

### What was added in Stage 1

| Feature | File(s) | Impact |
|---------|---------|--------|
| Login page | `pages/Login.tsx` | Restaurant account entry |
| Auth guard | `context/AuthContext.tsx`, `ProtectedRoute.tsx` | Secured dashboard shell |
| Live state | `context/RestaurantContext.tsx` | Working confirm/check-in/seat/cancel |
| Toast feedback | `context/ToastContext.tsx` | User knows action succeeded |
| Operations dashboard | `pages/Dashboard.tsx` | Pending approvals, arriving soon, seated |
| Live service bar | `components/layout/LiveServiceBar.tsx` | Clock, service period, occupancy |
| Quick actions bar | `components/layout/QuickActionsBar.tsx` | Walk-in, waitlist, floor, reservations |
| Global search ⌘K | `components/layout/GlobalSearch.tsx` | Find guest in 2 keystrokes |
| Notification popover | `components/layout/NotificationPopover.tsx` | Alerts without leaving page |
| Branch switcher | `components/layout/Header.tsx` | Multi-location context |
| Grouped sidebar | `components/layout/Sidebar.tsx` | Operations / Management / Admin |
| Filter chips | `components/ui/FilterChip.tsx` | Today / Pending / Seated |
| Confirm dialogs | `components/ui/Modal.tsx` | Safe destructive actions |
| Working walk-in | `pages/WalkIn.tsx` | Seat guest → updates floor |
| Working waitlist | `pages/Waitlist.tsx` | Assign → seat → remove |
| Floor plan actions | `pages/FloorPlan.tsx` | Mark available, out of service, seat walk-in |
| Inline reservation actions | `pages/Reservations.tsx` | Check-in without detail page |
| Dynamic dates | `lib/utils.ts` | Demo data maps to today |

---

## 4. Information Architecture (New)

```
LOGIN
  └── Dashboard (Command Center)
        ├── OPERATIONS (sidebar group)
        │     ├── Dashboard — live ops overview
        │     ├── Reservations — tonight's bookings + inline actions
        │     ├── Floor Plan — visual seating
        │     ├── Waitlist — queue management
        │     ├── Walk-In — immediate seating
        │     └── Calendar — timeline view
        │
        ├── MANAGEMENT
        │     ├── Customers
        │     ├── Special Occasions
        │     └── Tables (admin config)
        │
        └── ADMINISTRATION
              ├── Staff
              ├── Reports
              ├── Branches
              ├── Settings
              └── Activity Logs

HEADER (always visible)
  ├── Global search (⌘K)
  ├── Branch switcher
  ├── Language (EN / AR)
  ├── Theme (light / dark)
  ├── Notifications popover
  └── Profile + logout

QUICK ACTIONS (below header, every page)
  Walk-In · Waitlist · Floor Plan · Reservations
```

---

## 5. Critical User Flows

### Flow A: Mobile app reservation → seated guest

```
Customer books on app (table, time, occasion, notes)
        ↓
Dashboard "Needs Action" widget shows PENDING reservation
        ↓
Receptionist taps [Confirm] — status → confirmed, table → reserved
        ↓
Guest arrives → [Check In] on list or detail — status → seated, table → occupied
        ↓
Meal ends → [Complete] — table → available
```

### Flow B: Walk-in guest

```
Guest arrives without reservation
        ↓
Quick Action → Walk-In
        ↓
Enter name, party size → tap available table on grid
        ↓
[Seat Guest] → reservation created as seated, table occupied
        ↓
Redirect to floor plan — visual confirmation
```

### Flow C: Waitlist → table

```
No tables available → Walk-In [Add to Waitlist]
        ↓
Waitlist page shows queue position
        ↓
Table frees up → [Assign Table] → pick table in modal
        ↓
Guest seated, removed from waitlist
```

### Flow D: Floor plan operations

```
Open Floor Plan → tap table
        ↓
Side panel: current/next reservation, capacity, section
        ↓
Actions: Mark Available · Seat Walk-In · Out of Service
```

---

## 6. Screen-by-Screen UX Specification

### Login
- Split layout: brand story (left) + sign-in (right)
- Shows restaurant name/logo — reinforces multi-tenant ("this is YOUR restaurant")
- Demo credentials hint for development

### Dashboard (Command Center)
- **Live Service Bar:** time, lunch/dinner period, covers, occupancy, pending pulse
- **Compact stats:** 4 tiles only (reservations, guests, occupancy, waitlist)
- **Needs Action:** pending app reservations with one-tap confirm
- **Arriving Soon:** next 90 minutes with quick check-in
- **Currently Seated:** who's on the floor now
- **Waitlist snapshot:** queue at a glance
- **Today's Occasions:** cake/flowers prep reminders

### Reservations
- Default filter: **Today**
- Chips: Today · Pending · Confirmed · Seated · All
- Columns prioritized: Time → Customer → Table → Status → Actions
- Inline confirm/check-in buttons — no page navigation required

### Reservation Detail
- Customer name + status badge as hero (not buried below header)
- Clickable phone number (`tel:` link)
- Occasion card highlighted when present
- Contextual primary action (only one dominant button)
- Confirm dialog for cancel/reject

### Floor Plan
- Color-coded tables with legend
- Responsive positioning (percentage-based)
- Side panel with ops actions
- Link to reservation from current/next blocks

### Walk-In
- Form + visual table picker side-by-side
- Tap table card to pre-select
- Seat or waitlist in one screen

### Waitlist
- Queue position #1 highlighted
- Call · Assign · Remove per card
- Assign modal filters tables by capacity

---

## 7. What's Still Missing (Stage 2+)

### Stage 2 — Backend & Real-time
- [ ] API integration replacing `RestaurantContext` local state
- [ ] WebSocket: new reservation pushes to dashboard instantly
- [ ] Sound/vibration alert for new pending reservations
- [ ] Multi-tenant auth (real JWT, restaurant isolation)
- [ ] Role-based UI hiding (receptionist vs owner)

### Stage 3 — Advanced Operations
- [ ] Drag-and-drop calendar rescheduling
- [ ] Floor plan editor (drag tables to position)
- [ ] Reassign table modal with live availability
- [ ] Change time modal
- [ ] No-show marking with customer history flag
- [ ] SMS/call integration for waitlist

### Stage 4 — Polish & Delight
- [ ] Skeleton loading states
- [ ] Optimistic updates with rollback
- [ ] Keyboard shortcuts beyond search (C = confirm, etc.)
- [ ] Print-friendly reservation list
- [ ] Onboarding tour for new staff
- [ ] Reduced-motion preference
- [ ] PWA / offline queue for spotty WiFi

### Stage 5 — Multi-branch & Scale
- [ ] Per-branch floor plans and staff
- [ ] Cross-branch reporting for owners
- [ ] Custom domain per restaurant (`naranj.tavla.sy`)

---

## 8. Competitive Reference

| Platform | Strength | Tavla differentiation |
|----------|----------|----------------------|
| OpenTable | Mature host tools | Damascus-first, Arabic RTL, local occasion culture |
| Resy | Clean floor visualization | Mauve brand, mobile-app-first booking flow |
| SevenRooms | CRM depth | Simpler ops focus for independent restaurants |
| Toast | POS integration | Reservation-first, lighter weight |

**Tavla's edge:** Built for how Damascus restaurants actually operate — Arabic staff, walk-ins alongside app bookings, birthdays and engagement celebrations as first-class features.

---

## 9. Accessibility & Responsive Checklist

| Requirement | Stage 1 | Target |
|-------------|---------|--------|
| RTL layout | ✅ | Maintain |
| Touch targets ≥ 44px on floor plan | ⚠️ Partial | Stage 2 |
| Keyboard navigation on tables | ❌ | Stage 3 |
| Screen reader labels on actions | ⚠️ Partial | Stage 2 |
| Mobile search always visible | ✅ | Done |
| Tablet landscape floor plan | ✅ | Done |
| Dark mode | ✅ | Done |

---

## 10. How to Experience Stage 1

```bash
npm install
npm run dev
```

1. Open **http://localhost:5173/login**
2. Sign in with any email/password (demo mode)
3. On **Dashboard**, confirm a pending reservation (Sara Khoury)
4. Use **Quick Actions → Walk-In** to seat a guest
5. Open **Floor Plan** — see table turn green/red
6. Toggle **AR** in header for RTL experience
7. Press **⌘K** to search reservations

---

## 11. Files Changed in Stage 1 UX Overhaul

### New files
- `src/context/AuthContext.tsx`
- `src/context/RestaurantContext.tsx`
- `src/context/ToastContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/layout/QuickActionsBar.tsx`
- `src/components/layout/GlobalSearch.tsx`
- `src/components/layout/NotificationPopover.tsx`
- `src/components/layout/LiveServiceBar.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/FilterChip.tsx`
- `src/pages/Login.tsx`
- `TAVLA_UX_STUDY.md` (this file)

### Major updates
- `src/pages/Dashboard.tsx` — operations command center
- `src/pages/Reservations.tsx` — filters + inline actions
- `src/pages/ReservationDetail.tsx` — working lifecycle
- `src/pages/WalkIn.tsx` — functional seating
- `src/pages/Waitlist.tsx` — assign flow
- `src/pages/FloorPlan.tsx` — table actions
- `src/components/layout/Sidebar.tsx` — grouped nav
- `src/components/layout/Header.tsx` — search, branch, profile
- `src/App.tsx` — auth routes + providers
- `src/i18n/en.ts` + `ar.ts` — ops translations
- `src/index.css` — animations

---

*This document should be updated at the end of each development stage. Next milestone: Stage 2 backend integration and real-time reservation sync from the customer mobile app.*

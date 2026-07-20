# Tavla Platform — Complete Project Documentation

> **Document purpose:** A full record of the Tavla restaurant reservation platform dashboard — what it is, how it was built, what was implemented, and what remains for future phases.

**Last updated:** July 13, 2026  
**Current phase:** Frontend dashboard (React) — UI/UX prototype with mock data  
**Target market:** Restaurants in Damascus, Syria

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Platform Vision & Architecture](#2-platform-vision--architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [How the System Was Built](#4-how-the-system-was-built)
5. [Technology Stack](#5-technology-stack)
6. [Design System](#6-design-system)
7. [Project Structure](#7-project-structure)
8. [Application Architecture](#8-application-architecture)
9. [Routing & Navigation](#9-routing--navigation)
10. [Dashboard Modules (What Was Built)](#10-dashboard-modules-what-was-built)
11. [Data Models & TypeScript Types](#11-data-models--typescript-types)
12. [Mock Data & Demo Restaurant](#12-mock-data--demo-restaurant)
13. [Internationalization (i18n)](#13-internationalization-i18n)
14. [Reusable UI Components](#14-reusable-ui-components)
15. [Responsive & Accessibility Behavior](#15-responsive--accessibility-behavior)
16. [Commands & Development Workflow](#16-commands--development-workflow)
17. [What Is Not Built Yet](#17-what-is-not-built-yet)
18. [Recommended Next Steps](#18-recommended-next-steps)

---

## 1. Project Overview

### What is Tavla?

**Tavla** (also referenced as **Taawla** in the PRD) is a professional restaurant reservation platform operating across **Damascus**. The platform consists of:

| Component | Audience | Status |
|-----------|----------|--------|
| **Mobile App** | Customers (diners) | Completed (per project brief) |
| **Restaurant Dashboard** | Restaurant owners, managers, reception staff | **Built (frontend)** |
| **Website / Dashboard** | Same as dashboard — per-restaurant SaaS instance | **Built (frontend)** |

### What customers do (mobile app)

Customers use the mobile application to:

- Browse all restaurants in Damascus
- View restaurant menus
- See available tables
- Select tables from a **visual floor map**
- Book reservations (date, time, number of guests)
- Add **special occasions** (birthday, anniversary, engagement, etc.)
- Request **additional services**: cakes, flowers, decorations, birthday arrangements, candles, special setup
- Specify cake delivery time and custom notes

### What restaurants do (dashboard — this project)

Restaurant staff use the dashboard to:

- See **today's and upcoming reservations** from the mobile app
- Manage reservation lifecycle (confirm, check-in, seat, complete, cancel)
- View and manage the **interactive floor plan**
- Administer tables, sections, and table features
- Manage customers, waitlist, and walk-ins
- Track special occasions and additional service requests
- Receive system notifications
- Manage staff accounts (role-based)
- View reports and analytics
- Configure restaurant settings and branches
- Review activity logs (audit trail)

### Design goals

The dashboard was built with a strong focus on **UI/UX**:

- Professional **mauve and white** color palette
- Clean, premium SaaS aesthetic (inspired by OpenTable, Resy, SevenRooms, Toast)
- Easy to use for reception staff under time pressure
- Fully responsive: **laptop, tablet, and mobile**
- **Dark mode** and **light mode**
- **Arabic (RTL)** and **English (LTR)** support

---

## 2. Platform Vision & Architecture

### Multi-tenant SaaS model

This dashboard is **not** for a single restaurant. The platform serves **many restaurants**, each with its own isolated account.

```
┌─────────────────────────────────────────────────────────┐
│                    TAVLA PLATFORM                        │
│              (Multi-Tenant SaaS Backend)                 │
├─────────────┬─────────────┬─────────────┬───────────────┤
│ Restaurant A│ Restaurant B│ Restaurant C│     ...       │
│  Dashboard  │  Dashboard  │  Dashboard  │               │
│  Tables     │  Tables     │  Tables     │               │
│  Reservations│ Reservations│ Reservations│               │
│  Staff      │  Staff      │  Staff      │               │
│  Reports    │  Reports    │  Reports    │               │
└─────────────┴─────────────┴─────────────┴───────────────┘
         ▲              ▲              ▲
         │              │              │
    Mobile App    Mobile App    Mobile App
    (Customers)   (Customers)   (Customers)
```

### Data isolation rules

Each restaurant can **only** access:

- Its own reservations
- Its own tables and floor plan
- Its own customers
- Its own reports
- Its own staff
- Its own settings and branches

**No restaurant can access another restaurant's data.**

### Branch support

Restaurants may have **multiple branches**. Each branch has:

- Own tables
- Own reservations
- Own staff
- Own reports
- Own floor plan

---

## 3. User Roles & Permissions

The PRD defines four dashboard roles. The UI is built to support all of them; **role-based access enforcement** (hiding routes/actions per role) is planned for a future backend phase.

| Role | Permissions | Restrictions |
|------|-------------|--------------|
| **Restaurant Owner** | Full access: profile, tables, reservations, staff, reports, settings | — |
| **Restaurant Manager** | Reservations, tables, reports, daily operations | Cannot delete restaurant or manage subscription |
| **Receptionist / Host** | View/confirm reservations, check-in, waitlist | No financial data, no staff management |
| **Viewer** | Read-only access to permitted modules | No write actions |

### Staff roles in the data model

```typescript
type StaffRole = 'owner' | 'manager' | 'receptionist' | 'viewer'
```

---

## 4. How the System Was Built

### Build approach

The project was started **from an empty workspace** and scaffolded as a modern React SPA:

1. **Scaffolded** with Vite + React + TypeScript template
2. **Styled** with Tailwind CSS v4 and a custom mauve design token system
3. **Structured** with feature-based folders (`pages`, `components`, `context`, `types`, `data`, `i18n`)
4. **Routed** with React Router v7 inside a persistent dashboard layout
5. **Populated** with realistic mock data for a demo restaurant in Damascus
6. **Internationalized** with English and Arabic translation files
7. **Verified** with a successful production build (`npm run build`)

### What exists today

| Layer | Status |
|-------|--------|
| Frontend UI (all 16 modules) | ✅ Complete |
| Design system (mauve theme, dark/light) | ✅ Complete |
| Responsive layout (sidebar, header) | ✅ Complete |
| i18n (EN + AR, RTL) | ✅ Complete |
| TypeScript types / data models | ✅ Complete |
| Mock data for development | ✅ Complete |
| Backend API | ❌ Not started |
| Authentication / login | ❌ Not started |
| Real-time WebSockets | ❌ Not started |
| Database | ❌ Not started |
| Mobile app (customer) | ✅ Exists separately (outside this repo) |

---

## 5. Technology Stack

### Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI framework |
| **TypeScript** | 6.x | Type safety |
| **Vite** | 8.x | Build tool & dev server |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **React Router** | 7.x | Client-side routing |

### Libraries

| Package | Purpose |
|---------|---------|
| `lucide-react` | Icon system |
| `recharts` | Analytics charts (Reports page) |
| `clsx` + `tailwind-merge` | Conditional class names (`cn` utility) |
| `date-fns` | Date utilities (installed for future use) |

### Dev tools

| Tool | Purpose |
|------|---------|
| `oxlint` | Linting |
| `@vitejs/plugin-react` | Fast Refresh for React |
| `@tailwindcss/vite` | Tailwind v4 Vite integration |

### Fonts (Google Fonts)

- **Inter** — English / LTR interface
- **Noto Sans Arabic** — Arabic / RTL interface

---

## 6. Design System

### Color palette — Mauve & White

The primary brand color is **mauve** (`#7d5f9a`), paired with white surfaces and subtle purple-tinted grays.

#### Mauve scale

| Token | Hex | Usage |
|-------|-----|-------|
| mauve-50 | `#faf8fc` | Lightest backgrounds |
| mauve-100 | `#f3eef7` | Secondary surfaces |
| mauve-200 | `#e8dff0` | Borders |
| mauve-300 | `#d4c4e0` | Strong borders |
| mauve-400 | `#b89dc8` | Muted accents |
| mauve-500 | `#9b7bb8` | Muted text |
| mauve-600 | `#7d5f9a` | **Primary brand** |
| mauve-700 | `#664d7e` | Primary hover |
| mauve-800 | `#553f68` | Dark accents |
| mauve-900 | `#473556` | Dark text |
| mauve-950 | `#2d2136` | Darkest |

#### Semantic colors

| Token | Light mode | Purpose |
|-------|------------|---------|
| `primary` | `#7d5f9a` | Buttons, links, active nav |
| `success` | `#16a34a` | Available tables, confirmed |
| `warning` | `#d97706` | Pending, occupied |
| `danger` | `#dc2626` | Cancelled, errors |
| `info` | `#2563eb` | Reserved, informational |

#### Surfaces

| Token | Light | Dark |
|-------|-------|------|
| `surface` | `#ffffff` | `#1a1420` |
| `surface-secondary` | `#faf8fc` | `#221a2a` |
| `surface-tertiary` | `#f3eef7` | `#2d2136` |

### Shadows

- `shadow-card` — Cards and table rows
- `shadow-elevated` — Hover states on stat cards
- `shadow-modal` — Future modals/dialogs

### Border radius

- `sm` 0.375rem · `md` 0.5rem · `lg` 0.75rem · `xl` 1rem

### Dark mode

Implemented via a `ThemeProvider` that toggles the `.dark` class on `<html>`. Preference is persisted in `localStorage` under key `tavla-theme`. Falls back to system `prefers-color-scheme` on first visit.

### Status badge colors

**Reservation statuses:**

| Status | Color |
|--------|-------|
| Pending | Amber / warning |
| Confirmed | Blue / info |
| Checked In | Mauve |
| Seated | Primary mauve |
| Completed | Green / success |
| Cancelled | Red / danger |
| No Show | Gray / muted |

**Table statuses:**

| Status | Color |
|--------|-------|
| Available | Green |
| Reserved | Blue |
| Occupied | Amber |
| Out of Service | Gray |

---

## 7. Project Structure

```
D:\Tavla\
├── index.html                    # Entry HTML, font preconnects
├── package.json                  # Dependencies and scripts
├── vite.config.ts                # Vite + Tailwind + @ path alias
├── tsconfig.json                 # Project references
├── tsconfig.app.json             # App TypeScript config
├── tsconfig.node.json            # Node/Vite config TypeScript
├── README.md                     # Quick start guide
├── TAVLA_PROJECT_DOCUMENTATION.md  # This file
│
└── src/
    ├── main.tsx                  # React entry point
    ├── App.tsx                   # Router + providers
    ├── index.css                 # Tailwind + design tokens
    ├── vite-env.d.ts             # Vite type declarations
    │
    ├── assets/                   # Static assets (logos)
    │
    ├── components/
    │   ├── layout/
    │   │   ├── DashboardLayout.tsx   # Shell: sidebar + header + outlet
    │   │   ├── Sidebar.tsx           # Navigation sidebar
    │   │   └── Header.tsx            # Top bar: search, theme, locale, notifications
    │   └── ui/
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── DataTable.tsx
    │       ├── EmptyState.tsx
    │       ├── Input.tsx             # Input + Select
    │       ├── PageHeader.tsx
    │       ├── StatCard.tsx
    │       └── StatusBadge.tsx
    │
    ├── context/
    │   ├── ThemeContext.tsx      # Light/dark mode
    │   ├── LocaleContext.tsx     # EN/AR + RTL
    │   └── SidebarContext.tsx    # Mobile drawer + collapse state
    │
    ├── data/
    │   └── mockData.ts           # All demo data
    │
    ├── i18n/
    │   ├── en.ts                 # English translations
    │   └── ar.ts                 # Arabic translations
    │
    ├── lib/
    │   └── utils.ts              # cn(), formatTime()
    │
    ├── pages/                    # One file per dashboard module
    │   ├── Dashboard.tsx
    │   ├── Reservations.tsx
    │   ├── ReservationDetail.tsx
    │   ├── FloorPlan.tsx
    │   ├── Tables.tsx
    │   ├── Calendar.tsx
    │   ├── Customers.tsx
    │   ├── Waitlist.tsx
    │   ├── WalkIn.tsx
    │   ├── SpecialOccasions.tsx
    │   ├── Notifications.tsx
    │   ├── Staff.tsx
    │   ├── Reports.tsx
    │   ├── Branches.tsx
    │   ├── Settings.tsx
    │   └── ActivityLogs.tsx
    │
    └── types/
        └── index.ts              # All TypeScript interfaces
```

---

## 8. Application Architecture

### Provider hierarchy

```
ThemeProvider
  └── LocaleProvider
        └── SidebarProvider
              └── BrowserRouter
                    └── DashboardLayout
                          ├── Sidebar
                          ├── Header
                          └── <Outlet />  → Page components
```

### Context responsibilities

| Context | State | Persistence |
|---------|-------|-------------|
| `ThemeContext` | `theme: 'light' \| 'dark'` | `localStorage: tavla-theme` |
| `LocaleContext` | `locale: 'en' \| 'ar'`, `isRTL`, `t` (translations) | `localStorage: tavla-locale` |
| `SidebarContext` | `isOpen`, `isCollapsed` | Session only |

### Layout behavior

- **Desktop (lg+):** Fixed sidebar (256px or 72px collapsed), sticky header, main content area
- **Mobile/Tablet:** Sidebar hidden by default; hamburger opens drawer overlay
- **Max content width:** 1600px centered in main area

---

## 9. Routing & Navigation

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Home overview |
| `/reservations` | Reservations | List with search & filters |
| `/reservations/:id` | Reservation Detail | Full reservation view + actions |
| `/floor-plan` | Floor Plan | Interactive table map |
| `/tables` | Tables | Table administration |
| `/calendar` | Calendar | Timeline view |
| `/customers` | Customers | Customer database |
| `/waitlist` | Waitlist | Waiting list management |
| `/walk-in` | Walk-In | Register walk-in guests |
| `/special-occasions` | Special Occasions | Events & services |
| `/notifications` | Notifications | System alerts |
| `/staff` | Staff | Staff management |
| `/reports` | Reports | Analytics & charts |
| `/branches` | Branches | Multi-location |
| `/settings` | Settings | Restaurant configuration |
| `/activity-logs` | Activity Logs | Audit trail |

### Sidebar navigation (16 items)

Matches the PRD specification exactly:

1. Dashboard  
2. Reservations  
3. Floor Plan  
4. Tables  
5. Calendar  
6. Customers  
7. Waitlist  
8. Walk-In  
9. Special Occasions  
10. Notifications *(badge: 2 unread)*  
11. Staff  
12. Reports  
13. Branches  
14. Settings  
15. Activity Logs  

---

## 10. Dashboard Modules (What Was Built)

### 10.1 Dashboard Home (`/`)

**Purpose:** First screen after login — operational overview for today.

**Stat cards (top row):**
- Today's Reservations (24)
- Expected Guests (86)
- Occupancy Rate (72%)
- Upcoming Reservations (8)

**Status summary (second row):**
- Confirmed (18)
- Pending (4)
- Cancelled (2)

**Widgets:**
- **Next Hour** — Reservations within the next hour
- **Recent Reservations** — Latest 5 bookings with status badges
- **Today's Special Occasions** — Birthdays, anniversaries with cake times
- **Occupied Tables** — Count + progress bar + table names
- **Available Tables** — Count + progress bar + table names

All widgets link to their respective modules.

---

### 10.2 Reservation Management (`/reservations`)

**Reservation table columns:**
- Reservation ID
- Customer Name
- Phone Number
- Reservation Date
- Reservation Time
- Number of Guests
- Assigned Table
- Reservation Status
- *(Creation Date available in detail view)*

**Filters implemented:**
- Text search (customer name, phone, reservation ID)
- Status dropdown (all statuses)

**Reservation statuses supported:**
`pending` · `confirmed` · `checked_in` · `seated` · `completed` · `cancelled` · `no_show`

**Row click** navigates to detail page.

---

### 10.3 Reservation Detail (`/reservations/:id`)

**Sections displayed:**

**Customer Information**
- Full Name, Phone, Email

**Reservation Information**
- Reservation Number, Date, Time, Duration, Guest Count, Assigned Table, Creation Date

**Special Occasion** *(if applicable)*
- Occasion type, cake delivery time

**Additional Services** *(if applicable)*
- Cake, Flowers, Decoration, Special Setup, Candles

**Customer Notes**
- Full text notes from the customer

**Action buttons** (contextual by status):
- Confirm / Reject (pending)
- Check In (pending/confirmed)
- Complete (seated)
- Reassign Table
- Change Time

*Note: Buttons are UI-ready; API wiring is future work.*

---

### 10.4 Floor Plan (`/floor-plan`)

**Interactive visual restaurant map** showing all tables positioned on a canvas.

**Table states (color-coded):**
- Available — green
- Reserved — blue
- Occupied — amber
- Out of Service — gray

**Click a table** to see side panel with:
- Table number, capacity, section
- Features (window view, smoking, wheelchair, etc.)
- Current reservation (if occupied)
- Next reservation (if reserved)

**Legend** displayed at top of floor map.

**Sections represented:** Indoor, Outdoor, Terrace, VIP, Family, Private

---

### 10.5 Table Management (`/tables`)

**Administration table with columns:**
- Table Name, Number, Capacity, Section, Features, Status, Actions

**Table features supported in data model:**
- Window View
- Smoking Area / Non-Smoking Area
- Wheelchair Accessible
- Family Friendly

**"Add Table" button** in header (UI ready).

**Create table fields (per PRD, UI planned):**
- Table Name, Table Number, Seat Capacity, Section, Position on Floor Map

---

### 10.6 Calendar (`/calendar`)

**Views:** Daily · Weekly · Monthly *(toggle UI; daily timeline fully rendered)*

**Daily timeline:**
- Hours 10 AM – 11 PM
- Reservations shown as blocks per time slot
- Each block shows: customer name, table, guest count, status badge

**Navigation:** Previous / next day buttons with date display.

*Drag-and-drop rescheduling is planned for a future phase.*

---

### 10.7 Customer Management (`/customers`)

**Customer table columns:**
- Name (with avatar initial)
- Phone, Email
- Reservation Count, Visit Count, Last Visit
- History action button

**Customer profile fields (per PRD):**
- Full Name, Phone, Email, Reservation Count, Visit Count, Last Visit

**History types (planned):** Previous reservations, special requests, cancellations, no-shows.

---

### 10.8 Waiting List (`/waitlist`)

**Card-based layout** for each waiting customer:

| Field | Description |
|-------|-------------|
| Queue position | #1, #2, #3 |
| Name | Customer name |
| Phone | Contact number |
| Guest Count | Party size |
| Arrival Time | When they arrived |

**Actions per entry:**
- Call Customer
- Assign Table
- Remove from Waitlist

---

### 10.9 Walk-In Management (`/walk-in`)

**Registration form fields:**
- Customer Name
- Phone Number
- Number of Guests
- Table selection (dropdown of available tables only)

**Actions:**
- Register Walk-In
- Add to Waitlist

**Side panel:** Live list of currently available tables with section and capacity.

---

### 10.10 Special Occasions (`/special-occasions`)

**Occasion types:**
`birthday` · `anniversary` · `engagement` · `graduation` · `custom`

**Each occasion card shows:**
- Customer name
- Occasion type (with icon)
- Execution time (e.g., cake at 8:30 PM)
- Requested services (cake, flowers, decoration, etc.)
- Notes
- Status: pending · preparing · ready · completed

---

### 10.11 Notification Center (`/notifications`)

**Notification types:**
- New Reservation
- Reservation Updated
- Reservation Cancelled
- Customer Arrived
- Upcoming Occasion

**Features:**
- Unread count in header bell icon
- Unread indicator dot on each notification
- "Mark All Read" action
- Color-coded icons per notification type

---

### 10.12 Staff Management (`/staff`)

**Staff table columns:**
- Name (with initials avatar)
- Email, Phone
- Role (color-coded badge)
- Active/Inactive status
- Edit action

**Roles:** Owner · Manager · Receptionist · Viewer

**"Add Staff Member" button** in header.

---

### 10.13 Reports & Analytics (`/reports`)

**Summary stat cards:**
- Total Reservations (2,540)
- No-Show Rate (4.2%)
- New Customers (186)
- Total Occasions (100)

**Charts (Recharts):**
1. **Reservation Analytics** — Bar chart: monthly total vs cancelled
2. **Occupancy Analytics** — Line chart: daily occupancy % (Mon–Sun)
3. **Occasion Analytics** — Donut chart: occasion type distribution
4. **Top Tables** — Horizontal bar ranking of most reserved tables

---

### 10.14 Branch Management (`/branches`)

**Card layout per branch:**
- Branch name
- Address
- Active/Inactive status
- Edit / View actions

**Demo branches:**
- Old City — Main (active)
- Malki Branch (active)
- Abu Rummaneh (inactive)

Each branch is designed to have its own tables, reservations, staff, reports, and floor plan.

---

### 10.15 Restaurant Settings (`/settings`)

**Tabbed interface:**

| Tab | Contents |
|-----|----------|
| **Profile** | Name, description, phone, email, website, address, logo upload |
| **Working Hours** | Open/close time per day (Mon–Sun) |
| **Reservation Rules** | Min/max guests, duration, advance booking days |
| **Policies** | Cancellation policy, no-show policy |

---

### 10.16 Activity Logs (`/activity-logs`)

**Audit table columns:**
- User (staff member who performed action)
- Action (e.g., "Reservation Confirmed", "Table Updated")
- Date, Time
- Affected Entity (reservation ID, table name, etc.)

**Example logged actions:**
- Reservation Created / Modified / Cancelled
- Table Updated
- Staff Created
- Settings Changed
- Customer Checked In

---

## 11. Data Models & TypeScript Types

All types are defined in `src/types/index.ts`.

### Core enums

```typescript
ReservationStatus: pending | confirmed | checked_in | seated | completed | cancelled | no_show
TableStatus: available | reserved | occupied | out_of_service
TableSection: indoor | outdoor | terrace | family | vip | private
OccasionType: birthday | anniversary | engagement | graduation | custom
StaffRole: owner | manager | receptionist | viewer
AdditionalService: cake | flowers | decoration | special_setup | candles
```

### Main interfaces

| Interface | Key fields |
|-----------|------------|
| `Reservation` | id, customerName, phone, email, date, time, duration, guestCount, tableId, tableName, status, occasion, services, notes, cakeTime |
| `Table` | id, name, number, capacity, section, status, x/y/width/height (floor position), features, current/next reservation |
| `Customer` | id, name, phone, email, reservationCount, visitCount, lastVisit |
| `WaitlistEntry` | id, name, phone, guestCount, arrivalTime |
| `StaffMember` | id, name, email, phone, role, active |
| `Notification` | id, type, title, message, time, read |
| `ActivityLog` | id, user, action, date, time, entity |
| `Branch` | id, name, address, active |
| `SpecialOccasion` | id, customerName, occasionType, executionTime, services, notes, status, reservationId |
| `DashboardStats` | todayReservations, upcomingReservations, expectedGuests, occupancyRate, confirmed, pending, cancelled |

---

## 12. Mock Data & Demo Restaurant

All data lives in `src/data/mockData.ts` for frontend development and demos.

### Demo restaurant

| Field | Value |
|-------|-------|
| Name | Naranj Restaurant |
| Arabic name | مطعم نارنج |
| Branch | Damascus — Old City |
| Logo initial | N |

### Sample data counts

| Entity | Count |
|--------|-------|
| Reservations | 8 |
| Tables | 12 |
| Customers | 5 |
| Waitlist entries | 3 |
| Staff members | 5 |
| Notifications | 5 (2 unread) |
| Activity logs | 5 |
| Branches | 3 |
| Special occasions | 4 |

### Notable sample reservations

- **RES-1042** — Ahmad Al-Hassan, birthday, chocolate cake at 8:30 PM, Table 3
- **RES-1046** — Khaled Nasser, engagement, 8 guests, Family 1, full decoration setup
- **RES-1045** — Layla Mansour, currently seated at Table 1

---

## 13. Internationalization (i18n)

### Supported locales

| Code | Language | Direction | Font |
|------|----------|-----------|------|
| `en` | English | LTR | Inter |
| `ar` | Arabic | RTL | Noto Sans Arabic |

### Implementation

- Translation files: `src/i18n/en.ts`, `src/i18n/ar.ts`
- `LocaleProvider` sets `document.documentElement.lang` and `dir`
- Toggle via globe button in header
- Preference saved to `localStorage: tavla-locale`

### What is translated

All navigation labels, page titles, subtitles, table headers, status labels, common actions (save, cancel, edit, search, etc.), and dashboard widget titles.

### RTL considerations

- Uses logical CSS properties (`start`/`end` instead of `left`/`right`)
- Sidebar border on the correct side for RTL
- Arabic font family applied when `dir="rtl"`

---

## 14. Reusable UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `Button` | `ui/Button.tsx` | Primary, secondary, ghost, danger, outline variants; sm/md/lg/icon sizes |
| `Card` | `ui/Card.tsx` | Surface container with optional padding; CardHeader, CardTitle |
| `Input` / `Select` | `ui/Input.tsx` | Form inputs with optional icon |
| `StatusBadge` | `ui/StatusBadge.tsx` | Colored pill for reservation/table/custom statuses |
| `StatCard` | `ui/StatCard.tsx` | Dashboard metric card with icon and optional trend |
| `PageHeader` | `ui/PageHeader.tsx` | Page title, subtitle, action slot |
| `DataTable` | `ui/DataTable.tsx` | Responsive table primitives (Head, Body, Row, Cell) |
| `EmptyState` | `ui/EmptyState.tsx` | Placeholder for empty lists |

### Utility functions (`lib/utils.ts`)

```typescript
cn(...classes)        // Merge Tailwind classes safely
formatTime("19:00")   // Returns "7:00 PM"
```

---

## 15. Responsive & Accessibility Behavior

### Breakpoints (Tailwind defaults)

| Breakpoint | Behavior |
|------------|----------|
| Mobile (<640px) | Drawer sidebar, stacked stat cards, horizontal scroll tables |
| Tablet (640–1024px) | 2-column grids, sidebar still drawer |
| Desktop (1024px+) | Fixed sidebar, 3–4 column grids, collapsible sidebar |

### Header features

- Global search input (desktop)
- Language toggle (EN / AR)
- Dark / light mode toggle
- Notification bell with unread badge
- User profile dropdown (George Naim, Owner)

### Sidebar features

- Active route highlighting (mauve background)
- Notification badge on Notifications nav item
- Collapse to icon-only mode (desktop)
- Restaurant name and branch displayed at top

---

## 16. Commands & Development Workflow

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Opens at **http://localhost:5173**

### Production build

```bash
npm run build
```

Output: `dist/` folder (verified working)

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

### Path alias

`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

---

## 17. What Is Not Built Yet

The following are defined in the PRD but **not implemented** in the current frontend codebase:

| Feature | Notes |
|---------|-------|
| **Login / Authentication** | No login page; dashboard loads directly |
| **Backend API** | All data is static mock data |
| **Multi-tenant isolation** | Architecture designed, not enforced |
| **Role-based route guards** | All roles see all pages |
| **Real-time notifications** | No WebSocket; static notification list |
| **Drag-and-drop calendar** | Calendar is view-only |
| **Floor plan editor** | Tables have fixed positions; no drag-to-place |
| **CRUD persistence** | Forms and buttons don't save to a database |
| **Export** | Export button is UI-only |
| **Google Maps integration** | Settings has address field only |
| **Subscription / billing** | Not in scope for frontend phase |
| **Customer mobile app** | Built separately, not in this repository |
| **Email / SMS notifications** | Not implemented |
| **Payment / financial module** | Receptionist restriction only in PRD |

---

## 18. Recommended Next Steps

### Phase 2 — Backend & Auth

1. Choose backend stack (e.g., Node.js + PostgreSQL, or Supabase/Firebase)
2. Implement multi-tenant authentication (restaurant login, JWT sessions)
3. Enforce role-based permissions on API and UI routes
4. Replace `mockData.ts` with API calls

### Phase 3 — Real-time & Operations

1. WebSocket channel for live reservation updates
2. Push notifications for new bookings and occasion reminders
3. Check-in flow connected to floor plan state updates

### Phase 4 — Advanced Features

1. Drag-and-drop calendar rescheduling
2. Visual floor plan editor for table positioning
3. Branch switcher in header
4. PDF/CSV report export
5. Google Maps embed in settings

### Phase 5 — Production

1. Deploy dashboard (Vercel, Netlify, or custom hosting)
2. Custom domain per restaurant (e.g., `naranj.tavla.sy`)
3. Performance optimization (code-split Reports/Recharts bundle)
4. E2E tests for critical flows (reservation confirm, check-in)

---

## Appendix A — PRD Compliance Checklist

| PRD Requirement | Status |
|-----------------|--------|
| Dashboard home with today's stats | ✅ |
| Quick overview widgets | ✅ |
| Reservation table with all columns | ✅ |
| Reservation filters | ✅ (search + status) |
| All reservation statuses | ✅ |
| Reservation detail page | ✅ |
| Reservation actions (UI) | ✅ |
| Interactive floor plan | ✅ |
| Table states & info | ✅ |
| Table management | ✅ |
| Calendar (daily/weekly/monthly views) | ✅ (daily fully rendered) |
| Customer management | ✅ |
| Waiting list | ✅ |
| Walk-in management | ✅ |
| Special occasions module | ✅ |
| Notification center | ✅ |
| Staff management | ✅ |
| Reports & analytics | ✅ |
| Restaurant settings | ✅ |
| Branch management | ✅ |
| Activity logs | ✅ |
| Sidebar navigation (all 16 items) | ✅ |
| Mauve & white design | ✅ |
| Dark / light mode | ✅ |
| Arabic RTL + English LTR | ✅ |
| Responsive design | ✅ |
| Multi-tenant SaaS architecture | ✅ (designed, not backend-enforced) |
| Role-based permissions | ⏳ UI ready, enforcement pending |

---

## Appendix B — File Inventory

**Total source files:** 41 files in `src/`

| Category | Files |
|----------|-------|
| Pages | 16 |
| Layout components | 3 |
| UI components | 9 |
| Context providers | 3 |
| i18n | 2 |
| Types | 1 |
| Mock data | 1 |
| Utils | 1 |
| Styles | 1 |
| Entry/config | 4 |

---

*This document describes the Tavla Restaurant Dashboard frontend as built in July 2026. Update this file as backend integration and new features are added.*

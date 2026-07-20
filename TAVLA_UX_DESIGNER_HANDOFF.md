# Tavla (تفّلّة) — Product Brief for UI/UX Designer

> **Purpose:** Explain what this product is and everything the restaurant dashboard contains — so you can design all interfaces, screens, buttons, flows, and transitions with full creative freedom.

**You are not being given a finished design to copy.**  
You are being given the **product definition**. How it looks, feels, and moves is entirely up to you.

---

## Brand Direction (only constraint)

The brand identity is built around **mauve** and **white**.  
Everything else — layout, typography, icon style, spacing, animations, visual language — is yours to define.

---

## What is Tavla?

**Tavla** is a restaurant reservation platform for **Damascus, Syria**. It connects two sides:

| Side | Who uses it | What it does |
|------|-------------|--------------|
| **Mobile app** | Customers (diners) | Browse restaurants, view menus, pick a table from a floor map, book a reservation, add special occasions and extra services |
| **Restaurant dashboard** | Restaurant staff | Manage everything that comes from the app — plus walk-ins, waitlists, floor operations, staff, reports, and settings |

**This brief is about the restaurant dashboard** — the web application restaurant owners, managers, and reception staff use every day.

The dashboard is **multi-tenant SaaS**: one platform serves many restaurants. Each restaurant only sees its own data. A restaurant can also have **multiple branches**, each with its own tables, reservations, staff, and floor plan.

---

## Who will use the dashboard?

### Receptionist / Host (primary user)
- Works at the front desk during busy service hours
- Approves reservations from the mobile app
- Checks in guests, seats them, handles walk-ins and waitlists
- Glances at the floor map to see which tables are free
- Often on a **tablet or laptop**, under time pressure

### Restaurant Manager
- Oversees daily operations
- Monitors reservations, occupancy, and special occasions
- Manages staff and reviews reports

### Restaurant Owner
- Full access to everything
- Manages branches, settings, and business performance

### Viewer
- Read-only access — can see data but cannot make changes

---

## Languages & devices

The product needs to work in:

- **Arabic** (primary — RTL)
- **English** (secondary — LTR)

It must work well on:

- **Laptop** (manager desk)
- **Tablet** (reception stand — very important)
- **Mobile** (quick checks on the go)

**Light mode** and **dark mode** are both needed.

---

## How the mobile app connects to the dashboard

When a customer books through the mobile app, the restaurant dashboard receives:

- Customer name, phone, email
- Date, time, number of guests
- **Table selected** from the visual floor map in the app
- Optional **special occasion** (birthday, anniversary, engagement, graduation, or custom)
- Optional **additional services**: cake, flowers, decoration, candles, special setup
- Optional **cake delivery time**
- Customer **notes**

The receptionist then manages that reservation through its full lifecycle on the dashboard.

---

## Reservation lifecycle

A reservation moves through these statuses:

```
Pending → Confirmed → Checked In → Seated → Completed
```

It can also end as:

- **Cancelled**
- **No Show**

**What each status means:**

| Status | Meaning |
|--------|---------|
| Pending | Customer booked via app — waiting for restaurant approval |
| Confirmed | Restaurant approved the booking |
| Checked In | Guest has arrived |
| Seated | Guest is at their table |
| Completed | Service finished, table can be freed |
| Cancelled | Booking was cancelled |
| No Show | Guest did not arrive |

**Key staff actions on a reservation:**
- Confirm or reject (when pending)
- Check in (when guest arrives)
- Mark as seated
- Complete (when they leave)
- Cancel
- Reassign to a different table
- Change the time

---

## Table lifecycle

Each table in the restaurant has a status:

| Status | Meaning |
|--------|---------|
| Available | Empty and ready |
| Reserved | Booked for an upcoming reservation |
| Occupied | Guests are currently seated |
| Out of Service | Temporarily unavailable |

Tables belong to **sections**: Indoor, Outdoor, Terrace, VIP, Family, Private.

Tables can have **features**: window view, smoking/non-smoking, wheelchair accessible, family friendly.

---

## All screens in the dashboard

The dashboard has **16 main sections** plus a login page. Below is what each one contains and what users do there.

---

### Login

Staff sign in to access their restaurant's dashboard.

**Contains:**
- Email and password fields
- Sign-in action
- Restaurant identity (which restaurant / branch they are logging into)

---

### 1. Dashboard (Home)

The first screen after login. This is the **operations overview** — what is happening in the restaurant right now and what needs attention.

**Should help staff answer:**
- Are there reservations waiting for my approval?
- Who is arriving soon?
- How full is the restaurant right now?
- Is anyone on the waitlist?
- Are there special occasions today?
- What does the floor look like at a glance?

**Information available on this screen:**
- Pending reservations (need approval)
- Upcoming arrivals
- Today's reservation counts and guest counts
- Occupancy rate (how full the restaurant is)
- Confirmed / pending / cancelled breakdown
- Waitlist summary
- Today's special occasions
- Which tables are occupied vs available
- A preview or link to the floor plan
- Quick access to walk-in and other common actions

---

### 2. Reservations

Full list of all reservations.

**Contains:**
- Search (by customer name, phone, or reservation ID)
- Filters (by status, by date — especially "today")
- Table/list of reservations showing:
  - Reservation ID
  - Customer name
  - Phone
  - Date and time
  - Number of guests
  - Assigned table
  - Status
- Clicking a reservation opens the detail page
- Quick actions from the list (confirm, check in, etc.)

---

### 3. Reservation Detail

Full view of a single reservation.

**Contains:**

**Customer information**
- Name, phone, email

**Reservation information**
- Reservation number
- Date, time, duration
- Number of guests
- Assigned table
- When it was created
- Source (booked via mobile app)

**Special occasion** *(if the customer added one)*
- Type: birthday, anniversary, engagement, graduation, or custom
- Cake delivery time (if applicable)

**Additional services** *(if requested)*
- Cake, flowers, decoration, candles, special setup

**Customer notes**
- Free text from the customer

**Actions** *(depend on current status)*
- Confirm / Reject
- Check In
- Complete
- Cancel
- Reassign table
- Change time

---

### 4. Floor Plan

An **interactive visual map** of the restaurant showing all tables in their real positions.

This is one of the most important screens. Customers already pick their table from a floor map in the mobile app — the dashboard shows the same tables with **live status**.

**Contains:**
- Visual layout of the restaurant (sections: indoor, outdoor, terrace, VIP, family, private)
- Each table shown with its number and current status (available, reserved, occupied, out of service)
- Clicking a table shows a detail panel with:
  - Table number, name, capacity, section
  - Features (window view, smoking, etc.)
  - Current reservation (if occupied) — guest name, party size
  - Next reservation (if reserved)
- Actions on a selected table:
  - Mark as available
  - Mark as occupied
  - Mark out of service
  - Seat a walk-in guest at this table
  - View linked reservation

**Restaurant layout elements** that may appear on the map:
- Kitchen
- Bar
- Entrance
- Terrace divider
- Zone labels

---

### 5. Table Management

Administrative screen to configure the restaurant's tables (not the live operations view — that's the Floor Plan).

**Contains:**
- List of all tables with: name, number, capacity, section, features, status
- Add new table
- Edit existing table
- Table configuration fields: name, number, seat capacity, section, position on floor map

---

### 6. Calendar

Timeline view of reservations across time.

**Contains:**
- View switcher: Daily / Weekly / Monthly
- Daily view: hour-by-hour timeline (e.g., 10 AM – 11 PM) with reservation blocks
- Each block shows: customer name, table, guest count, status
- Navigate between days/weeks/months
- Future capability: drag-and-drop to reschedule

---

### 7. Customers

Restaurant's customer database — everyone who has booked or visited.

**Contains:**
- List of customers with: name, phone, email, total reservations, visit count, last visit date
- Search customers
- View customer history (past reservations, cancellations, no-shows, special requests)

---

### 8. Waitlist

When no tables are available, guests can be added to a waiting list.

**Contains:**
- Queue of waiting guests, ordered by arrival
- For each entry: queue position, name, phone, guest count, arrival time
- Actions:
  - Call the customer
  - Assign a table (when one becomes free)
  - Remove from waitlist

---

### 9. Walk-In

For guests who arrive **without a prior reservation**.

**Contains:**
- Form: customer name, phone (optional), number of guests
- Table selection (only available tables shown)
- Actions:
  - Seat the guest immediately (creates a live reservation, marks table occupied)
  - Add to waitlist instead (if no table is free)
- Helper: list of currently available tables with section and capacity

---

### 10. Special Occasions

Tracks birthdays, anniversaries, engagements, and other events that need preparation.

**Contains:**
- List of today's (and upcoming) occasions
- For each: customer name, occasion type, execution time (when cake/service should happen), requested services, notes
- Occasion types: birthday, anniversary, engagement, graduation, custom
- Services: cake, flowers, decoration, candles, special setup
- Preparation status: pending → preparing → ready → completed

This module helps kitchen and service staff coordinate timing (e.g., "cake at 8:30 PM").

---

### 11. Notifications

System alerts about important events.

**Notification types:**
- New reservation received
- Reservation updated
- Reservation cancelled
- Customer arrived
- Upcoming special occasion

**Contains:**
- Notification list with title, message, time
- Read / unread state
- Mark all as read
- Unread count shown in the header (bell icon)

---

### 12. Staff Management

Manage who has access to the dashboard.

**Contains:**
- List of staff: name, email, phone, role, active/inactive status
- Roles: Owner, Manager, Receptionist, Viewer
- Add new staff member
- Edit existing staff

---

### 13. Reports & Analytics

Business performance data for managers and owners.

**Contains:**
- Summary metrics: total reservations, no-show rate, new customers, occasion count
- Charts and analytics:
  - Reservation trends over time
  - Daily occupancy rates
  - Occasion type distribution
  - Most popular tables

---

### 14. Branches

For restaurants with multiple locations.

**Contains:**
- List of branches: name, address, active/inactive status
- Add new branch
- Edit branch
- Switch context to a specific branch (affects tables, reservations, staff, floor plan)

**Demo example:**
- Old City — Main
- Malki Branch
- Abu Rummaneh

---

### 15. Settings

Restaurant configuration.

**Tabs:**

| Tab | What it configures |
|-----|-------------------|
| **Profile** | Restaurant name, description, phone, email, website, address, logo |
| **Working Hours** | Open and close times for each day of the week |
| **Reservation Rules** | Minimum/maximum guests, default duration, how far in advance customers can book |
| **Policies** | Cancellation policy, no-show policy |

---

### 16. Activity Logs

Audit trail of everything that happened in the system.

**Contains:**
- Log entries: who did what, when, on which entity
- Examples: "Reservation Confirmed", "Table Updated", "Staff Created", "Customer Checked In"
- Search/filter by user or action type

---

## Global elements (present across all screens)

These appear on every page inside the dashboard:

| Element | Purpose |
|---------|---------|
| **Navigation** | Access to all 16 sections, grouped logically (operations vs management vs admin) |
| **Header** | Search, branch switcher, language toggle, theme toggle (light/dark), notifications, user profile |
| **Global search** | Find reservations and customers quickly (important during phone calls) |
| **Branch switcher** | Switch between restaurant branches |
| **User profile menu** | Staff name, role, sign out |
| **Notifications** | Bell icon with unread count, dropdown with recent alerts |

**Suggested navigation grouping** (you decide the visual structure):

**Operations** (used every day during service)
- Dashboard
- Reservations
- Floor Plan
- Waitlist
- Walk-In
- Calendar

**Management**
- Customers
- Special Occasions
- Tables

**Administration**
- Staff
- Reports
- Branches
- Settings
- Activity Logs

---

## Key user flows to design

These are the most important journeys staff go through. Design the full flow including transitions between screens.

### Flow 1: Approve a mobile app reservation
```
New reservation appears (pending)
  → Staff sees it on dashboard or notifications
  → Opens reservation detail
  → Confirms (or rejects)
  → Table becomes reserved on floor plan
  → Guest arrives → Check in → Seated → Complete → Table available again
```

### Flow 2: Seat a walk-in guest
```
Guest walks in without booking
  → Staff goes to Walk-In
  → Enters name and guest count
  → Picks an available table
  → Guest is seated
  → Table shows occupied on floor plan
```

### Flow 3: Waitlist to seated
```
No tables available
  → Guest added to waitlist
  → Table frees up
  → Staff assigns table from waitlist
  → Guest seated, removed from queue
```

### Flow 4: Special occasion coordination
```
Customer books with birthday + cake at 8:30 PM via app
  → Shows on dashboard and occasions module
  → Kitchen/service staff see execution time
  → Status progresses: pending → preparing → ready → completed
```

### Flow 5: Quick lookup during a phone call
```
Phone rings, guest gives their name
  → Staff uses global search
  → Finds reservation
  → Opens detail with all info
```

### Flow 6: Branch switching
```
Owner/manager switches from Old City branch to Malki branch
  → All data (tables, reservations, floor plan) updates to that branch
```

---

## Data the UI displays

### Reservation fields
| Field | Example |
|-------|---------|
| ID | RES-1042 |
| Customer name | Sara Khoury |
| Phone | +963 944 123 456 |
| Email | sara@email.com |
| Date | Today |
| Time | 7:30 PM |
| Duration | 120 minutes |
| Guests | 4 |
| Table | Table 7 |
| Status | Pending |
| Occasion | Anniversary |
| Services | Cake, Flowers |
| Cake time | 8:30 PM |
| Notes | "Window seat preferred, nut allergy" |

### Table fields
| Field | Example |
|-------|---------|
| Number | 7 |
| Name | طاولة 7 |
| Capacity | 4 seats |
| Section | Indoor |
| Status | Available |
| Features | Window view, Non-smoking |

### Waitlist entry fields
| Field | Example |
|-------|---------|
| Position | #1 |
| Name | Ahmad Hassan |
| Phone | +963 933 000 111 |
| Guests | 3 |
| Arrival time | 7:15 PM |

---

## Role-based access

Different staff roles see and can do different things. Design with this in mind (you may show/hide sections or actions per role):

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Owner** | Everything | — |
| **Manager** | Operations, reports, staff management | Delete restaurant, manage subscription |
| **Receptionist** | Reservations, floor plan, waitlist, walk-in, customers | Reports, staff, settings, financial data |
| **Viewer** | View only | Any write/action |

---

## Demo restaurant (for realistic content in designs)

Use this as sample data when designing screens:

| | |
|---|---|
| **Restaurant** | مطعم نارنج (Narange Restaurant) |
| **Branch** | Damascus — Old City |
| **Tables** | 12 tables across indoor, outdoor, terrace, VIP, family, private sections |
| **Sample reservation** | Sara Khoury — 7:30 PM — 2 guests — Table 7 — Anniversary — Pending |
| **Sample waitlist** | Ahmad Hassan — 3 guests — arrived 7:15 PM |

---

## What you are designing

Please deliver designs for:

1. **All 16 screens** listed above + Login
2. **All states** each screen can be in (empty, loading, populated, error)
3. **All user flows** described above
4. **Global shell** (navigation, header, search, notifications, profile)
5. **Light and dark mode**
6. **Arabic (RTL) and English (LTR)**
7. **Responsive layouts** for laptop, tablet, and mobile
8. **Transitions** between screens and after user actions (confirming, seating, etc.)
9. **Role variations** where access differs

---

## Creative freedom

You have full freedom to decide:

- Layout and visual hierarchy
- Typography and font choices
- Icon style and illustration style
- Spacing, density, and grid
- Card styles, table styles, form styles
- Animation and motion design
- How the floor plan looks visually
- How the dashboard home prioritizes information
- Color usage beyond mauve and white
- Component design language
- Empty states, loading states, error states
- Micro-interactions and feedback patterns

**The only brand anchor is mauve and white.**  
Make it feel premium, professional, and easy to use for restaurant staff in Damascus — but the visual execution is entirely yours.

---

## Reference context (optional inspiration, not requirements)

Similar products in other markets:
- OpenTable (host tools)
- Resy (floor visualization)
- SevenRooms (CRM and occasions)
- Toast (restaurant operations)

Tavla is unique because it is built for **Damascus** — Arabic-first, local dining culture, and deep integration with a customer mobile app where guests pick their own table.

---

## Questions?

For deeper technical or product details, see `TAVLA_PROJECT_DOCUMENTATION.md` in the same project folder.

---

*This document describes **what** the product contains. **How** it should look is your expertise.*

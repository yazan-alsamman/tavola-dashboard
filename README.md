# Tavla — Restaurant Management Dashboard

A professional multi-tenant SaaS dashboard for restaurant reservation management in Damascus. Built for restaurant owners, managers, and reception staff.

## Features

- **Dashboard Home** — Today's stats, upcoming reservations, special occasions, table occupancy
- **Reservation Management** — Full table with filters, detail view, and actions
- **Interactive Floor Plan** — Visual table map with status colors
- **Table Management** — Configure tables, sections, and features
- **Calendar** — Daily/weekly/monthly reservation timeline
- **Customer Database** — Customer profiles and visit history
- **Waitlist & Walk-In** — Manage waiting customers and walk-ins
- **Special Occasions** — Birthday, anniversary, and event tracking
- **Notifications** — Real-time system alerts
- **Staff Management** — Role-based staff accounts
- **Reports & Analytics** — Charts and performance insights
- **Branch Management** — Multi-location support
- **Settings** — Restaurant profile, hours, rules, policies
- **Activity Logs** — Full audit trail

## Design

- Mauve & white professional color palette
- Dark mode and light mode
- English (LTR) and Arabic (RTL) support
- Fully responsive — desktop, tablet, and mobile

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Recharts
- Lucide Icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── layout/     # Sidebar, Header, DashboardLayout
│   └── ui/         # Reusable UI components
├── context/        # Theme, Locale, Sidebar providers
├── data/           # Mock data for development
├── i18n/           # English & Arabic translations
├── pages/          # All dashboard pages
└── types/          # TypeScript interfaces
```

## Next Steps

- Connect to backend API (multi-tenant authentication)
- Real-time WebSocket notifications
- Drag-and-drop calendar scheduling
- Floor plan editor for table positioning
- Role-based access control enforcement

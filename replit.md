# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

---

## Livana Property Manager (`artifacts/property-manager`)

Nigerian real estate platform built with React + Vite.

### Tech Stack
- **Framework**: React + Vite
- **Routing**: Wouter
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts (AreaChart, PieChart in AdminDashboard)
- **Backend**: Supabase (browser client only — no SSR)
- **Port**: reads `PORT` env var

### Required Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

### Design System
- **Primary**: Blue-600 (`#2563EB`) throughout all panels
- **Page background**: `#F4F6FB` (all dashboard pages)
- **Admin sidebar**: dark `slate-900`
- **Landlord/User sidebar**: white with `border-r border-gray-100`
- **Cards**: white, `rounded-2xl`, `border border-gray-100`, `shadow-sm`
- Old green palette (`#6b9e6e`, `#aadb5a`) fully removed — use blue everywhere

### Sidebar Collapse (all three panels)
- **Toggle**: `PanelLeftClose` / `PanelLeftOpen` button at sidebar footer
- **Expanded**: `w-64` — shows logo, labels, section headings, profile row
- **Collapsed**: `w-16` — icon-only, centered, `title` attr for native tooltip
- **Persistence**: `localStorage` per role key (`admin-sidebar-collapsed`, `landlord-sidebar-collapsed`, `user-sidebar-collapsed`)
- **Transition**: `transition-all duration-300 ease-in-out` on the `<aside>` width
- **Mobile**: unchanged — hamburger button + full-width slide-in drawer

### Key Components
- `src/components/AdminSidebar.tsx` — dark slate-900 collapsible sidebar
- `src/components/LandlordSidebar.tsx` — white collapsible sidebar, blue accents
- `src/components/UserSidebar.tsx` — white collapsible sidebar, blue accents (extracted)
- `src/components/AuthGuard.tsx` — route guard (`require: 'admin' | 'landlord' | 'tenant' | 'any'`)
- `src/components/PublicNavbar.tsx` — public site navbar
- `src/components/PropertyCard.tsx` — listing card

### Pages & Routes

**Public:**
- `/` — Home page with hero, search, property listings, city cards
- `/listings` — Filterable property listings
- `/listings/:id` — Property detail with gallery and enquiry form
- `/about`, `/contact`, `/login`, `/register`

**Tenant (`/user`):**
- `/user` — Overview dashboard (stat cards, recent enquiries, quick actions)
- `/user/saved` — Saved properties grid with cover images
- `/user/enquiries` — Sent enquiries with filter tabs (all/open/replied/closed)
- `/user/profile` — Profile editor
- UserLayout exported from `UserDashboard.tsx` — used by all user pages

**Landlord (`/landlord`):**
- `/landlord` — Dashboard (4 stat cards, recent listings, recent enquiries, quick actions)
- `/landlord/listings` — Listings table + grid view, search, status badges
- `/landlord/listings/new` — Create listing form (multi-section, blue theme)
- `/landlord/listings/:id/edit` — Edit listing form
- `/landlord/enquiries` — Enquiries with filter tabs, WhatsApp link, mark replied/close
- `/landlord/profile` — Profile editor with avatar card + verification badge
- `/landlord/pending`, `/landlord/rejected` — Holding pages

**Admin (`/admin`):**
- `/admin` — Full dashboard (5 stat cards, AreaChart, PieChart, activity feed, KPI strip)
- `/admin/properties` — Properties with status tabs, overlay cards, grid/list view
- `/admin/landlords` — Full-width table, approve/reject, status badges
- `/admin/projects` — KPI strip, dual progress bars
- `/admin/users` — Role tabs, expandable permissions
- `/admin/settings` — Settings with side nav (platform/notifications/security/listing/billing)
- `/admin/help` — FAQ accordion, docs, support ticket form

### Auth Flow
1. Login → check `app_metadata.role === 'admin'` → redirect to `/admin`
2. Else check `landlords` table → redirect to `/landlord` (or `/landlord/pending`/`/landlord/rejected`)
3. Else redirect to `/user` (tenant)

### Supabase Tables
- `properties` — listings (type, status, price, city, bedrooms, bathrooms, featured, etc.)
- `property_images` — images linked to properties (Storage bucket: `property-images`)
- `landlords` — profiles with `status` (pending/approved/rejected) and `is_verified`
- `tenants` — tenant profiles
- `saved_properties` — tenant saved property links
- `enquiries` — messages from tenants to landlords
- `contact_messages` — contact form submissions

### Key Files
- `src/App.tsx` — Full Wouter router with all routes
- `src/lib/supabase.ts` — Supabase client factory, `isSupabaseConfigured()`, `getSupabaseImageUrl()`
- `src/lib/types.ts` — TypeScript database types
- `src/lib/auth.ts` — `isAdminUser()`, `getCurrentUser()`, `signOut()`
- `src/pages/user/UserDashboard.tsx` — Also exports `UserLayout` (used by all user sub-pages)

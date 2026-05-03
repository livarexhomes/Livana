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
- **Admin sidebar**: dark `#0c0c15`
- **Landlord/User sidebar**: dark `#0c0c15`
- **Cards**: white, `rounded-2xl`, `border border-gray-100`, `shadow-sm`
- Old green palette (`#6b9e6e`, `#aadb5a`) fully removed — use blue / dark everywhere
- **AuthGuard spinner**: dark `#0c0c15` (was incorrectly green `#aadb5a`)

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
- `/landlord/listings/new` — Create listing form (multi-section + photo upload)
- `/landlord/listings/:id/edit` — Edit listing form (existing photos + new uploads)
- `/landlord/enquiries` — Enquiries with filter tabs, WhatsApp link, mark replied/close
- `/landlord/profile` — Profile editor with avatar card + verification badge
- `/landlord/kyc` — KYC submission form (NIN, DOB, Govt ID, bank details) → sets status to 'pending'
- `/landlord/pending` — Holding page shown while KYC is under review
- `/landlord/rejected`, `/landlord/suspended` — Blocked state pages
- `/partners` — Hidden landlord signup page (not linked publicly)

**Admin (`/admin`):**
- `/admin` — Full dashboard (glassmorphic hero card + 5 stat cards, AreaChart, PieChart, activity feed)
- `/admin/properties` — Properties with status tabs, overlay cards, grid/list view
- `/admin/landlords` — Full-width table; approve/suspend/reinstate/delete; KYC status badges
- `/admin/kyc` — KYC review split panel: list of submissions + detail pane (NIN, DOB, ID, bank); approve/suspend/reject actions
- `/admin/activity` — Live activity feed: landlord signups, tenant signups, KYC submissions, property listings, enquiries; grouped by day; filterable by type
- `/admin/projects` — Admin-managed CRUD; localStorage persistence
- `/admin/users` — Team member management; localStorage persistence
- `/admin/settings` — Settings with side nav
- `/admin/help` — FAQ accordion, docs, support ticket form

### KYC Flow
1. Landlord signs up at `/partners` → `status = 'not_submitted'`
2. On login, AuthGuard detects `not_submitted` → redirects to `/landlord/kyc`
3. Landlord fills KYC form (NIN, DOB, ID type/number, bank details) → `status = 'pending'`, `kyc_submitted_at` set
4. Admin notified (bell icon shows pending KYC count) → reviews at `/admin/kyc`
5. Admin approves → `status = 'approved'`, `is_verified = true` → landlord can post listings
6. Admin can also suspend (→ `/landlord/suspended`) or reject (→ `/landlord/rejected`)

### Supabase Tables
- `properties` — listings (type, status, price, city, bedrooms, bathrooms, featured, etc.)
- `property_images` — images linked to properties (Storage bucket: `property-images`)
- `landlords` — profiles with `status` (`not_submitted`/`pending`/`approved`/`rejected`/`suspended`) and `is_verified`; KYC fields: `nin`, `dob`, `id_type`, `id_number`, `bank_name`, `account_number`, `state`, `kyc_notes`, `kyc_submitted_at`
- `tenants` — tenant profiles
- `saved_properties` — tenant saved property links
- `enquiries` — messages from tenants to landlords
- `contact_messages` — contact form submissions

### Supabase Migration
Run `SUPABASE_MIGRATION.sql` in Supabase SQL Editor to add KYC columns to the `landlords` table.

### Location Search (Nigerian State + Area)
- `src/lib/nigerianStates.ts` — exports `NIGERIAN_STATES` (37 states) and `POPULAR_AREAS` (neighbourhood suggestions per state)
- **HomePage** search card: State `<select>` dropdown + Area `<input>` text field with `<datalist>` suggestions; submits to `/listings?type=...&city=STATE&area=AREA`
- **ListingsPage** sidebar: State `<select>` filter (maps to `city` column via ilike) + Area `<input>` (maps to `address` column via ilike)
- **LandlordListingForm** Location section: State `<select>` (saves to `city` column) + Area/Neighbourhood `<input>` with datalist suggestions (saves to `address` column)

### Auth Flow
1. Login → check `app_metadata.role === 'admin'` → redirect to `/admin`
2. Else check `landlords` table:
   - `not_submitted` → `/landlord/kyc`
   - `pending` → `/landlord/pending`
   - `rejected` → `/landlord/rejected`
   - `suspended` → `/landlord/suspended`
   - `approved` → `/landlord` dashboard
3. Else check `tenants` table → if missing, auto-create from `user_metadata` → redirect to `/user`
4. **Registration**: if Supabase email confirmation is required (`session === null`), shows "Check your email" screen; if no confirmation needed, creates tenant profile and navigates to `/user`

### Key Files
- `src/App.tsx` — Full Wouter router with all routes
- `src/lib/supabase.ts` — Supabase client factory, `isSupabaseConfigured()`, `getSupabaseImageUrl()`
- `src/lib/types.ts` — TypeScript database types
- `src/lib/auth.ts` — `isAdminUser()`, `getCurrentUser()`, `signOut()`
- `src/lib/nigerianStates.ts` — Nigerian states list + popular areas per state
- `src/pages/user/UserDashboard.tsx` — Also exports `UserLayout` (used by all user sub-pages)

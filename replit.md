# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

---

## Livana Property Manager (`artifacts/property-manager`)

Nigerian real estate platform migrated from Next.js/v0 to React+Vite.

### Tech Stack
- **Framework**: React + Vite
- **Routing**: Wouter
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (browser client only — no SSR)
- **Port**: 21844 (reads `PORT` env var)

### Required Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

### Brand Colors
- Primary green: `#6b9e6e`
- Dark green: `#4a7f4d`
- Accent lime: `#aadb5a`
- Background: `#FAFAFA`
- Dark: `#0a1020`

### Pages & Routes
**Public:**
- `/` — Home page with hero, search, property listings, city cards
- `/listings` — Filterable property listings
- `/listings/:id` — Property detail with gallery and enquiry form
- `/about` — About page
- `/contact` — Contact form + FAQ
- `/login` — Login (redirects based on role)
- `/register` — Registration (tenant or landlord)

**Tenant (`/user`):**
- `/user` — Overview dashboard
- `/user/saved` — Saved properties
- `/user/enquiries` — Sent enquiries
- `/user/profile` — Profile editor

**Landlord (`/landlord`):**
- `/landlord` — Dashboard with stats and recent listings
- `/landlord/listings` — All listings table
- `/landlord/listings/new` — Create listing form
- `/landlord/listings/:id/edit` — Edit listing form
- `/landlord/enquiries` — Enquiries from tenants
- `/landlord/profile` — Profile editor
- `/landlord/pending` — Pending approval holding page
- `/landlord/rejected` — Rejected application page

**Admin (`/admin`):**
- `/admin` — Stats overview
- `/admin/landlords` — Approve/reject/verify landlords
- `/admin/properties` — Manage all properties (feature, status)

### Auth Flow
1. Login → check `app_metadata.role === 'admin'` → redirect to `/admin`
2. Else check `landlords` table → redirect to `/landlord` (or `/landlord/pending`/`/landlord/rejected`)
3. Else redirect to `/user` (tenant)

### Supabase Tables Used
- `properties` — listings with type, status, price, etc.
- `property_images` — images linked to properties (Supabase Storage bucket: `property-images`)
- `landlords` — landlord profiles with `status` (pending/approved/rejected) and `is_verified`
- `tenants` — tenant profiles
- `saved_properties` — tenant saved property links
- `enquiries` — messages from tenants to landlords
- `contact_messages` — contact form submissions (optional)

### Key Files
- `src/App.tsx` — Full Wouter router with all routes
- `src/lib/supabase.ts` — Supabase client factory, `isSupabaseConfigured()`, `getSupabaseImageUrl()`
- `src/lib/types.ts` — TypeScript database types
- `src/lib/auth.ts` — `isAdminUser()`, `getCurrentUser()`, `signOut()`
- `src/components/AuthGuard.tsx` — Route guard (require: 'admin' | 'landlord' | 'tenant' | 'any')
- `src/components/LandlordSidebar.tsx` — Landlord dashboard sidebar
- `src/components/AdminSidebar.tsx` — Admin dashboard sidebar

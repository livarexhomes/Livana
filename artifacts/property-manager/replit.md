# Livana Property Manager

Nigerian real estate platform built with React + Vite + Wouter + TailwindCSS v4 + Supabase.

## Brand
- White, Blue (#2563eb / blue-600), Black
- Font: system default (Tailwind)
- Logo: house icon in blue-600 rounded square

## Stack
- **Frontend**: React 18 + Vite + Wouter (routing) + TailwindCSS v4
- **Auth/DB**: Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- **Charts**: Recharts (admin dashboard)
- **Icons**: Lucide React

## Live Data (Supabase)
- 902+ properties
- 319+ landlords
- tenants, enquiries, saved_properties tables

## Routes
- `/` — public landing page
- `/listings` — public property listings
- `/listings/:id` — property detail
- `/login`, `/signup`, `/forgot-password` — auth pages
- `/admin` — AdminDashboard (role: admin)
- `/admin/properties` — AdminProperties
- `/admin/landlords` — AdminLandlords
- `/admin/projects` — AdminProjects
- `/admin/users` — AdminUsers
- `/admin/settings` — AdminSettings
- `/landlord/settings` — LandlordSettings (Notifications, Account, Security, WhatsApp)
- `/admin/help` — AdminHelp
- `/landlord` — LandlordDashboard (role: landlord)
- `/landlord/listings` — LandlordListings
- `/landlord/listings/new` — new listing form
- `/landlord/listings/:id/edit` — edit listing
- `/landlord/enquiries` — LandlordEnquiries
- `/landlord/profile` — LandlordProfile
- `/user` — UserDashboard (role: tenant)
- `/user/saved` — saved properties
- `/user/enquiries` — user enquiries
- `/user/profile` — user profile

## Key Components
- `AdminSidebar` — sticky desktop sidebar + mobile hamburger+drawer, auto-closes on route change
- `LandlordSidebar` — same mobile pattern as AdminSidebar, blue branding
- `UserLayout` + `UserSidebar` — user section layout with mobile hamburger (hamburger in UserLayout, drawer in UserSidebar)
- `AuthGuard` — role-based route protection (require: "admin" | "landlord" | "tenant")

## Mobile Sidebar Pattern
All sidebars follow the same pattern:
1. Desktop: `hidden md:flex w-60 sticky top-0 z-30`
2. Mobile hamburger: `md:hidden fixed top-3 left-3 z-50 w-9 h-9` (type="button")
3. Backdrop: `md:hidden fixed inset-0 z-40 bg-black/40` with CSS opacity transition
4. Drawer: `md:hidden fixed top-0 left-0 h-full w-72 z-50` with `translate-x` transition
5. All page headers use `pl-14 pr-4 md:px-8` to clear the mobile hamburger

## Page Header Pattern
```tsx
<header className="flex items-center justify-between pl-14 pr-4 md:px-8 py-4 bg-white border-b border-gray-100 shrink-0">
  <div>
    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
    <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
  </div>
  {/* optional CTA */}
</header>
```

## Notes
- `.migration-backup/artifacts/property-manager: web` workflow always fails (Next.js not installed) — ignore
- HMR overlay disabled in vite.config.ts
- Supabase lock race condition errors on first load are cosmetic dev-only noise

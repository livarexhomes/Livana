# AGENTS.md — Property Manager

Agent-facing reference for this repository. Read this before writing any code.

---

## Repo layout

```
/
├── artifacts/
│   └── property-manager/   # Next.js 15 App Router web app — the only app
├── pnpm-workspace.yaml     # Workspace + catalog definitions
├── tsconfig.base.json      # Base TS config inherited by all packages
└── .devcontainer/          # Dev container config
```

The **only production app** is `artifacts/property-manager`. All feature work goes there.

---

## Package manager

**pnpm only.** Running `npm` or `yarn` will fail — the `preinstall` script enforces this.

```bash
# Install all workspace deps
pnpm install

# Run a script in the app
pnpm --filter @workspace/property-manager <script>

# Add a dep to the app
pnpm --filter @workspace/property-manager add <package>
```

Catalog versions are defined in `pnpm-workspace.yaml`. Use `catalog:` in `package.json` instead of pinning versions manually for packages already in the catalog.

---

## Environment variables

Copy `.env.local.example` to `artifacts/property-manager/.env.local` and fill in values before running the app locally.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |

The app degrades gracefully when these are unset (Supabase calls return empty data, middleware passes through), so the home page renders without them. Auth-dependent pages will not function.

**Never commit `.env.local` or any file containing real credentials.**

---

## Running the app

```bash
# Development (from repo root)
pnpm --filter @workspace/property-manager dev
# or from the artifact directory
cd artifacts/property-manager && pnpm dev
```

The dev server binds to `0.0.0.0` and reads `$PORT` (defaults to 3000 if unset).

---

## Tech stack

| Concern | Library / version |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss` |
| Auth / DB | Supabase (`@supabase/ssr`) |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Tests | Vitest (node environment) |
| Type-check | TypeScript 5.7 |

---

## Project structure

```
src/
├── app/
│   ├── (public)/           # Public-facing pages (home, listings, about, contact)
│   ├── admin/              # Admin dashboard + login
│   ├── landlord/           # Landlord dashboard + auth
│   ├── user/               # Tenant dashboard + auth
│   ├── auth/               # Supabase auth helpers (callback, signout)
│   ├── login/              # Generic login (redirects by role)
│   └── register/           # Generic register
├── components/
│   ├── admin/              # Admin-specific UI
│   ├── landlord/           # Landlord-specific UI
│   ├── public/             # Public-facing UI
│   ├── user/               # Tenant-specific UI
│   └── ui/                 # Shared form components
└── lib/
    ├── actions/            # Server actions (contact, enquiries, properties, landlords, user)
    ├── supabase/           # Supabase client/server/middleware helpers
    ├── types/              # Shared TypeScript types (database.ts)
    └── safe-redirect.ts    # Redirect utility
```

### Routing

| Path | Audience |
|---|---|
| `/` | Public home |
| `/listings`, `/listings/[id]` | Public listings |
| `/about`, `/contact` | Public marketing |
| `/admin/login`, `/admin/**` | Admin |
| `/landlord/login`, `/landlord/register`, `/landlord/**` | Landlord |
| `/user/login`, `/user/register`, `/user/**` | Tenant |
| `/auth/callback`, `/auth/signout` | Supabase auth helpers |

Middleware in `src/middleware.ts` enforces session-based redirects for `/admin/*` and `/landlord/*`.

---

## Supabase clients

Always use the correct client for the rendering context:

| Context | Import |
|---|---|
| Server Component / Server Action | `import { createClient } from '@/lib/supabase/server'` |
| Client Component | `import { createClient } from '@/lib/supabase/client'` |
| Middleware | `import { updateSession } from '@/lib/supabase/middleware'` |

Check `isSupabaseConfigured()` before calling Supabase in code paths that must degrade gracefully.

---

## TypeScript

- `ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true` are set in `next.config.ts` — **do not rely on this**. Fix type errors; do not introduce new ones.
- Path alias `@/` maps to `src/`.
- Run `pnpm --filter @workspace/property-manager typecheck` to verify.

---

## Testing

```bash
pnpm --filter @workspace/property-manager test
pnpm --filter @workspace/property-manager test:watch
```

Tests live alongside source files as `*.test.ts`. Vitest runs in `node` environment.

---

## Next.js version note

This project uses **Next.js 15 App Router**. Key differences from older versions:

- `app/` directory only — no `pages/`.
- Server Components are the default; add `'use client'` only when needed.
- Server Actions replace API routes for mutations.
- `cookies()` and `headers()` are async in Next.js 15.
- `params` and `searchParams` in page components are Promises — `await` them.

---

## Commit conventions

Follow conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.

Example: `feat(landlord): add property image upload`

---

## What NOT to do

- Do not run `npm install` or `yarn install`.
- Do not commit `.env.local` or any secrets.
- Do not add `console.log` debug statements to committed code.
- Do not use `any` types without a comment explaining why.
- Do not use the Page Router (`pages/` directory).

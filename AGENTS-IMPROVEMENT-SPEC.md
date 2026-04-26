# AGENTS Improvement Spec

Audit date: 2026-04-26  
Auditor: Ona

---

## What was found

### Existing agent guidance

| File | Location | Status |
|---|---|---|
| `AGENTS.md` (Next.js note only) | `.migration-backup/frontend/AGENTS.md` | Buried in backup — invisible to agents working at repo root |
| `replit.md` | repo root | Good project overview, Replit-specific, not agent-optimised |
| `.devcontainer/devcontainer.json` | repo root | Minimal — universal image, no automations, no env setup |
| `.gitignore` | repo root | Correct — `.env.local` already excluded |
| No `.ona/skills/`, `.cursor/rules/`, or `AGENTS.md` at root | — | Missing |

### What was good

1. **`replit.md`** — accurate routing table, env var list, and "do not run pnpm dev at root" warning. Good raw material.
2. **`.gitignore`** — `.env.local` and `.env.*.local` already excluded. No accidental secret leakage risk.
3. **`pnpm-workspace.yaml`** — supply-chain `minimumReleaseAge` policy is documented inline. Agents can understand why they cannot install brand-new packages.
4. **Supabase client split** — `client.ts` / `server.ts` / `middleware.ts` pattern is clean and consistent. Easy to document.
5. **Test files co-located** — `*.test.ts` next to source makes test discovery obvious.

### What was missing

1. **Root `AGENTS.md`** — no agent-facing file at the repo root. The only AGENTS.md was in `.migration-backup/` (invisible).
2. **`.env.local.example`** — no template for required environment variables. Agents and new developers had to read `replit.md` and guess variable names.
3. **Dev workflow commands** — no single place listing how to run, test, and typecheck the app.
4. **Next.js 15 App Router caveats** — `params`/`searchParams` are Promises in Next.js 15; `cookies()` is async. Not documented anywhere accessible to agents.
5. **Supabase client selection rule** — which client to use in which context was implicit, not stated.
6. **Commit convention** — not documented.
7. **`ignoreBuildErrors: true` risk** — `next.config.ts` silences TS and ESLint errors during builds. No warning to agents not to rely on this.

### What was wrong

1. **`next.config.ts` has `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`** — these suppress errors silently. Agents may introduce type errors that pass CI. These flags should be removed once the codebase is clean, or at minimum flagged prominently.
2. **`devcontainer.json` uses the universal image** (~10 GB) with no automations. Cold starts are slow and no `pnpm install` or env setup runs automatically.
3. **No `PORT` default documented** — `package.json` dev script uses `$PORT` but there is no `.env.local.example` or note about what to set it to locally.
4. **`artifacts/property-manager/.gitignore` duplicates root `.gitignore`** — both exclude `.env.local`. Not wrong, but creates drift risk if one is updated and the other is not.

---

## Improvement spec

### 1. Root AGENTS.md (done)

**Status:** ✅ Created at `/workspaces/Property-manager/AGENTS.md`

**What it covers:**
- Repo layout and which artifact is primary
- pnpm-only enforcement and common commands
- Environment variables table with graceful-degradation note
- How to run the dev server (and what not to do)
- Tech stack table
- App directory structure and routing table
- Supabase client selection rule (server vs client vs middleware)
- TypeScript path alias and typecheck command
- Test commands and Vitest environment note
- Next.js 15 App Router breaking-change callouts
- Commit convention
- Explicit "do not" list

### 2. `.env.local.example` (done)

**Status:** ✅ Created at `/workspaces/Property-manager/.env.local.example`

**What it covers:**
- Both required Supabase variables with comments pointing to where to find them in the Supabase dashboard
- Instruction to copy to `artifacts/property-manager/.env.local`
- Reminder that `.env.local` is gitignored

### 3. Fix `next.config.ts` build error suppression (done)

**Status:** ✅ Completed

Fixed implicit-any TS errors in `src/lib/supabase/middleware.ts` and `src/lib/supabase/server.ts` by typing the `setAll` callback parameter with `Parameters<SetAllCookies>[0]` from `@supabase/ssr`. `pnpm typecheck` now exits clean (0 errors). Both `ignoreBuildErrors` and `ignoreDuringBuilds` flags removed from `next.config.ts`.

### 4. Improve devcontainer (done)

**Status:** ✅ Completed

Switched `.devcontainer/devcontainer.json` to `mcr.microsoft.com/devcontainers/javascript-node:22` (matches the Node 22 runtime already in use). Port 3000 forwarded with `openPreview`. `PORT=3000` set via `remoteEnv`.

Created `.ona/automations.yaml` with:
- `install` task — runs `pnpm install` on `postDevcontainerStart`
- `setup-env` task — copies `.env.local.example` → `artifacts/property-manager/.env.local` if not present (depends on `install`)
- `dev-server` service — starts `next dev` on port 3000, readiness-gated with `curl -sf http://localhost:3000`

### 5. Consolidate `.gitignore` (optional)

**Priority:** Low

`artifacts/property-manager/.gitignore` duplicates several patterns from the root `.gitignore`. Consider removing the artifact-level file and relying solely on the root, or document that the artifact-level file is intentional for standalone checkout scenarios.

### 6. Document `PORT` default (done)

**Status:** ✅ Completed

Added `PORT=3000` with explanatory comment to `.env.local.example`. Real credentials that were accidentally present in the example file have been replaced with empty placeholders.

---

## Files created by this audit

| File | Purpose |
|---|---|
| `AGENTS.md` | Root agent guidance file |
| `.env.local.example` | Environment variable template |
| `AGENTS-IMPROVEMENT-SPEC.md` | This file |

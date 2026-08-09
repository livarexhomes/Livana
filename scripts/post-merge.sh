#!/usr/bin/env bash
set -euo pipefail

# Post-merge setup runs with stdin closed. Use the dependencies already
# provisioned in the workspace rather than invoking pnpm, whose workspace
# package-manager shim may try to bootstrap a different pnpm version.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -x "$ROOT/node_modules/.bin/tsc" ]]; then
  echo "post-merge: node_modules are not provisioned; skipping local validation"
  exit 0
fi

echo "post-merge: typechecking property-manager"
"$ROOT/node_modules/.bin/tsc" -p "$ROOT/artifacts/property-manager/tsconfig.json" --noEmit

echo "post-merge: building client"
"$ROOT/artifacts/property-manager/node_modules/.bin/vite" \
  build --config "$ROOT/artifacts/property-manager/vite.config.ts"

echo "post-merge: building SSR bundle"
"$ROOT/artifacts/property-manager/node_modules/.bin/vite" \
  build --config "$ROOT/artifacts/property-manager/vite.config.ts" \
  --ssr "$ROOT/artifacts/property-manager/src/entry-server.tsx"

echo "post-merge: prerendering public routes"
node "$ROOT/scripts/prerender.mjs"

# Database migrations live in db/migrations/*.sql and are applied to the
# external Supabase project separately. There is no local db workspace or
# migration CLI in this repository, so never call a nonexistent `db` filter.
echo "post-merge: SQL migrations are external; no local migration command configured"

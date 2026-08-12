#!/bin/bash
set -e

# Resolve the actual pnpm binary, bypassing any corepack/version-enforcement shim.
# pnpm 10 enforces the packageManager field; calling via `node pnpm.cjs` skips that.
PNPM_BIN=$(readlink -f "$(which pnpm)")

node "$PNPM_BIN" install \
  --config.manage-package-manager-versions=false \
  --no-frozen-lockfile

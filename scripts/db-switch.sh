#!/bin/bash
# Gestiona Pro — Prisma provider switcher
# Usage:
#   bash scripts/db-switch.sh sqlite     # local sandbox dev (db/custom.db)
#   bash scripts/db-switch.sh postgres   # production (Neon / Vercel deploy)
#
# The canonical committed schema uses PostgreSQL. Switch to SQLite only for
# local development, and switch back before pushing to GitHub.

set -euo pipefail
SCHEMA="prisma/schema.prisma"
MODE="${1:-}"

if [ "$MODE" != "sqlite" ] && [ "$MODE" != "postgres" ]; then
  echo "Usage: bash scripts/db-switch.sh <sqlite|postgres>"
  exit 1
fi

if [ ! -f "$SCHEMA" ]; then
  echo "schema not found: $SCHEMA"
  exit 1
fi

TARGET="$MODE"
[ "$MODE" = "postgres" ] && TARGET="postgresql"

# Normalize any previous state to postgresql first, then set the requested target.
sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA"
sed -i 's/provider = "postgres"/provider = "postgresql"/' "$SCHEMA"
sed -i "s/provider = \"postgresql\"/provider = \"$TARGET\"/" "$SCHEMA"

if grep -q "provider = \"$TARGET\"" "$SCHEMA"; then
  echo "✓ schema provider is now: $TARGET"
else
  echo "✗ failed to switch provider" && exit 1
fi

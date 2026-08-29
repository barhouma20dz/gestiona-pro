#!/bin/bash
# Gestiona Pro — Prisma provider switcher
# Usage:
#   bash scripts/db-switch.sh sqlite     # local sandbox dev (db/custom.db)
#   bash scripts/db-switch.sh postgres   # local dev against a remote postgres
#
# PERMANENT SETUP (no manual switching needed for deploys):
#   - prisma/schema.prisma           = SQLite  → local dev (default state)
#   - prisma/schema.postgres.prisma  = PostgreSQL → production (Vercel build
#     reads this file via vercel.json, so pushes NEVER break the deployment)
# This script keeps both files in sync: it regenerates schema.postgres.prisma
# from schema.prisma (only the provider line differs), then switches
# schema.prisma to the requested mode for local work.

set -euo pipefail
SCHEMA="prisma/schema.prisma"
PG_SCHEMA="prisma/schema.postgres.prisma"
MODE="${1:-}"

if [ "$MODE" != "sqlite" ] && [ "$MODE" != "postgres" ]; then
  echo "Usage: bash scripts/db-switch.sh <sqlite|postgres>"
  exit 1
fi

if [ ! -f "$SCHEMA" ]; then
  echo "schema not found: $SCHEMA"
  exit 1
fi

# 1) Always regenerate the production schema from the current dev schema so
#    they never drift (models added locally are picked up automatically).
sed 's/provider = "sqlite"/provider = "postgresql"/; s/provider = "postgres"/provider = "postgresql"/' \
  "$SCHEMA" > "$PG_SCHEMA"
echo "✓ $PG_SCHEMA synced from $SCHEMA (postgresql)"

# 2) Switch the local dev schema to the requested provider.
TARGET="$MODE"
sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA"
sed -i 's/provider = "postgres"/provider = "postgresql"/' "$SCHEMA"
sed -i "s/provider = \"postgresql\"/provider = \"$TARGET\"/" "$SCHEMA"

if grep -q "provider = \"$TARGET\"" "$SCHEMA"; then
  echo "✓ $SCHEMA provider is now: $TARGET"
else
  echo "✗ failed to switch provider" && exit 1
fi

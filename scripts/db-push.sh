#!/usr/bin/env bash
# Push migrations to Supabase cloud using database password (no CLI login required).
set -euo pipefail

PROJECT_REF="qtpsjrqvjfhplhcvphev"
PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$PASSWORD" ]; then
  echo "❌ Missing database password."
  echo ""
  echo "Find it in Supabase Dashboard:"
  echo "  Project Settings → Database → Database password"
  echo ""
  echo "Then run:"
  echo "  SUPABASE_DB_PASSWORD='your-password' npm run db:push"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "Pushing migrations to qtpsjrqvjfhplhcvphev..."
npx supabase db push \
  --project-ref "$PROJECT_REF" \
  --password "$PASSWORD" \
  --yes

echo "✅ Done. Check Table Editor for profiles, companions, etc."

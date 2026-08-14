#!/usr/bin/env bash
# Push local migrations to linked Supabase cloud project.
set -euo pipefail

cd "$(dirname "$0")/.."

bash scripts/check-supabase-env.sh .env.development 2>/dev/null || {
  echo "⚠️  Env not configured — migrations can still push if supabase link is set."
}

echo "Pushing migrations to Supabase cloud..."
npx supabase db push

echo "✅ Migrations applied. Verify tables in Supabase dashboard → Table Editor."

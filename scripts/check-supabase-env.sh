#!/usr/bin/env bash
# Verify Supabase cloud env is configured before running the app or pushing migrations.
set -euo pipefail

ENV_FILE="${1:-.env.development}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing $ENV_FILE"
  echo "   Run: cp .env.example $ENV_FILE"
  echo "   Then add your Supabase cloud URL and anon key."
  echo "   See docs/SUPABASE_CLOUD_SETUP.md"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ] || [[ "$EXPO_PUBLIC_SUPABASE_URL" == *"YOUR_PROJECT_REF"* ]]; then
  echo "❌ EXPO_PUBLIC_SUPABASE_URL not set in $ENV_FILE"
  exit 1
fi

if [ -z "${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ] || [ "$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" = "your-anon-key-here" ]; then
  echo "❌ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set in $ENV_FILE"
  exit 1
fi

echo "✅ Supabase cloud env configured"
echo "   URL: $EXPO_PUBLIC_SUPABASE_URL"

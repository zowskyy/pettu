#!/usr/bin/env bash
# One-time EAS setup: login, link project, persist EAS_PROJECT_ID for app.config.ts
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE=".env.development"

echo "Pet Echo — EAS setup (Slice 02C)"
echo ""

if ! command -v node >/dev/null; then
  echo "❌ Node.js is required."
  exit 1
fi

if [ ! -f "$ENV_FILE" ] && [ -f .env.example ]; then
  cp .env.example "$ENV_FILE"
  echo "Created $ENV_FILE from .env.example — add Supabase keys if missing."
  echo ""
fi

# EAS_PROJECT_ID is read by app.config.ts (extra.eas.projectId). eas.json does not store it.
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

if [ -n "${EAS_PROJECT_ID:-}" ]; then
  echo "✅ EAS_PROJECT_ID already set in $ENV_FILE"
  echo "   $EAS_PROJECT_ID"
  echo ""
  echo "Next: npm run build:android:dev"
  exit 0
fi

echo "Step 1/3 — Log in to Expo"
echo "  (Opens browser or prompts for username/password)"
echo ""
if ! npx eas whoami >/dev/null 2>&1; then
  npx eas login
else
  echo "Already logged in as: $(npx eas whoami 2>/dev/null)"
fi

echo ""
echo "Step 2/3 — Link this repo to an EAS project"
echo "  (Creates or links @your-account/pet-echo on expo.dev)"
echo ""
npx eas init

echo ""
echo "Step 3/3 — Save project ID to $ENV_FILE"
PROJECT_ID="$(npx eas project:info 2>/dev/null | awk '/^ID/{print $2; exit}')"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Could not read project ID after eas init."
  echo "   Run: npx eas project:info"
  echo "   Then add to $ENV_FILE: EAS_PROJECT_ID=<uuid>"
  exit 1
fi

if grep -q '^EAS_PROJECT_ID=' "$ENV_FILE" 2>/dev/null; then
  sed -i "s/^EAS_PROJECT_ID=.*/EAS_PROJECT_ID=$PROJECT_ID/" "$ENV_FILE"
else
  {
    echo ""
    echo "# EAS project (app.config.ts extra.eas.projectId)"
    echo "EAS_PROJECT_ID=$PROJECT_ID"
  } >> "$ENV_FILE"
fi

echo "✅ Wrote EAS_PROJECT_ID=$PROJECT_ID to $ENV_FILE"
echo ""
echo "Next: npm run build:android:dev"

#!/usr/bin/env bash
# Interactive EAS setup for Android builds.
set -euo pipefail

echo "Pet Echo — EAS Android setup"
echo ""

if ! command -v node >/dev/null; then
  echo "❌ Node.js required"
  exit 1
fi

cd "$(dirname "$0")/.."

if [ ! -f .env.development ] && [ -f .env.example ]; then
  cp .env.example .env.development
  echo "Created .env.development from template — add Supabase keys if missing."
fi

echo "Step 1: Log in to Expo"
npx eas login

echo ""
echo "Step 2: Link EAS project (creates projectId)"
npx eas init

echo ""
echo "Step 3: Build development APK"
echo "Run: npm run build:android:dev"
echo ""
echo "When build completes, download APK from the URL shown and install on your Android phone."

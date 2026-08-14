#!/usr/bin/env bash
# Non-interactive EAS development APK build (Slice 02C)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE=".env.development"

if ! npx eas whoami >/dev/null 2>&1; then
  echo "❌ Not logged in to Expo."
  echo ""
  echo "Run the one-time setup:"
  echo "  npm run eas:setup"
  echo ""
  echo "Or log in manually:"
  echo "  npx eas login"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
fi

if [ -z "${EAS_PROJECT_ID:-}" ]; then
  echo "❌ EAS_PROJECT_ID is not set."
  echo ""
  echo "app.config.ts reads extra.eas.projectId from EAS_PROJECT_ID in $ENV_FILE."
  echo "Run the one-time setup:"
  echo "  npm run eas:setup"
  exit 1
fi

echo "Building development APK on EAS (profile: development)..."
echo "Logged in as: $(npx eas whoami 2>/dev/null)"
echo ""

npx eas-cli@latest build --profile development --platform android --non-interactive

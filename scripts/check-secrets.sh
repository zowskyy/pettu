#!/usr/bin/env bash
# Slice 03 security gate: grep client bundle for server secrets
set -euo pipefail

FORBIDDEN=(
  "SUPABASE_SERVICE_ROLE_KEY"
  "AI_PROVIDER_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "service_role"
)

echo "Scanning for server secrets in client-accessible files..."

FOUND=0
for pattern in "${FORBIDDEN[@]}"; do
  if rg -l "$pattern" \
    --glob '!node_modules/**' \
    --glob '!.env.server*' \
    --glob '!supabase/**' \
    --glob '!scripts/**' \
    --glob '!*.md' \
    . 2>/dev/null; then
    echo "FAIL: Found forbidden pattern: $pattern"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo "Security gate FAILED"
  exit 1
fi

echo "Security gate PASSED — no server secrets in client bundle"

#!/usr/bin/env bash
# Opens Supabase SQL Editor and prints copy-paste instructions.
set -euo pipefail

REF="qtpsjrqvjfhplhcvphev"
SQL_FILE="$(dirname "$0")/../supabase/APPLY_ALL.sql"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Pet Echo — Apply database schema (one-time, ~30 seconds)   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Open this link in your browser:"
echo "   https://supabase.com/dashboard/project/${REF}/sql/new"
echo ""
echo "2. Open the file supabase/APPLY_ALL.sql in this repo"
echo "   (or run: cat supabase/APPLY_ALL.sql)"
echo ""
echo "3. Select ALL → Copy → Paste into SQL Editor → Click RUN"
echo ""
echo "4. When done, tell the agent: \"SQL applied\""
echo ""
echo "File: ${SQL_FILE} ($(wc -l < "$SQL_FILE") lines)"
echo ""

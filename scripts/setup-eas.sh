#!/usr/bin/env bash
# Back-compat alias — use scripts/eas-setup.sh
exec "$(dirname "$0")/eas-setup.sh" "$@"

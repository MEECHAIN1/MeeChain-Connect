#!/usr/bin/env bash
set -euo pipefail

TIMEOUT="${1:-10}"

TARGETS=(
  "https://rpc.meechain.live/rpc"
  "https://origin-rpc.meechain.live/rpc"
)

fail=0
for target in "${TARGETS[@]}"; do
  printf '\n=== Verifying %s ===\n' "$target"
  if bash scripts/verify-rpc-endpoint.sh "$target" "$TIMEOUT"; then
    echo "✅ ${target} OK"
  else
    echo "❌ ${target} FAILED"
    fail=1
  fi
done

exit $fail

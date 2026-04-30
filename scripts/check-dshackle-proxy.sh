#!/usr/bin/env bash
set -euo pipefail

DSHACKLE_URL="${1:-http://127.0.0.1:12448}"

payload='{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'

echo "Checking Dshackle proxy: $DSHACKLE_URL"
resp=$(curl -sS -m 8 -H 'content-type: application/json' --data "$payload" "$DSHACKLE_URL")
echo "$resp"

if ! echo "$resp" | grep -q '"jsonrpc":"2.0"'; then
  echo "❌ Invalid JSON-RPC response from Dshackle"
  exit 1
fi

echo "✅ Dshackle JSON-RPC reachable"

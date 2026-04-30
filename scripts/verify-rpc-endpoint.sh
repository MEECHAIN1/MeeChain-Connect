#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${1:-https://rpc.meechain.live/rpc}"
TIMEOUT="${2:-10}"

json_rpc_payload='{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'

status_get=$(curl -sS -m "$TIMEOUT" -o /tmp/rpc-get-body.$$ -w '%{http_code}' "$RPC_URL" || true)
status_post=$(curl -sS -m "$TIMEOUT" -o /tmp/rpc-post-body.$$ -w '%{http_code}' \
  -H 'content-type: application/json' \
  --data "$json_rpc_payload" \
  "$RPC_URL" || true)

echo "RPC URL: $RPC_URL"
echo "GET status : ${status_get:-n/a}"
echo "POST status: ${status_post:-n/a}"

if [[ -s /tmp/rpc-get-body.$$ ]]; then
  echo "GET body (first 200 chars):"
  head -c 200 /tmp/rpc-get-body.$$; echo
fi

if [[ -s /tmp/rpc-post-body.$$ ]]; then
  echo "POST body (first 200 chars):"
  head -c 200 /tmp/rpc-post-body.$$; echo
fi

if [[ "$status_post" != "200" ]]; then
  echo "❌ POST JSON-RPC check failed (status=$status_post)"
  rm -f /tmp/rpc-get-body.$$ /tmp/rpc-post-body.$$
  exit 1
fi

if ! grep -q '"jsonrpc"' /tmp/rpc-post-body.$$; then
  echo "❌ POST returned non JSON-RPC payload"
  rm -f /tmp/rpc-get-body.$$ /tmp/rpc-post-body.$$
  exit 1
fi

echo "✅ POST JSON-RPC check passed"
rm -f /tmp/rpc-get-body.$$ /tmp/rpc-post-body.$$

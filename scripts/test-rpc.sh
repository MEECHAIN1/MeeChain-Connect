#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/test-rpc.sh [rpc_url] [health_url]
# Example:
#   bash scripts/test-rpc.sh https://rpc.meechain.live/rpc https://rpc.meechain.live/health

RPC_URL="${1:-https://rpc.meechain.live/rpc}"
HEALTH_URL="${2:-https://rpc.meechain.live/health}"
TIMEOUT="${RPC_TEST_TIMEOUT:-10}"
CF_ACCESS_CLIENT_ID="${CF_ACCESS_CLIENT_ID:-}"
CF_ACCESS_CLIENT_SECRET="${CF_ACCESS_CLIENT_SECRET:-}"

tmp_headers="$(mktemp)"
tmp_body="$(mktemp)"
trap 'rm -f "$tmp_headers" "$tmp_body"' EXIT

post_json() {
  local url="$1"
  local payload="$2"
  local -a headers=(-H 'content-type: application/json')
  if [[ -n "$CF_ACCESS_CLIENT_ID" && -n "$CF_ACCESS_CLIENT_SECRET" ]]; then
    headers+=(-H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}")
    headers+=(-H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")
  fi
  curl -sS -m "$TIMEOUT" -D "$tmp_headers" -o "$tmp_body" \
    "${headers[@]}" \
    --data "$payload" \
    "$url"
}

get_url() {
  local url="$1"
  local -a headers=()
  if [[ -n "$CF_ACCESS_CLIENT_ID" && -n "$CF_ACCESS_CLIENT_SECRET" ]]; then
    headers+=(-H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}")
    headers+=(-H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")
  fi
  curl -sS -m "$TIMEOUT" -D "$tmp_headers" -o "$tmp_body" "${headers[@]}" "$url"
}

status_code() {
  awk 'toupper($1) ~ /^HTTP/ {code=$2} END{print code}' "$tmp_headers"
}

assert_not_access_redirect() {
  local location
  location="$(awk 'tolower($1)=="location:" {print $2}' "$tmp_headers" | tr -d '\r' || true)"
  if [[ "${location:-}" == *"cloudflareaccess.com"* ]]; then
    echo "❌ blocked by Cloudflare Access redirect: $location"
    exit 1
  fi
}

assert_chain_id() {
  local expected="0x344e"
  local actual
  actual="$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(j.result||'');" "$tmp_body")"
  if [[ "$actual" != "$expected" ]]; then
    echo "❌ eth_chainId mismatch. expected=${expected} actual=${actual}"
    cat "$tmp_body"
    exit 1
  fi
  echo "✅ eth_chainId = ${actual}"
}

assert_batch() {
  local count
  count="$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(Array.isArray(j)?j.length:0)" "$tmp_body")"
  if [[ "$count" -lt 2 ]]; then
    echo "❌ batch response invalid"
    cat "$tmp_body"
    exit 1
  fi
  echo "✅ batch response count = ${count}"
}

echo "== health check: ${HEALTH_URL} =="
if [[ -n "$CF_ACCESS_CLIENT_ID" && -n "$CF_ACCESS_CLIENT_SECRET" ]]; then
  echo "ℹ️ using Cloudflare Access service token headers"
fi
get_url "$HEALTH_URL"
assert_not_access_redirect
code="$(status_code)"
if [[ "$code" != "200" ]]; then
  echo "❌ health HTTP status: ${code}"
  cat "$tmp_headers"
  cat "$tmp_body"
  exit 1
fi
echo "✅ health status HTTP ${code}"

echo "== rpc single: ${RPC_URL} =="
post_json "$RPC_URL" '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
assert_not_access_redirect
code="$(status_code)"
if [[ "$code" != "200" ]]; then
  echo "❌ rpc single HTTP status: ${code}"
  cat "$tmp_headers"
  cat "$tmp_body"
  exit 1
fi
assert_chain_id

echo "== rpc batch: ${RPC_URL} =="
post_json "$RPC_URL" '[{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]},{"jsonrpc":"2.0","id":2,"method":"web3_clientVersion","params":[]}]'
assert_not_access_redirect
code="$(status_code)"
if [[ "$code" != "200" ]]; then
  echo "❌ rpc batch HTTP status: ${code}"
  cat "$tmp_headers"
  cat "$tmp_body"
  exit 1
fi
assert_batch

echo "✅ RPC smoke test passed"

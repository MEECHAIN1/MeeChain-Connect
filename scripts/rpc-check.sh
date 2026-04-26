#!/usr/bin/env bash
# ============================================================
# MeeChain RPC Ritual Health Check
# Usage:
#   bash scripts/rpc-check.sh
# Optional env overrides:
#   RPC_LIST_CSV="https://rpc.meechain.live,https://fallback1.meechain.live"
#   RESOLVERS_CSV="1.1.1.1,8.8.8.8"
# ============================================================

set -u

RPC_LIST=("https://rpc.meechain.live" "https://fallback1.meechain.live" "https://fallback2.meechain.live")
RESOLVERS=("1.1.1.1" "8.8.8.8")
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"

if [[ -n "${RPC_LIST_CSV:-}" ]]; then
  IFS=',' read -r -a RPC_LIST <<< "$RPC_LIST_CSV"
fi
if [[ -n "${RESOLVERS_CSV:-}" ]]; then
  IFS=',' read -r -a RESOLVERS <<< "$RESOLVERS_CSV"
fi

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✅${NC} $*"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $*"; }
err()  { echo -e "${RED}❌${NC} $*"; }
info() { echo -e "${CYAN}ℹ️${NC}  $*"; }

DIG_AVAILABLE=0
JQ_AVAILABLE=0
if command -v dig >/dev/null 2>&1; then DIG_AVAILABLE=1; fi
if command -v jq >/dev/null 2>&1; then JQ_AVAILABLE=1; fi

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

pass_check() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

fail_check() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

extract_host() {
  local url="$1"
  echo "$url" | awk -F/ '{print $3}'
}

check_dns() {
  local host="$1"
  echo "🔍 DNS check for $host"

  if [[ $DIG_AVAILABLE -eq 0 ]]; then
    warn "dig not found; skipping resolver-based DNS checks"
    fail_check
    return
  fi

  local any_success=0
  local raw_output
  local output
  for resolver in "${RESOLVERS[@]}"; do
    raw_output="$(dig @"$resolver" +short "$host" 2>/dev/null || true)"
    output="$(echo "$raw_output" | sed '/^\s*$/d; /^\s*;/d' | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
    if [[ -n "$output" ]]; then
      ok "Resolver $resolver -> $output"
      any_success=1
      pass_check
    else
      warn "Resolver $resolver failed to resolve $host"
      fail_check
    fi
  done

  if [[ $any_success -eq 0 ]]; then
    err "DNS unresolved across all configured resolvers for $host"
  fi
}

rpc_call() {
  local url="$1"
  local method="$2"

  local response
  response="$(curl -sS --max-time "$CURL_TIMEOUT" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":[]}" \
    "$url" 2>/dev/null)"

  if [[ -z "$response" ]]; then
    warn "$method -> empty response"
    fail_check
    return
  fi

  if [[ $JQ_AVAILABLE -eq 1 ]]; then
    if ! echo "$response" | jq -e . >/dev/null 2>&1; then
      warn "$method -> non-JSON response"
      info "Raw response: $response"
      fail_check
      return
    fi

    if echo "$response" | jq -e '.error' >/dev/null 2>&1; then
      warn "$method -> RPC error: $(echo "$response" | jq -c '.error' 2>/dev/null)"
      fail_check
      return
    fi

    local result
    result="$(echo "$response" | jq -r '.result // empty')"
    if [[ -n "$result" ]]; then
      ok "$method -> $result"
      pass_check
    else
      warn "$method -> missing result"
      fail_check
    fi
  else
    if echo "$response" | grep -q '"result"'; then
      ok "$method -> response includes result"
      pass_check
    else
      warn "$method -> could not validate result (jq not installed)"
      fail_check
    fi
    info "Raw response: $response"
  fi
}

check_rpc() {
  local url="$1"
  echo "⛓️ RPC check for $url"
  rpc_call "$url" "eth_chainId"
  rpc_call "$url" "eth_blockNumber"
}

measure_latency() {
  local url="$1"
  echo "⏱️ Latency test for $url"

  local timing
  timing="$(curl -o /dev/null -sS --max-time "$CURL_TIMEOUT" -w '%{time_total}' "$url" 2>/dev/null || true)"

  if [[ -n "$timing" ]]; then
    ok "Time: ${timing}s"
    pass_check
  else
    warn "Latency check failed"
    fail_check
  fi
}

print_summary() {
  echo "-----------------------------------"
  echo "🎉 Badge Claimed — RPC ritual completed"
  echo "Checks: $TOTAL_CHECKS total | $PASSED_CHECKS passed | $FAILED_CHECKS failed"

  if [[ $FAILED_CHECKS -eq 0 ]]; then
    ok "RPC health check completed successfully"
    return 0
  fi

  warn "RPC health check completed with failures"
  return 1
}

main() {
  echo "MeeChain RPC Ritual Health Check"
  echo "DNS resolvers: ${RESOLVERS[*]}"
  echo "RPC endpoints: ${RPC_LIST[*]}"
  echo "-----------------------------------"

  for rpc in "${RPC_LIST[@]}"; do
    local host
    host="$(extract_host "$rpc")"
    check_dns "$host"
    check_rpc "$rpc"
    measure_latency "$rpc"
    echo "-----------------------------------"
  done

  print_summary
}

main "$@"

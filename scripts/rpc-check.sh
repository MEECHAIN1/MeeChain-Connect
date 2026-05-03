#!/usr/bin/env bash
# ============================================================
# MeeChain RPC Ritual Health Check
# Usage:
#   bash scripts/rpc-check.sh
# Optional env overrides:
#   RPC_LIST_CSV="https://rpc.meechain.live,https://fallback1.meechain.live"
#   RESOLVERS_CSV="1.1.1.1,8.8.8.8"
# CLI:
#   bash scripts/rpc-check.sh --target rpc.meechain.net
#   bash scripts/rpc-check.sh --rpc-url https://rpc.meechain.net/rpc
# ============================================================

set -u

RPC_LIST=("https://rpc.meechain.live" "https://fallback1.meechain.live" "https://fallback2.meechain.live")
RESOLVERS=("1.1.1.1" "8.8.8.8")
CONFIG_FILES=("config/dshackle/provider.example.yaml" "config/dshackle/provider.local.yaml")
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"

if [[ -n "${RPC_LIST_CSV:-}" ]]; then
  IFS=',' read -r -a RPC_LIST <<< "$RPC_LIST_CSV"
fi
if [[ -n "${RESOLVERS_CSV:-}" ]]; then
  IFS=',' read -r -a RESOLVERS <<< "$RESOLVERS_CSV"
fi
if [[ -n "${CONFIG_FILES_CSV:-}" ]]; then
  IFS=',' read -r -a CONFIG_FILES <<< "$CONFIG_FILES_CSV"
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
    return 1
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
    return 1
  fi

  return 0
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

  local before_failed=$FAILED_CHECKS
  rpc_call "$url" "eth_chainId"
  rpc_call "$url" "eth_blockNumber"

  if [[ $FAILED_CHECKS -gt $before_failed ]]; then
    return 1
  fi
  return 0
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


check_config() {
  local host="$1"
  echo "🔍 Config check for $host"

  local found_files=0
  local matched_files=0
  for file in "${CONFIG_FILES[@]}"; do
    if [[ -f "$file" ]]; then
      found_files=1
      if grep -q "$host" "$file"; then
        ok "Config verified in $file"
        pass_check
        matched_files=1
      else
        warn "Host $host not found in $file"
        fail_check
      fi
    else
      warn "Config file missing: $file"
      fail_check
    fi
  done

  if [[ $found_files -eq 0 ]]; then
    err "No config files found for verification"
  fi

  if [[ $matched_files -gt 0 ]]; then
    echo "⚙️ Config Verified"
    return 0
  fi

  return 1
}

print_badge_overlay() {
  cat <<'EOF'
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   ✅ MeeChain Contributor Onboarded   ┃
┃                                      ┃
┃   🌐 DNS Ready                       ┃
┃   🔗 RPC Ready                       ┃
┃   ⚙️ Config Verified                  ┃
┃   🎉 Onboarding Complete → Badge!     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
EOF
}

print_summary() {
  echo "-----------------------------------"
  echo "✅ DNS Ready → 🔗 RPC Ready → ⚙️ Config Verified → 🎉 Badge Claimed"
  echo "Checks: $TOTAL_CHECKS total | $PASSED_CHECKS passed | $FAILED_CHECKS failed"

  if [[ $FAILED_CHECKS -eq 0 ]]; then
    ok "RPC health check completed successfully"
    print_badge_overlay
    return 0
  fi

  warn "RPC health check completed with failures"
  return 1
}


parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --target)
        if [[ -z "${2:-}" ]]; then
          err "--target requires a host, e.g. --target rpc.meechain.net"
          exit 2
        fi
        RPC_LIST=("https://$2")
        shift 2
        ;;
      --rpc-url)
        if [[ -z "${2:-}" ]]; then
          err "--rpc-url requires a full URL, e.g. --rpc-url https://rpc.meechain.net/rpc"
          exit 2
        fi
        RPC_LIST=("$2")
        shift 2
        ;;
      --help|-h)
        cat <<'EOF'
Usage: bash scripts/rpc-check.sh [--target <host> | --rpc-url <url>]

Options:
  --target <host>   Check only one RPC host (https://<host>)
  --rpc-url <url>   Check one explicit RPC URL
  -h, --help        Show this help
EOF
        exit 0
        ;;
      *)
        err "Unknown argument: $1"
        exit 2
        ;;
    esac
  done
}

main() {
  echo "MeeChain RPC Ritual Health Check"
  echo "DNS resolvers: ${RESOLVERS[*]}"
  echo "RPC endpoints: ${RPC_LIST[*]}"
  echo "Config files: ${CONFIG_FILES[*]}"
  echo "-----------------------------------"

  for rpc in "${RPC_LIST[@]}"; do
    local host
    host="$(extract_host "$rpc")"
    if check_dns "$host"; then
      echo "🌐 DNS Ready"
    fi

    if check_rpc "$rpc"; then
      echo "🔗 RPC Ready"
    fi

    check_config "$host"
    measure_latency "$rpc"
    echo "-----------------------------------"
  done

  print_summary
}

parse_args "$@"
main

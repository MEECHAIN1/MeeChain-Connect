#!/usr/bin/env bash
set -euo pipefail

# usage prints the help message describing the script's command-line arguments, examples, and environment variables.

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/test-production.sh [base_url] [--also url] [--insecure] [--skip-app] [--skip-network] [--timeout seconds]

Examples:
  bash scripts/test-production.sh https://rpc.meechain.live
  bash scripts/test-production.sh https://rpc.meechain.live --also https://explicitly-browse-placement.trycloudflare.com
  bash scripts/test-production.sh https://speaker-marshall-stations-antonio.trycloudflare.com/favicon.ico
  bash scripts/test-production.sh https://localhost:8445 --insecure --skip-network
  EXPECT_UPSTREAM_CONNECTED=1 bash scripts/test-production.sh https://rpc.meechain.live
  EXPECTED_CNAME_TARGET=74d57437-86f8-47ee-91fa-5260b04a5ba3.cfargotunnel.com bash scripts/test-production.sh https://rpc.meechain.live

Notes:
  Pass the public origin that clients use, for example https://rpc.meechain.live.
  Temporary trycloudflare.com quick-tunnel URLs rotate after stop/restart, so update
  the DNS/CNAME target and any --also URL to the currently active tunnel.
  If you paste an asset URL such as /favicon.ico from a tunnel app, the script
  automatically normalizes it to the origin before checking endpoints.
  Set PROD_TEST_ADDITIONAL_URLS to a comma-separated list to validate standby URLs.
  Set EXPECT_UPSTREAM_CONNECTED=1 to fail when /api/web3/status reports degraded.
  Set EXPECTED_CNAME_TARGET to verify a named Cloudflare Tunnel CNAME target.
  Set EXPECTED_CNAME_STRICT=1 to fail instead of warn when CNAME is hidden/mismatched.
USAGE
}

BASE_URL="${1:-https://rpc.meechain.live}"
if [[ "$BASE_URL" == --* ]]; then
  BASE_URL="https://rpc.meechain.live"
else
  shift || true
fi

TIMEOUT="${PROD_TEST_TIMEOUT:-10}"
EXPECTED_CHAIN_ID_HEX="${EXPECTED_CHAIN_ID_HEX:-0x344e}"
EXPECTED_CHAIN_ID_DEC="${EXPECTED_CHAIN_ID_DEC:-13390}"
EXPECTED_APP_TEXT="${EXPECTED_APP_TEXT:-MeeChain}"
EXPECT_UPSTREAM_CONNECTED="${EXPECT_UPSTREAM_CONNECTED:-0}"
EXPECTED_CNAME_TARGET="${EXPECTED_CNAME_TARGET:-}"
EXPECTED_CNAME_STRICT="${EXPECTED_CNAME_STRICT:-0}"
CF_ACCESS_CLIENT_ID="${CF_ACCESS_CLIENT_ID:-}"
CF_ACCESS_CLIENT_SECRET="${CF_ACCESS_CLIENT_SECRET:-}"
INSECURE=0
SKIP_NETWORK=0
SKIP_APP=0
ADDITIONAL_BASE_URLS=()
if [[ -n "${PROD_TEST_ADDITIONAL_URLS:-}" ]]; then
  IFS=',' read -r -a ADDITIONAL_BASE_URLS <<< "$PROD_TEST_ADDITIONAL_URLS"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --insecure|-k)
      INSECURE=1
      shift
      ;;
    --skip-network)
      SKIP_NETWORK=1
      shift
      ;;
    --skip-app)
      SKIP_APP=1
      shift
      ;;
    --also)
      ADDITIONAL_BASE_URLS+=("${2:?--also requires a URL}")
      shift 2
      ;;
    --timeout)
      TIMEOUT="${2:?--timeout requires a value}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

TMP_DIR="$(mktemp -d)"
HEADERS="$TMP_DIR/headers"
BODY="$TMP_DIR/body"
trap 'rm -rf "$TMP_DIR"' EXIT

# pass prints the provided message prefixed with a checkmark (✅) to stdout.
pass() { echo "✅ $*"; }
# fail prints an error message to stderr and exits the script with code 1.
fail() { echo "❌ $*" >&2; exit 1; }
# warn prints a warning message to stdout with a warning emoji prefix.
warn() { echo "⚠️  $*"; }
# info พิมพ์ข้อความข้อมูลไปยัง stdout พร้อมคำนำหน้า ℹ️
info() { echo "ℹ️  $*"; }

# require_cmd ตรวจสอบว่าคำสั่งมีอยู่ใน PATH หากไม่พบจะหยุดสคริปต์ด้วยข้อผิดพลาด
require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "required command not found: $cmd"
  fi
}

# normalize_url แปลง URL ให้เป็น origin (แบบแผน โฮสต์ และพอร์ต) และส่งออกไปยัง stdout หรือล้มเหลวหากกำหนด URL ไม่ถูกต้อง
normalize_url() {
  local raw="$1"
  local original="${raw%/}"
  local normalized
  if ! normalized="$(node -e "const u = new URL(process.argv[1]); console.log(u.origin);" "$raw" 2>/dev/null)"; then
    fail "invalid base URL: $raw"
  fi
  if [[ "$normalized" != "$original" ]]; then
    info "base URL included a path/query/fragment; using origin: $normalized" >&2
  fi
  printf '%s\n' "$normalized"
}

CURL_ARGS=(-sS -m "$TIMEOUT")
if [[ "$INSECURE" -eq 1 ]]; then
  CURL_ARGS+=(-k)
fi

ACCESS_HEADERS=()
if [[ -n "$CF_ACCESS_CLIENT_ID" && -n "$CF_ACCESS_CLIENT_SECRET" ]]; then
  ACCESS_HEADERS+=(-H "CF-Access-Client-Id: ${CF_ACCESS_CLIENT_ID}")
  ACCESS_HEADERS+=(-H "CF-Access-Client-Secret: ${CF_ACCESS_CLIENT_SECRET}")
fi

# status_code extracts and prints the HTTP status code from the response headers file.
status_code() {
  awk 'toupper($1) ~ /^HTTP/ {code=$2} END{print code}' "$HEADERS"
}

# assert_no_access_redirect fails if a Cloudflare Access redirect is detected in the HTTP response headers.
assert_no_access_redirect() {
  local location
  location="$(awk 'tolower($1)=="location:" {print $2}' "$HEADERS" | tr -d '\r' || true)"
  if [[ "${location:-}" == *"cloudflareaccess.com"* ]]; then
    fail "blocked by Cloudflare Access redirect: $location"
  fi
}

# curl_get performs an HTTP GET request to the specified URL and saves the response headers and body for subsequent validation.
curl_get() {
  local url="$1"
  if ! curl "${CURL_ARGS[@]}" -D "$HEADERS" -o "$BODY" "${ACCESS_HEADERS[@]}" "$url"; then
    fail "GET failed for $url"
  fi
}

# curl_post_json posts JSON to the specified URL and saves the response.
curl_post_json() {
  local url="$1"
  local payload="$2"
  if ! curl "${CURL_ARGS[@]}" -D "$HEADERS" -o "$BODY" \
    "${ACCESS_HEADERS[@]}" \
    -H 'content-type: application/json' \
    --data "$payload" \
    "$url"; then
    fail "POST JSON failed for $url"
  fi
}

# assert_http_200 validates that the most recent HTTP response has status code 200.
assert_http_200() {
  local label="$1"
  local code
  code="$(status_code)"
  assert_no_access_redirect
  if [[ "$code" != "200" ]]; then
    echo "--- response headers ---" >&2
    cat "$HEADERS" >&2
    echo "--- response body ---" >&2
    cat "$BODY" >&2
    fail "$label returned HTTP ${code:-n/a}, expected 200"
  fi
  pass "$label HTTP 200"
}

# json_field อ่านข้อมูล JSON จากการตอบสนอง ประเมินนิพจน์ที่ให้มา และแสดงผลลัพธ์ หรือออกจากโปรแกรมด้วยรหัส 3 หากค่าไม่มีหรือเป็น null
json_field() {
  local expression="$1"
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const value=($expression); if (value === undefined || value === null) process.exit(3); console.log(typeof value === 'object' ? JSON.stringify(value) : value);" "$BODY"
}

# assert_json_field_equals ตรวจสอบว่าเขตข้อมูล JSON ของการตอบสนองตรงกับค่าที่คาดหวัง
assert_json_field_equals() {
  local label="$1"
  local expression="$2"
  local expected="$3"
  local actual
  actual="$(json_field "$expression")" || fail "$label missing or invalid JSON field"
  if [[ "$actual" != "$expected" ]]; then
    echo "--- response body ---" >&2
    cat "$BODY" >&2
    fail "$label expected '$expected' but got '$actual'"
  fi
  pass "$label = $actual"
}

# assert_json_field_present ตรวจสอบว่าช่องข้อมูล JSON ที่ระบุโดยนิพจน์นั้นมีอยู่และถูกต้อง
assert_json_field_present() {
  local label="$1"
  local expression="$2"
  json_field "$expression" >/dev/null || fail "$label missing or invalid JSON field"
  pass "$label present"
}

# assert_json_field_truthy_or_warn confirms a JSON field equals true, failing in strict mode (EXPECT_UPSTREAM_CONNECTED=1) or warning in lenient mode with degraded behavior noted.
assert_json_field_truthy_or_warn() {
  local label="$1"
  local expression="$2"
  local actual
  actual="$(json_field "$expression")" || fail "$label missing or invalid JSON field"
  if [[ "$actual" == "true" ]]; then
    pass "$label = true"
  elif [[ "$EXPECT_UPSTREAM_CONNECTED" == "1" ]]; then
    echo "--- response body ---" >&2
    cat "$BODY" >&2
    fail "$label expected true but got '$actual'"
  else
    warn "$label = $actual (degraded; set EXPECT_UPSTREAM_CONNECTED=1 to fail)"
  fi
}

# assert_body_contains ตรวจสอบว่าเนื้อหาการตอบสนองมีข้อความที่กำหนด
assert_body_contains() {
  local label="$1"
  local expected="$2"
  if ! node -e "const fs=require('fs'); const body=fs.readFileSync(process.argv[1], 'utf8'); process.exit(body.includes(process.argv[2]) ? 0 : 1);" "$BODY" "$expected"; then
    echo "--- response body preview ---" >&2
    head -c 500 "$BODY" >&2 || true
    echo >&2
    fail "$label did not contain expected text: $expected"
  fi
  pass "$label contains '$expected'"
}

# check_get_json ส่งคำขอ GET ไปยังจุดปลายทาง API และตรวจสอบว่าการตอบสนอง HTTP มีสถานะ 200
check_get_json() {
  local path="$1"
  local label="$2"
  info "GET ${BASE_URL}${path}"
  curl_get "${BASE_URL}${path}"
  assert_http_200 "$label"
}


# check_app_shell ตรวจสอบว่าเปลือกแอปพลิเคชันมีข้อความที่คาดหวัง
check_app_shell() {
  if [[ "$SKIP_APP" -eq 1 ]]; then
    info "skipping app shell check (--skip-app)"
    return
  fi

  check_get_json "/" "app shell"
  assert_body_contains "app shell" "$EXPECTED_APP_TEXT"
}

# check_health_endpoints validates the health status of root, API, and RPC endpoints and confirms correct chain configuration.
check_health_endpoints() {
  check_get_json "/health" "root health"
  assert_json_field_equals "root health status" "data.status" "ok"
  assert_json_field_present "root health version" "data.version"

  check_get_json "/api/health" "API health"
  assert_json_field_equals "API health status" "data.status" "ok"

  check_get_json "/rpc/health" "RPC health"
  assert_json_field_equals "RPC health status" "data.status" "ok"
  assert_json_field_equals "RPC health chainId" "String(data.chainId)" "$EXPECTED_CHAIN_ID_DEC"
  assert_json_field_present "RPC health mode" "data.mode"
}

# check_rpc_proxy ตรวจสอบจุดปลายทาง RPC proxy โดยตรวจสอบการตอบสนองรหัสเชนและหมายเลขบล็อก
check_rpc_proxy() {
  info "POST ${BASE_URL}/rpc eth_chainId"
  curl_post_json "${BASE_URL}/rpc" '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
  assert_http_200 "RPC eth_chainId"
  assert_json_field_equals "RPC eth_chainId result" "data.result" "$EXPECTED_CHAIN_ID_HEX"

  info "POST ${BASE_URL}/rpc eth_blockNumber"
  curl_post_json "${BASE_URL}/rpc" '{"jsonrpc":"2.0","id":2,"method":"eth_blockNumber","params":[]}'
  assert_http_200 "RPC eth_blockNumber"
  assert_json_field_present "RPC eth_blockNumber result" "data.result"
}

# check_network_config ตรวจสอบการกำหนดค่าเครือข่ายและสถานะการเชื่อมต่อ web3
check_network_config() {
  check_get_json "/api/network" "network config"
  assert_json_field_equals "network chainId" "String(data.chainId)" "$EXPECTED_CHAIN_ID_HEX"
  assert_json_field_equals "network chainIdDecimal" "String(data.chainIdDecimal)" "$EXPECTED_CHAIN_ID_DEC"
  assert_json_field_equals "network first rpcUrl" "data.rpcUrls && data.rpcUrls[0]" "${BASE_URL}/rpc"

  check_get_json "/api/web3/status" "web3 status"
  assert_json_field_truthy_or_warn "web3 status connected flag" "data.connected"
}


# normalize_dns_name removes trailing dots from a DNS name and converts it to lowercase.
normalize_dns_name() {
  local name="$1"
  name="${name%.}"
  printf '%s\n' "${name,,}"
}

# check_expected_cname_target validates that a host's CNAME record matches the expected target, failing or warning based on the EXPECTED_CNAME_STRICT setting.
check_expected_cname_target() {
  local host="$1"
  [[ -n "$EXPECTED_CNAME_TARGET" ]] || return

  local expected
  expected="$(normalize_dns_name "$EXPECTED_CNAME_TARGET")"
  local targets=""
  if command -v dig >/dev/null 2>&1; then
    targets="$(dig +short CNAME "$host" 2>/dev/null | sed 's/\.$//' | tr '[:upper:]' '[:lower:]' || true)"
  elif command -v nslookup >/dev/null 2>&1; then
    targets="$(nslookup -type=CNAME "$host" 2>/dev/null | awk -F'= ' '/canonical name/ {print $2}' | sed 's/\.$//' | tr '[:upper:]' '[:lower:]' || true)"
  fi

  if printf '%s\n' "$targets" | awk -v expected="$expected" 'tolower($0) == expected {found=1} END {exit found ? 0 : 1}'; then
    pass "CNAME target for $host matches $EXPECTED_CNAME_TARGET"
    return
  fi

  local message="CNAME target for $host does not visibly match $EXPECTED_CNAME_TARGET"
  if [[ -n "$targets" ]]; then
    message="$message (observed: $(printf '%s' "$targets" | paste -sd ', ' -))"
  else
    message="$message (no CNAME visible; Cloudflare orange-cloud proxy can hide the target behind edge A/AAAA records)"
  fi

  if [[ "$EXPECTED_CNAME_STRICT" == "1" ]]; then
    fail "$message"
  fi
  warn "$message"
}

# check_external_network validates DNS resolution for the base URL's hostname and checks its CNAME target against expected configuration.
check_external_network() {
  if [[ "$SKIP_NETWORK" -eq 1 ]]; then
    info "skipping external network checks (--skip-network)"
    return
  fi

  local host
  host="$(node -e "const u=new URL(process.argv[1]); console.log(u.hostname)" "$BASE_URL")"
  info "DNS lookup for $host"
  if command -v getent >/dev/null 2>&1 && getent hosts "$host" >/dev/null 2>&1; then
    pass "DNS resolves for $host"
  elif command -v nslookup >/dev/null 2>&1 && nslookup "$host" >/dev/null 2>&1; then
    pass "DNS resolves for $host"
  elif command -v dig >/dev/null 2>&1 && dig +short "$host" | awk 'NF {found=1} END {exit found ? 0 : 1}'; then
    pass "DNS resolves for $host"
  else
    fail "DNS does not resolve for $host"
  fi

  check_expected_cname_target "$host"
}

# run_checks_for_base_url orchestrates production post-deploy validation checks for a MeeChain Connect HTTP endpoint.
run_checks_for_base_url() {
  BASE_URL="$(normalize_url "$1")"

  echo "== MeeChain production validation =="
  echo "Base URL: $BASE_URL"
  echo "Timeout : ${TIMEOUT}s"
  if [[ -n "$CF_ACCESS_CLIENT_ID" && -n "$CF_ACCESS_CLIENT_SECRET" ]]; then
    info "using Cloudflare Access service token headers"
  fi
  echo ""

  check_external_network
  check_app_shell
  check_health_endpoints
  check_rpc_proxy
  check_network_config

  echo ""
  pass "production validation checklist passed for $BASE_URL"
}

# main orchestrates production post-deployment validation for the primary and additional configured base URLs.
main() {
  require_cmd curl
  require_cmd node

  local urls=("$BASE_URL")
  local extra_url
  for extra_url in "${ADDITIONAL_BASE_URLS[@]}"; do
    extra_url="${extra_url//[[:space:]]/}"
    [[ -n "$extra_url" ]] && urls+=("$extra_url")
  done

  local url
  for url in "${urls[@]}"; do
    run_checks_for_base_url "$url"
  done

  echo ""
  pass "all production validation checklists passed"
}

main "$@"

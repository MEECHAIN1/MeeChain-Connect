#!/usr/bin/env bash
set -euo pipefail

# usage() แสดงข้อความช่วยเหลือที่อธิบายวิธีการใช้งานสคริปต์ อาร์กิวเมนต์ ตัวอย่าง และตัวแปรสภาพแวดล้อม

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

# pass prints a success marker with the provided message.
pass() { echo "✅ $*"; }
# fail แสดงข้อความข้อผิดพลาดพร้อมเครื่องหมายล้มเหลวไปยัง stderr และหยุดการทำงานของสคริปต์
fail() { echo "❌ $*" >&2; exit 1; }
# warn prints a warning message prefixed with a warning emoji.
warn() { echo "⚠️  $*"; }
# info prints an informational message prefixed with an info emoji.
info() { echo "ℹ️  $*"; }

# require_cmd checks that a required command exists in PATH.
require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "required command not found: $cmd"
  fi
}

# normalize_url extracts and echoes the origin (scheme, host, and optional port) from a URL string.
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

# status_code ดึงรหัสสถานะ HTTP จากไฟล์ headers และพิมพ์ออก
status_code() {
  awk 'toupper($1) ~ /^HTTP/ {code=$2} END{print code}' "$HEADERS"
}

# assert_no_access_redirect verifies the HTTP response was not blocked by Cloudflare Access.
assert_no_access_redirect() {
  local location
  location="$(awk 'tolower($1)=="location:" {print $2}' "$HEADERS" | tr -d '\r' || true)"
  if [[ "${location:-}" == *"cloudflareaccess.com"* ]]; then
    fail "blocked by Cloudflare Access redirect: $location"
  fi
}

# curl_get ส่งคำขอ GET ไปยัง URL ที่ระบุและบันทึกส่วนหัวและเนื้อหาของการตอบสนองลงในไฟล์
curl_get() {
  local url="$1"
  if ! curl "${CURL_ARGS[@]}" -D "$HEADERS" -o "$BODY" "${ACCESS_HEADERS[@]}" "$url"; then
    fail "GET failed for $url"
  fi
}

# curl_post_json ส่งคำขอ POST พร้อมข้อมูล JSON ไปยัง URL ที่ระบุ
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

# assert_http_200 verifies that the HTTP response has status 200 and is not a Cloudflare Access redirect.
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

# json_field evaluates a JavaScript expression against the parsed body JSON and prints the result, exiting with status 3 if the value is undefined or null.
json_field() {
  local expression="$1"
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const value=($expression); if (value === undefined || value === null) process.exit(3); console.log(typeof value === 'object' ? JSON.stringify(value) : value);" "$BODY"
}

# assert_json_field_equals asserts that a JSON field from the response equals an expected value.
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

# assert_json_field_present ตรวจสอบว่าฟิลด์ JSON ที่ระบุมีอยู่ในข้อมูล JSON และมีค่าที่กำหนด
assert_json_field_present() {
  local label="$1"
  local expression="$2"
  json_field "$expression" >/dev/null || fail "$label missing or invalid JSON field"
  pass "$label present"
}

# assert_json_field_truthy_or_warn ตรวจสอบว่าฟิลด์ JSON เป็นจริง โดยล้มเหลวเมื่อ EXPECT_UPSTREAM_CONNECTED ถูกตั้งค่าเป็น 1 หรือแสดงคำเตือนเป็นอย่างอื่น
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

# assert_body_contains ยืนยันว่าเนื้อหาการตอบสนอง HTTP มีข้อความที่คาดหวัง
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

# check_get_json validates that a GET request to the specified endpoint path returns HTTP 200 status.
check_get_json() {
  local path="$1"
  local label="$2"
  info "GET ${BASE_URL}${path}"
  curl_get "${BASE_URL}${path}"
  assert_http_200 "$label"
}


# check_app_shell ตรวจสอบว่าเส้นทางรูตประกอบด้วยข้อความแอปพลิเคชันที่คาดหวัง
check_app_shell() {
  if [[ "$SKIP_APP" -eq 1 ]]; then
    info "skipping app shell check (--skip-app)"
    return
  fi

  check_get_json "/" "app shell"
  assert_body_contains "app shell" "$EXPECTED_APP_TEXT"
}

# check_health_endpoints ตรวจสอบสถานะความสุขและข้อมูลเมตาดาต้าของจุดสิ้นสุด health ในแอปพลิเคชัน API และ RPC
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

# check_rpc_proxy validates JSON-RPC proxy responses for eth_chainId and eth_blockNumber calls.
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


# normalize_dns_name normalizes a DNS name by removing a trailing dot and converting it to lowercase.
normalize_dns_name() {
  local name="$1"
  name="${name%.}"
  printf '%s\n' "${name,,}"
}

# check_expected_cname_target ตรวจสอบว่า CNAME record ของโฮสต์ตรงกับค่าเป้าหมายที่คาดหวัง
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

# check_external_network ตรวจสอบการแก้ไขชื่อ DNS สำหรับโฮสต์ของ URL ฐานและตรวจสอบการกำหนดค่า CNAME
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

# run_checks_for_base_url ดำเนินการตรวจสอบ production validation สำหรับ base URL ที่ให้มา ทดสอบเครือข่าย สถานะแอปพลิเคชัน health endpoints RPC proxy และการตั้งค่าเครือข่าย
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

# main runs production validation checks across all configured base URLs, reporting success if all pass.
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

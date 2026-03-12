#!/usr/bin/env bash
set -u

RPC_URL="${RPC_URL:-http://127.0.0.1:8548}"
APP_URL="${APP_URL:-http://127.0.0.1:3003}"
PROXY_URL="${PROXY_URL:-http://127.0.0.1:5005}"
EXPECTED_CHAIN_ID_HEX="${EXPECTED_CHAIN_ID_HEX:-0x344e}"

PASS_COUNT=0
FAIL_COUNT=0

# pass พิมพ์บรรทัดสถานะ "PASS" พร้อมข้อความที่ระบุและเพิ่มตัวนับ PASS_COUNT.
pass() {
  echo "✅ PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

# fail พิมพ์ข้อความสถานะล้มเหลว เพิ่มตัวนับ FAIL_COUNT และแสดงคำแนะนำที่กำหนดไว้.
fail() {
  echo "❌ FAIL: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "   ↳ แนะนำ: $2"
}

# print_step แสดงหัวข้อขั้นตอนในรูปแบบ "=== <ข้อความ> ===" โดยจะแทรกบรรทัดว่างไว้ก่อนหัวข้อ
print_step() {
  echo
  echo "=== $1 ==="
}

# check_port ตรวจสอบว่าพอร์ตที่ระบุของบริการ (name) กำลังรับฟังบนระบบ และเรียก `pass` เมื่อพอร์ตเปิดใช้งาน หรือ `fail` พร้อมคำแนะนำเมื่อพอร์ตไม่พร้อมใช้งาน
check_port() {
  local port="$1"
  local name="$2"
  if (command -v ss >/dev/null 2>&1 && ss -lnt 2>/dev/null | awk '{print $4}' | grep -Eq ":${port}$") \
    || (command -v lsof >/dev/null 2>&1 && lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | grep -Eq ":${port} "); then
    pass "พอร์ต ${port} (${name}) เปิดใช้งาน"
  else
    fail "พอร์ต ${port} (${name}) ไม่พร้อมใช้งาน" "ตรวจสอบว่า service ของ ${name} รันอยู่และ bind พอร์ต ${port}"
  fi
}

# check_rpc_chain_id ตรวจสอบค่า eth_chainId จาก RPC_URL และเปรียบเทียบกับ EXPECTED_CHAIN_ID_HEX.
# เรียก `pass` เมื่อค่า chain id ตรงกับ EXPECTED_CHAIN_ID_HEX; เรียก `fail` พร้อมข้อความแนะนำเมื่อ RPC ไม่ตอบหรือค่าไม่ตรงกัน.
check_rpc_chain_id() {
  local response
  response="$(curl -sS -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>/dev/null || true)"

  if [ -z "$response" ]; then
    fail "RPC eth_chainId ไม่ตอบกลับ" "เริ่ม Hardhat node ด้วย npx hardhat node --port 8548"
    return
  fi

  local chain_id
  chain_id="$(printf '%s' "$response" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write((j.result||"").toLowerCase())}catch{}})')"

  local expected_lower
  expected_lower="$(printf '%s' "$EXPECTED_CHAIN_ID_HEX" | tr '[:upper:]' '[:lower:]')"
  if [ "$chain_id" = "$expected_lower" ]; then
    pass "RPC eth_chainId ตรงตามที่คาดไว้ (${EXPECTED_CHAIN_ID_HEX})"
  else
    fail "RPC chain id ไม่ถูกต้อง (ได้: ${chain_id:-unknown}, คาดหวัง: ${EXPECTED_CHAIN_ID_HEX})" "ตรวจสอบ chain/network ที่รันอยู่ หรือกำหนด EXPECTED_CHAIN_ID_HEX ให้ตรง"
  fi
}

# check_http_json ตรวจสอบว่า URL ที่กำหนดส่งกลับข้อมูลที่เป็น JSON ที่ถูกต้อง และเรียก `pass` เมื่อเป็น JSON หรือ `fail` พร้อมข้อความแนะนำเมื่อไม่ตอบหรือส่งค่าที่ไม่ใช่ JSON
check_http_json() {
  local url="$1"
  local name="$2"
  local suggestion="$3"
  local body

  body="$(curl -sS "$url" 2>/dev/null || true)"
  if [ -z "$body" ]; then
    fail "${name} ไม่ตอบกลับ (${url})" "$suggestion"
    return
  fi

  if printf '%s' "$body" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{JSON.parse(d);process.exit(0)}catch{process.exit(1)}})'; then
    pass "${name} ตอบกลับ JSON ได้ (${url})"
  else
    fail "${name} ตอบกลับไม่ใช่ JSON" "ตรวจสอบ route ${url} และ log ของแอปพลิเคชัน"
  fi
}

print_step "1) ตรวจสอบพอร์ตหลัก"
check_port 8548 "Hardhat node"
check_port 5005 "RPC proxy"
check_port 3003 "Application server"

print_step "2) ตรวจสอบ RPC chain id (eth_chainId)"
check_rpc_chain_id

print_step "3) ตรวจสอบ API"
check_http_json "${APP_URL}/api/health" "/api/health" "เริ่มแอปด้วย npm run dev -- --port 3003 และตรวจสอบ CORS/route"
check_http_json "${APP_URL}/api/web3/status" "/api/web3/status" "ตรวจสอบ RPC_URL/CHAIN_ID ใน .env และการเชื่อมต่อ web3"

echo
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "🎉 Verification completed: ${PASS_COUNT} passed, 0 failed"
  exit 0
else
  echo "⚠️  Verification completed: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
  exit 1
fi

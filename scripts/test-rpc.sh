#!/bin/bash
# MeeChain RPC Test Script
# ทดสอบการเชื่อมต่อ RPC endpoints ทั้งหมด

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧪 MeeChain RPC Test Suite${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test function
test_rpc() {
    local name=$1
    local url=$2
    local extra_args=$3
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo -e "URL: $url"
    
    RESULT=$(curl -s -X POST $url \
      -H "Content-Type: application/json" \
      $extra_args \
      --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
      --max-time 5 || echo '{"error":"timeout"}')
    
    CHAIN_ID=$(echo $RESULT | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$CHAIN_ID" = "0x344e" ]; then
        echo -e "${GREEN}✅ PASS - Chain ID: 13390 (0x344e)${NC}"
        echo -e "Response: $RESULT"
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo -e "Response: $RESULT"
    fi
    echo ""
}

# 1. Test Local Proxy (HTTPS)
test_rpc "Local Proxy (HTTPS)" "https://127.0.0.1:5005" "--insecure"

# 2. Test Local Node (Direct)
test_rpc "Local Node (Direct)" "http://127.0.0.1:8545" ""

# 3. Test Public RPC (if available)
test_rpc "Public RPC" "https://rpc.meechain.run.place:5005" "--insecure"

# 4. Test Application API
echo -e "${YELLOW}Testing: Application Health API${NC}"
echo -e "URL: http://localhost:3000/api/health"
HEALTH=$(curl -s http://localhost:3000/api/health --max-time 5 || echo '{"error":"timeout"}')
if echo $HEALTH | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ PASS - Application healthy${NC}"
    echo -e "Response: $HEALTH"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo -e "Response: $HEALTH"
fi
echo ""

# 5. Test Web3 Status
echo -e "${YELLOW}Testing: Web3 Status API${NC}"
echo -e "URL: http://localhost:3000/api/web3/status"
WEB3=$(curl -s http://localhost:3000/api/web3/status --max-time 5 || echo '{"error":"timeout"}')
if echo $WEB3 | grep -q '"connected":true'; then
    echo -e "${GREEN}✅ PASS - Web3 connected${NC}"
    echo -e "Response: $WEB3"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo -e "Response: $WEB3"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Test suite completed${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

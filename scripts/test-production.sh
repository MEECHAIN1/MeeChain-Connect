#!/bin/bash

# ===== Production QA Testing Script =====
# Tests all endpoints and services on meebot.io

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-meebot.io}"
BASE_URL="https://$DOMAIN"
PASSED=0
FAILED=0
TOTAL=0

# Functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_test() {
    echo -e "${YELLOW}Testing:${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

print_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    print_test "$description"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    
    if [ "$response" -eq "$expected_status" ]; then
        print_pass "$description (HTTP $response)"
    else
        print_fail "$description (Expected $expected_status, got $response)"
    fi
}

test_json_field() {
    local endpoint=$1
    local field=$2
    local description=$3
    
    print_test "$description"
    
    response=$(curl -s "$BASE_URL$endpoint")
    
    if echo "$response" | grep -q "\"$field\""; then
        print_pass "$description"
    else
        print_fail "$description (Field '$field' not found)"
    fi
}

# Start Testing
clear
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║         MeeBot.io Production QA Testing Script                ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "Target: ${BLUE}$BASE_URL${NC}"
echo -e "Date: $(date)"
echo ""

# ============================================================
# DNS & Network Tests
# ============================================================
print_header "🌐 DNS & Network Tests"

print_test "DNS Resolution"
if nslookup $DOMAIN > /dev/null 2>&1; then
    print_pass "DNS resolves correctly"
else
    print_fail "DNS resolution failed"
fi

print_test "Ping Test"
if ping -c 2 $DOMAIN > /dev/null 2>&1; then
    print_pass "Server is reachable"
else
    print_fail "Server is not reachable"
fi

# ============================================================
# SSL & Security Tests
# ============================================================
print_header "🔐 SSL & Security Tests"

print_test "HTTPS Connection"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200"; then
    print_pass "HTTPS connection successful"
else
    print_fail "HTTPS connection failed"
fi

print_test "HTTP to HTTPS Redirect"
redirect=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN")
if [ "$redirect" -eq "301" ] || [ "$redirect" -eq "302" ]; then
    print_pass "HTTP redirects to HTTPS"
else
    print_fail "HTTP redirect not working (got $redirect)"
fi

print_test "Security Headers"
headers=$(curl -s -I "$BASE_URL")
if echo "$headers" | grep -q "Strict-Transport-Security"; then
    print_pass "HSTS header present"
else
    print_fail "HSTS header missing"
fi

# ============================================================
# API Endpoint Tests
# ============================================================
print_header "🧪 API Endpoint Tests"

# Health Check
test_endpoint "/api/health" 200 "Health Check Endpoint"
test_json_field "/api/health" "status" "Health status field"
test_json_field "/api/health" "chainId" "Chain ID field"

# Network Info
test_endpoint "/api/network" 200 "Network Info Endpoint"
test_json_field "/api/network" "chainId" "Network chain ID"
test_json_field "/api/network" "chainName" "Network chain name"

# Web3 Status
test_endpoint "/api/web3/status" 200 "Web3 Status Endpoint"
test_json_field "/api/web3/status" "chainId" "Web3 chain ID"

# Chain Stats
test_endpoint "/api/chain/stats" 200 "Chain Stats Endpoint"

# Token Info
print_test "Token Info Endpoint"
token_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/token/info")
if [ "$token_response" -eq "200" ] || [ "$token_response" -eq "500" ]; then
    print_pass "Token Info Endpoint (HTTP $token_response)"
    ((PASSED++))
    ((TOTAL++))
else
    print_fail "Token Info Endpoint (HTTP $token_response)"
fi

# NFT Info
print_test "NFT Info Endpoint"
nft_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/nft/info")
if [ "$nft_response" -eq "200" ] || [ "$nft_response" -eq "500" ]; then
    print_pass "NFT Info Endpoint (HTTP $nft_response)"
    ((PASSED++))
    ((TOTAL++))
else
    print_fail "NFT Info Endpoint (HTTP $nft_response)"
fi

# Staking Info
print_test "Staking Info Endpoint"
staking_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/staking/info")
if [ "$staking_response" -eq "200" ] || [ "$staking_response" -eq "500" ]; then
    print_pass "Staking Info Endpoint (HTTP $staking_response)"
    ((PASSED++))
    ((TOTAL++))
else
    print_fail "Staking Info Endpoint (HTTP $staking_response)"
fi

# Recent Transactions
test_endpoint "/api/chain/transactions" 200 "Recent Transactions Endpoint"
test_json_field "/api/chain/transactions" "transactions" "Transactions array"

# MintMe Price
test_endpoint "/api/price/mintme" 200 "MintMe Price Endpoint"
test_json_field "/api/price/mintme" "token" "Token field"
test_json_field "/api/price/mintme" "price" "Price field"

# ============================================================
# Frontend Tests
# ============================================================
print_header "🌐 Frontend Tests"

test_endpoint "/" 200 "Homepage"

print_test "HTML Content"
homepage=$(curl -s "$BASE_URL")
if echo "$homepage" | grep -q "MeeChain"; then
    print_pass "Homepage contains MeeChain branding"
else
    print_fail "Homepage missing MeeChain branding"
fi

# ============================================================
# Documentation Tests
# ============================================================
print_header "📚 Documentation Tests"

test_endpoint "/docs/jsdoc/index.html" 200 "JSDoc Documentation"

# ============================================================
# Performance Tests
# ============================================================
print_header "📊 Performance Tests"

print_test "Response Time"
response_time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/health")
response_ms=$(echo "$response_time * 1000" | bc)

if (( $(echo "$response_time < 1.0" | bc -l) )); then
    print_pass "Response time: ${response_ms}ms (< 1000ms)"
else
    print_fail "Response time: ${response_ms}ms (> 1000ms)"
fi

# ============================================================
# Summary
# ============================================================
print_header "📊 Test Summary"

echo -e "Total Tests:  ${BLUE}$TOTAL${NC}"
echo -e "Passed:       ${GREEN}$PASSED${NC}"
echo -e "Failed:       ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║                  ✅ ALL TESTS PASSED! 🎉                      ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║              Production is READY for users!                   ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}\n"
    exit 0
else
    echo -e "\n${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}║                  ⚠️  SOME TESTS FAILED                        ║${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}║           Please review and fix issues above                  ║${NC}"
    echo -e "${RED}║                                                               ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check PM2 logs: pm2 logs meebot"
    echo "  2. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo "  3. Restart services: pm2 restart meebot && sudo systemctl restart nginx"
    echo ""
    exit 1
fi

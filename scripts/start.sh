#!/bin/bash
# MeeChain Infrastructure Startup Script
# ใช้สำหรับเริ่มต้น local development environment

set -e

echo "🚀 Starting MeeChain Infrastructure..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Hardhat is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js first.${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# 1. Start Hardhat Node (if not already running)
echo -e "${YELLOW}📡 Checking Hardhat node (port 8545)...${NC}"
if check_port 8545; then
    echo -e "${GREEN}✅ Hardhat node already running${NC}"
else
    echo -e "${YELLOW}🔄 Starting Hardhat node...${NC}"
    npx hardhat node > logs/hardhat.log 2>&1 &
    HARDHAT_PID=$!
    echo $HARDHAT_PID > .hardhat.pid
    sleep 3
    
    if check_port 8545; then
        echo -e "${GREEN}✅ Hardhat node started (PID: $HARDHAT_PID)${NC}"
    else
        echo -e "${RED}❌ Failed to start Hardhat node${NC}"
        exit 1
    fi
fi

# 2. Test local node connection
echo ""
echo -e "${YELLOW}🔍 Testing local node connection...${NC}"
CHAIN_ID=$(curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ "$CHAIN_ID" = "0x344e" ]; then
    echo -e "${GREEN}✅ Local node responding (Chain ID: 13390)${NC}"
else
    echo -e "${RED}❌ Local node not responding correctly${NC}"
    echo -e "${YELLOW}   Received: $CHAIN_ID${NC}"
fi

# 3. Check Nginx (optional)
echo ""
echo -e "${YELLOW}🔒 Checking Nginx SSL proxy (port 5005)...${NC}"
if check_port 5005; then
    echo -e "${GREEN}✅ Nginx proxy running${NC}"
    
    # Test HTTPS connection
    HTTPS_RESULT=$(curl -s -X POST https://127.0.0.1:5005 \
      -H "Content-Type: application/json" \
      --insecure \
      --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
      | grep -o '"result":"[^"]*"' | cut -d'"' -f4 || echo "error")
    
    if [ "$HTTPS_RESULT" = "0x344e" ]; then
        echo -e "${GREEN}✅ Nginx SSL proxy working correctly${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx running but not forwarding correctly${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx not running (optional for local dev)${NC}"
    echo -e "${YELLOW}   To start: sudo systemctl start nginx${NC}"
fi

# 4. Start application server
echo ""
echo -e "${YELLOW}🌐 Starting application server...${NC}"
if check_port 3000; then
    echo -e "${GREEN}✅ Application server already running${NC}"
else
    npm start > logs/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > .server.pid
    sleep 2
    
    if check_port 3000; then
        echo -e "${GREEN}✅ Application server started (PID: $SERVER_PID)${NC}"
    else
        echo -e "${RED}❌ Failed to start application server${NC}"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 MeeChain Infrastructure Started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📡 Local Node:      http://127.0.0.1:8545"
echo -e "🔒 Nginx Proxy:     https://127.0.0.1:5005"
echo -e "🌐 Application:     http://localhost:3000"
echo -e "🌍 Public RPC:      https://rpc.meechain.run.place:5005"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "   Hardhat: logs/hardhat.log"
echo -e "   Server:  logs/server.log"
echo ""
echo -e "${YELLOW}🛑 To stop:${NC}"
echo -e "   ./scripts/stop.sh"
echo ""

#!/bin/bash
# MeeChain Infrastructure Stop Script

set -e

echo "🛑 Stopping MeeChain Infrastructure..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop Hardhat node
if [ -f .hardhat.pid ]; then
    HARDHAT_PID=$(cat .hardhat.pid)
    if ps -p $HARDHAT_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping Hardhat node (PID: $HARDHAT_PID)...${NC}"
        kill $HARDHAT_PID
        rm .hardhat.pid
        echo -e "${GREEN}✅ Hardhat node stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Hardhat node not running${NC}"
        rm .hardhat.pid
    fi
else
    echo -e "${YELLOW}⚠️  No Hardhat PID file found${NC}"
fi

# Stop application server
if [ -f .server.pid ]; then
    SERVER_PID=$(cat .server.pid)
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping application server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID
        rm .server.pid
        echo -e "${GREEN}✅ Application server stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Application server not running${NC}"
        rm .server.pid
    fi
else
    echo -e "${YELLOW}⚠️  No server PID file found${NC}"
fi

echo ""
echo -e "${GREEN}✅ MeeChain Infrastructure stopped${NC}"

#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# start-tunnel.sh  — Start MeeChain Cloudflare Tunnel
# Run AFTER setup-tunnel.sh has been completed once
# ═══════════════════════════════════════════════════════════════

CONFIG_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$CONFIG_DIR/config.yml"

echo "🚇 Starting MeeChain Cloudflare Tunnel..."
echo "   Config: $CONFIG_FILE"
echo ""

# Check credentials exist
if [ ! -f "$CONFIG_DIR/tunnel-credentials.json" ]; then
  echo "❌ Credentials not found: $CONFIG_DIR/tunnel-credentials.json"
  echo "   Run setup-tunnel.sh first!"
  exit 1
fi

cloudflared tunnel --config "$CONFIG_FILE" run

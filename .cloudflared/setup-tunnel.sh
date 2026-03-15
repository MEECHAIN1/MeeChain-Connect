#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# setup-tunnel.sh  — MeeChain Cloudflare Tunnel Setup
# Run once on the machine that hosts the Node.js server
# ═══════════════════════════════════════════════════════════════
set -e

TUNNEL_NAME="meechain-tunnel"
CONFIG_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$CONFIG_DIR/config.yml"

echo "╔══════════════════════════════════════════╗"
echo "║   MeeChain Cloudflare Tunnel Setup       ║"
echo "╚══════════════════════════════════════════╝"

# ── 1. Install cloudflared if not present ─────────────────────
if ! command -v cloudflared &>/dev/null; then
  echo "📦 Installing cloudflared..."
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
      -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install cloudflared
  else
    echo "❌ Please install cloudflared manually: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
  fi
fi
echo "✅ cloudflared $(cloudflared --version)"

# ── 2. Login to Cloudflare (opens browser) ────────────────────
echo ""
echo "🔑 Logging in to Cloudflare (browser will open)..."
cloudflared tunnel login

# ── 3. Create tunnel ──────────────────────────────────────────
echo ""
echo "🚇 Creating tunnel: $TUNNEL_NAME"
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
  echo "   Tunnel '$TUNNEL_NAME' already exists, skipping creation"
  TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
else
  cloudflared tunnel create "$TUNNEL_NAME"
  TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
fi
echo "   Tunnel ID: $TUNNEL_ID"

# ── 4. Copy credentials ───────────────────────────────────────
CRED_SRC="$HOME/.cloudflared/${TUNNEL_ID}.json"
CRED_DST="$CONFIG_DIR/tunnel-credentials.json"
if [ -f "$CRED_SRC" ]; then
  cp "$CRED_SRC" "$CRED_DST"
  echo "✅ Credentials copied to $CRED_DST"
else
  echo "⚠️  Credentials not found at $CRED_SRC"
  echo "   Please copy manually: cp ~/.cloudflared/<TUNNEL_ID>.json $CRED_DST"
fi

# ── 5. Update config.yml with correct tunnel name/ID ─────────
sed -i "s/^tunnel: .*/tunnel: $TUNNEL_ID/" "$CONFIG_FILE"
echo "✅ Config updated: $CONFIG_FILE"

# ── 6. Route DNS ──────────────────────────────────────────────
echo ""
echo "🌐 Routing DNS..."
cloudflared tunnel route dns "$TUNNEL_NAME" app.meechain.xyz || echo "   DNS route may already exist"
cloudflared tunnel route dns "$TUNNEL_NAME" rpc.meechain.xyz || echo "   DNS route may already exist"

# ── 7. Validate config ────────────────────────────────────────
echo ""
echo "🔍 Validating config..."
cloudflared tunnel --config "$CONFIG_FILE" ingress validate

# ── 8. Start tunnel ───────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Setup complete! Starting tunnel...   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "   app.meechain.xyz  →  http://127.0.0.1:3000"
echo "   rpc.meechain.xyz  →  http://127.0.0.1:3000"
echo ""
echo "   Test with:"
echo "     curl https://app.meechain.xyz/health"
echo "     curl https://rpc.meechain.xyz/health"
echo ""
cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"

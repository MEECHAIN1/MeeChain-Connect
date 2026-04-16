#!/usr/bin/env bash
# ============================================================
# MeeChain Dashboard — Universal Start Script
# Supports: PM2 (bare metal), Docker, Podman, podman-compose
#
# Usage:
#   bash scripts/start.sh              → auto-detect best runtime
#   bash scripts/start.sh pm2          → force PM2
#   bash scripts/start.sh podman       → force Podman container
#   bash scripts/start.sh docker       → force Docker container
#   bash scripts/start.sh compose      → force compose (podman-compose / docker compose)
# ============================================================

set -euo pipefail

APP_NAME="meechain-dashboard"
PORT="${PORT:-3000}"
IMAGE="${IMAGE:-meechain-dashboard:latest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[start]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ── Helper: detect available runtime ───────────────────────
detect_runtime() {
  if   command -v podman       &>/dev/null; then echo "podman"
  elif command -v docker       &>/dev/null; then echo "docker"
  elif command -v pm2          &>/dev/null; then echo "pm2"
  elif command -v node         &>/dev/null; then echo "node"
  else  echo "none"
  fi
}

# ── Helper: detect compose command ─────────────────────────
detect_compose() {
  if   command -v podman-compose &>/dev/null; then echo "podman-compose"
  elif docker compose version    &>/dev/null 2>&1; then echo "docker compose"
  elif command -v docker-compose &>/dev/null; then echo "docker-compose"
  else  echo "none"
  fi
}

# ── Start via PM2 ───────────────────────────────────────────
start_pm2() {
  log "Starting with PM2..."
  cd "$ROOT_DIR"
  if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart "$APP_NAME"
  else
    pm2 start ecosystem.config.cjs --env production
  fi
  pm2 save
  log "PM2 status:"
  pm2 status
}

# ── Start via Podman (rootless) ──────────────────────────────
start_podman() {
  log "Starting with Podman (rootless)..."
  cd "$ROOT_DIR"

  # Build image if not present
  if ! podman image exists "$IMAGE"; then
    log "Building image $IMAGE ..."
    podman build -t "$IMAGE" .
  fi

  # Remove existing container if running
  podman rm -f "$APP_NAME" 2>/dev/null || true

  # Run container with env file
  ENV_ARGS=""
  if [ -f "$ROOT_DIR/.env" ]; then
    ENV_ARGS="--env-file $ROOT_DIR/.env"
  fi

  podman run -d \
    --name "$APP_NAME" \
    --replace \
    -p "${PORT}:3000" \
    $ENV_ARGS \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -v meechain_logs:/app/logs:Z \
    --restart unless-stopped \
    --health-cmd "wget -qO- http://localhost:3000/api/health | grep -q '\"status\":\"ok\"'" \
    --health-interval 30s \
    --health-timeout 10s \
    --health-retries 3 \
    "$IMAGE"

  log "Container '$APP_NAME' started on port $PORT"
  log "Logs: podman logs -f $APP_NAME"
  podman ps --filter "name=$APP_NAME"
}

# ── Start via Docker ─────────────────────────────────────────
start_docker() {
  log "Starting with Docker..."
  cd "$ROOT_DIR"

  if ! docker image inspect "$IMAGE" &>/dev/null; then
    log "Building image $IMAGE ..."
    docker build -t "$IMAGE" .
  fi

  docker rm -f "$APP_NAME" 2>/dev/null || true

  ENV_ARGS=""
  if [ -f "$ROOT_DIR/.env" ]; then
    ENV_ARGS="--env-file $ROOT_DIR/.env"
  fi

  docker run -d \
    --name "$APP_NAME" \
    -p "${PORT}:3000" \
    $ENV_ARGS \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -v meechain_logs:/app/logs \
    --restart unless-stopped \
    "$IMAGE"

  log "Container '$APP_NAME' started on port $PORT"
  docker ps --filter "name=$APP_NAME"
}

# ── Start via Compose ────────────────────────────────────────
start_compose() {
  local COMPOSE
  COMPOSE=$(detect_compose)
  if [ "$COMPOSE" = "none" ]; then
    err "No compose tool found. Install podman-compose or docker compose."
    exit 1
  fi
  log "Starting with $COMPOSE ..."
  cd "$ROOT_DIR"
  $COMPOSE up -d --build
  log "Services started. Logs: $COMPOSE logs -f"
}

# ── Start bare node (last resort) ───────────────────────────
start_node() {
  warn "No PM2/Podman/Docker found. Starting with plain node (no auto-restart)..."
  cd "$ROOT_DIR"
  node server.js &
  echo $! > /tmp/meechain.pid
  log "Server PID: $(cat /tmp/meechain.pid) — stop with: kill \$(cat /tmp/meechain.pid)"
}

# ── Main ─────────────────────────────────────────────────────
MODE="${1:-auto}"

case "$MODE" in
  auto)
    RUNTIME=$(detect_runtime)
    log "Auto-detected runtime: $RUNTIME"
    case "$RUNTIME" in
      pm2)    start_pm2    ;;
      podman) start_podman ;;
      docker) start_docker ;;
      node)   start_node   ;;
      none)   err "No supported runtime found (pm2/podman/docker/node)." ; exit 1 ;;
    esac
    ;;
  pm2)     start_pm2    ;;
  podman)  start_podman ;;
  docker)  start_docker ;;
  compose) start_compose ;;
  node)    start_node   ;;
  *)
    err "Unknown mode: $MODE"
    echo "Usage: $0 [auto|pm2|podman|docker|compose|node]"
    exit 1
    ;;
esac

log "Done! Health check: curl http://localhost:${PORT}/api/health"

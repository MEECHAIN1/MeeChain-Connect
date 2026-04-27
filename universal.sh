#!/usr/bin/env bash
# ============================================================
# MeeChain Dashboard — Universal Start Script
#
# Usage:
#   bash scripts/start.sh              → auto-detect best runtime
#   bash scripts/start.sh --explain    → show why runtime was chosen
#   bash scripts/start.sh pm2          → force PM2
#   bash scripts/start.sh podman       → force Podman container
#   bash scripts/start.sh docker       → force Docker container
#   bash scripts/start.sh compose      → force compose
#   bash scripts/start.sh node         → force plain node
# ============================================================

set -Eeuo pipefail

APP_NAME="meechain-dashboard"
PORT="${PORT:-3000}"
IMAGE="${IMAGE:-meechain-dashboard:latest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="${ROOT_DIR}/.meechain.pid"
DEFAULT_HEALTH_URL="http://localhost:${PORT}/api/health"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log()    { echo -e "${GREEN}[start]${NC} $*"; }
warn()   { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()    { echo -e "${RED}[error]${NC} $*" >&2; }
info()   { echo -e "${CYAN}[info]${NC}  $*"; }
dim()    { echo -e "${DIM}$*${NC}"; }
bold()   { echo -e "${BOLD}$*${NC}"; }
sep()    { echo -e "${DIM}$(printf '─%.0s' {1..58})${NC}"; }

trap 'err "Command failed at line $LINENO: ${BASH_COMMAND}"' ERR

# ── Helpers ─────────────────────────────────────────────────
has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_root_dir() {
  cd "$ROOT_DIR"
}

ensure_port_is_number() {
  if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    err "PORT must be numeric. Current value: $PORT"
    exit 1
  fi
}

print_banner() {
  echo ""
  bold "  ⛓  MeeChain Dashboard"
  dim  "  Universal Start Script"
  sep
}

print_success_footer() {
  echo ""
  log "Done!"
  info "App URL:     http://localhost:${PORT}"
  info "Health URL:  ${DEFAULT_HEALTH_URL}"
  echo ""
}

wait_for_health() {
  local url="${1:-$DEFAULT_HEALTH_URL}"
  local retries="${2:-20}"
  local sleep_sec="${3:-2}"
  local i

  info "Waiting for health check: ${url}"
  for ((i=1; i<=retries; i++)); do
    if has_cmd curl && curl -fsS "$url" >/dev/null 2>&1; then
      log "Health check passed"
      return 0
    fi

    if has_cmd wget && wget -qO- "$url" >/dev/null 2>&1; then
      log "Health check passed"
      return 0
    fi

    dim "  attempt ${i}/${retries} ..."
    sleep "$sleep_sec"
  done

  warn "Health check did not pass yet"
  warn "App may still be starting. Check logs if needed."
  return 1
}

# ── Environment Detection ───────────────────────────────────
# Returns one of: termux | macos | linux
detect_env() {
  if [ -n "${TERMUX_VERSION:-}" ] || [ -d "/data/data/com.termux" ]; then
    echo "termux"
  elif uname -r 2>/dev/null | grep -qi "android"; then
    echo "termux"
  elif [ "$(uname -s)" = "Darwin" ]; then
    echo "macos"
  else
    echo "linux"
  fi
}

# ── Runtime Detection ───────────────────────────────────────
# Returns one of: pm2 | podman | docker | node | none
detect_runtime() {
  if has_cmd pm2 && pm2 list 2>/dev/null | grep -q "$APP_NAME"; then
    echo "pm2"
    return
  fi

  if has_cmd podman && podman ps --format '{{.Names}}' 2>/dev/null | grep -qx "$APP_NAME"; then
    echo "podman"
    return
  fi

  if has_cmd docker && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$APP_NAME"; then
    echo "docker"
    return
  fi

  if has_cmd podman; then
    echo "podman"
  elif has_cmd docker; then
    echo "docker"
  elif has_cmd pm2; then
    echo "pm2"
  elif has_cmd node; then
    echo "node"
  else
    echo "none"
  fi
}

# Returns one of: podman-compose | docker compose | docker-compose | none
detect_compose() {
  if has_cmd podman-compose; then
    echo "podman-compose"
  elif has_cmd docker && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif has_cmd docker-compose; then
    echo "docker-compose"
  else
    echo "none"
  fi
}

compose_file_exists() {
  [ -f "$ROOT_DIR/compose.yml" ] || [ -f "$ROOT_DIR/docker-compose.yml" ] || [ -f "$ROOT_DIR/docker-compose.yaml" ]
}

# ── Runtime Recommendation ──────────────────────────────────
# Returns: RUNTIME|REASON|FALLBACK_MSG
recommend_runtime() {
  local env runtime
  env="$(detect_env)"
  runtime="$(detect_runtime)"

  case "$env" in
    termux)
      if [ "$runtime" = "podman" ]; then
        echo "podman|Termux + Podman rootless พร้อมใช้งาน ไม่ต้องใช้ root ✅|ถ้า Podman มีปัญหา: bash scripts/start.sh node"
      elif [ "$runtime" = "pm2" ]; then
        echo "pm2|Termux + PM2 ใช้งานได้ดีสำหรับ dev loop และ restart ✅|ถ้าต้องการ isolate มากขึ้น: bash scripts/start.sh podman"
      else
        echo "node|Termux มักเหมาะกับ Node direct run มากที่สุดเมื่อไม่มี Podman|ถ้าต้องการ container: ติดตั้ง Podman/Ubuntu env แล้วค่อยใช้ podman"
      fi
      ;;
    macos)
      if [ "$runtime" = "podman" ]; then
        echo "podman|macOS + Podman rootless พร้อมใช้งาน ✅|ถ้า Podman machine ยังไม่ start: podman machine start"
      elif [ "$runtime" = "docker" ]; then
        echo "docker|macOS + Docker พร้อมใช้งาน ✅|ถ้าต้องการ rootless/เบากว่า: ลอง bash scripts/start.sh podman"
      elif has_cmd pm2; then
        echo "pm2|macOS + PM2 เหมาะกับ dev และ restart อัตโนมัติ ✅|ถ้าต้องการ container: ติดตั้ง Podman หรือ Docker"
      else
        echo "node|ยังไม่มี runtime manager ที่เหมาะกว่า ใช้ Node ตรงก่อน|แนะนำ: npm install -g pm2"
      fi
      ;;
    *)
      if [ "$runtime" = "pm2" ]; then
        echo "pm2|Linux + PM2 กำลังรันหรือพร้อมใช้งาน เหมาะกับ process management ✅|ถ้าต้องการ isolation: bash scripts/start.sh podman"
      elif [ "$runtime" = "podman" ]; then
        echo "podman|Linux + Podman rootless พร้อมใช้งาน daemonless และเหมาะกับ container workflow ✅|ถ้า image ยังไม่มี จะ build อัตโนมัติ"
      elif [ "$runtime" = "docker" ]; then
        echo "docker|Linux + Docker พร้อมใช้งาน ✅|ถ้าต้องการ rootless flow: พิจารณา Podman"
      elif has_cmd pm2; then
        echo "pm2|Linux + PM2 พร้อมใช้งาน เหมาะกับ app ที่ต้อง restart และดู log ง่าย ✅|ถ้าต้องการ container: ใช้ podman หรือ docker"
      elif has_cmd node; then
        echo "node|ไม่พบ PM2/Docker/Podman ใช้ Node ตรงก่อน|แนะนำ: npm install -g pm2"
      else
        echo "none|ไม่พบ runtime ที่รองรับ|ติดตั้ง Node.js หรือ container runtime ก่อน"
      fi
      ;;
  esac
}

print_recommendation() {
  local rec runtime reason fallback
  rec="$(recommend_runtime)"
  runtime="$(echo "$rec" | cut -d'|' -f1)"
  reason="$(echo "$rec" | cut -d'|' -f2)"
  fallback="$(echo "$rec" | cut -d'|' -f3)"

  echo ""
  echo -e "  ${BOLD}Runtime แนะนำ:${NC}  ${CYAN}${BOLD}${runtime}${NC}"
  echo -e "  ${DIM}เหตุผล:${NC}        ${reason}"
  echo -e "  ${DIM}Fallback:${NC}      ${fallback}"
  sep
  echo ""
}

# ── Start Functions ─────────────────────────────────────────
start_pm2() {
  ensure_root_dir
  log "Starting with PM2..."

  if ! has_cmd pm2; then
    err "PM2 is not installed"
    info "Install: npm install -g pm2"
    exit 1
  fi

  if [ ! -f "$ROOT_DIR/ecosystem.config.cjs" ]; then
    err "Missing ecosystem.config.cjs"
    exit 1
  fi

  if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart "$APP_NAME"
  else
    pm2 start ecosystem.config.cjs --env production
  fi

  pm2 save
  log "PM2 status:"
  pm2 status
  wait_for_health || true
}

start_podman() {
  ensure_root_dir
  log "Starting with Podman (rootless)..."

  if ! has_cmd podman; then
    err "Podman is not installed"
    exit 1
  fi

  if ! podman image exists "$IMAGE"; then
    log "Building image $IMAGE ..."
    podman build -t "$IMAGE" .
  fi

  podman rm -f "$APP_NAME" >/dev/null 2>&1 || true

  local env_args=()
  if [ -f "$ROOT_DIR/.env" ]; then
    env_args=(--env-file "$ROOT_DIR/.env")
  fi

  podman run -d \
    --name "$APP_NAME" \
    --replace \
    -p "${PORT}:3000" \
    "${env_args[@]}" \
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
  podman ps --filter "name=$APP_NAME"
  wait_for_health || true
}

start_docker() {
  ensure_root_dir
  log "Starting with Docker..."

  if ! has_cmd docker; then
    err "Docker is not installed"
    exit 1
  fi

  if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    log "Building image $IMAGE ..."
    docker build -t "$IMAGE" .
  fi

  docker rm -f "$APP_NAME" >/dev/null 2>&1 || true

  local env_args=()
  if [ -f "$ROOT_DIR/.env" ]; then
    env_args=(--env-file "$ROOT_DIR/.env")
  fi

  docker run -d \
    --name "$APP_NAME" \
    -p "${PORT}:3000" \
    "${env_args[@]}" \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -v meechain_logs:/app/logs \
    --restart unless-stopped \
    "$IMAGE"

  log "Container '$APP_NAME' started on port $PORT"
  docker ps --filter "name=$APP_NAME"
  wait_for_health || true
}

start_compose() {
  ensure_root_dir

  if ! compose_file_exists; then
    err "Compose file not found (compose.yml / docker-compose.yml / docker-compose.yaml)"
    exit 1
  fi

  local compose_cmd
  compose_cmd="$(detect_compose)"

  if [ "$compose_cmd" = "none" ]; then
    err "Compose tool not found"
    info "Install Docker Compose plugin or podman-compose"
    exit 1
  fi

  log "Starting with ${compose_cmd} ..."

  case "$compose_cmd" in
    "podman-compose")
      podman-compose up -d --build
      ;;
    "docker compose")
      docker compose up -d --build
      ;;
    "docker-compose")
      docker-compose up -d --build
      ;;
  esac

  log "Services started"
  info "View logs with the same compose tool + logs -f"
  wait_for_health || true
}

start_node() {
  ensure_root_dir
  warn "Starting with plain node (no auto-restart)"

  if ! has_cmd node; then
    err "Node.js is not installed"
    exit 1
  fi

  if [ ! -f "$ROOT_DIR/server.js" ]; then
    err "Missing server.js"
    exit 1
  fi

  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
    warn "Node process already running with PID $(cat "$PID_FILE")"
    info "Stop it first: kill $(cat "$PID_FILE")"
    exit 1
  fi

  nohup node server.js > "$ROOT_DIR/meechain.out.log" 2>&1 &
  echo $! > "$PID_FILE"

  log "Server PID: $(cat "$PID_FILE")"
  dim "  Stop with: kill \$(cat \"$PID_FILE\")"
  dim "  Logs: tail -f \"$ROOT_DIR/meechain.out.log\""
  wait_for_health || true
}

# ── Explain Mode ────────────────────────────────────────────
show_explain() {
  local env runtime rec rt reason fallback
  env="$(detect_env)"
  runtime="$(detect_runtime)"
  rec="$(recommend_runtime)"
  rt="$(echo "$rec" | cut -d'|' -f1)"
  reason="$(echo "$rec" | cut -d'|' -f2)"
  fallback="$(echo "$rec" | cut -d'|' -f3)"

  print_banner
  bold "  🔍 Environment Report"
  sep
  echo ""
  echo -e "  OS / Platform:   ${CYAN}${env}${NC}"
  echo -e "  Runtime found:   ${CYAN}${runtime}${NC}"
  echo ""
  echo -e "  ${BOLD}→ Recommended:${NC}   ${GREEN}${rt}${NC}"
  echo -e "     เหตุผล:       ${reason}"
  echo -e "     Fallback:     ${fallback}"
  echo ""
  sep

  bold "  📦 Available tools:"
  for tool in pm2 podman docker node; do
    if has_cmd "$tool"; then
      local version_line
      version_line="$("$tool" --version 2>/dev/null | head -1 || true)"
      echo -e "  ${GREEN}✓${NC} ${tool} ${version_line}"
    else
      echo -e "  ${DIM}✗ ${tool}  (not installed)${NC}"
    fi
  done

  echo ""
  sep
  bold "  📋 Commands:"
  dim  "  bash scripts/start.sh            → auto (picks ${rt})"
  dim  "  bash scripts/start.sh pm2        → force PM2"
  dim  "  bash scripts/start.sh podman     → force Podman"
  dim  "  bash scripts/start.sh docker     → force Docker"
  dim  "  bash scripts/start.sh compose    → force compose"
  dim  "  bash scripts/start.sh node       → force plain Node"
  dim  "  bash scripts/start.sh --explain  → inspect environment"
  echo ""
}

show_help() {
  print_banner
  cat <<EOF

Usage:
  bash scripts/start.sh [auto|pm2|podman|docker|compose|node|--explain]

Modes:
  auto       Auto-detect best runtime
  pm2        Force PM2
  podman     Force Podman container
  docker     Force Docker container
  compose    Force Compose
  node       Force plain Node.js
  --explain  Show environment report and recommendation
  --help     Show this help

EOF
}

# ── Main ────────────────────────────────────────────────────
main() {
  ensure_port_is_number

  local mode="${1:-auto}"

  case "$mode" in
    --explain|-e|explain)
      show_explain
      exit 0
      ;;
    --help|-h|help)
      show_help
      exit 0
      ;;
    auto)
      print_banner
      print_recommendation

      local runtime
      runtime="$(recommend_runtime | cut -d'|' -f1)"

      log "Starting with: ${BOLD}${runtime}${NC}"

      case "$runtime" in
        pm2)    start_pm2 ;;
        podman) start_podman ;;
        docker) start_docker ;;
        node)   start_node ;;
        none)
          err "No supported runtime found (pm2 / podman / docker / node)"
          info "Install Node.js or a container runtime first"
          exit 1
          ;;
      esac
      ;;
    pm2)
      print_banner
      log "Forced: pm2"
      start_pm2
      ;;
    podman)
      print_banner
      log "Forced: podman"
      start_podman
      ;;
    docker)
      print_banner
      log "Forced: docker"
      start_docker
      ;;
    compose)
      print_banner
      log "Forced: compose"
      start_compose
      ;;
    node)
      print_banner
      log "Forced: node"
      start_node
      ;;
    *)
      err "Unknown mode: $mode"
      echo ""
      echo "Usage: $0 [auto|pm2|podman|docker|compose|node|--explain]"
      exit 1
      ;;
  esac

  print_success_footer
}

main "$@"

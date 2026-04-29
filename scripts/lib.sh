#!/usr/bin/env bash

# Shared library for MeeChain runtime scripts

set -Eeuo pipefail

APP_NAME="${APP_NAME:-meechain-dashboard}"
PORT="${PORT:-3000}"
IMAGE="${IMAGE:-meechain-dashboard:latest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="${ROOT_DIR}/.meechain.pid"
DEFAULT_HEALTH_URL="${HEALTH_URL:-http://localhost:${PORT}/api/health}"

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
  dim  "  Universal Runtime Toolkit"
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

show_help_common() {
  cat <<EOF
Modes:
  auto       Auto-detect best runtime
  pm2        Force PM2
  podman     Force Podman container
  docker     Force Docker container
  compose    Force Compose
  node       Force plain Node.js
  --explain  Show environment report and recommendation
EOF
}

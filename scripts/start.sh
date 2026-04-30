#!/usr/bin/env bash

set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

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
    "podman-compose") podman-compose up -d --build ;;
    "docker compose") docker compose up -d --build ;;
    "docker-compose") docker-compose up -d --build ;;
  esac

  info "Services started"
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
    info "Stop it first: bash scripts/stop.sh node"
    exit 1
  fi

  nohup node server.js > "$ROOT_DIR/meechain.out.log" 2>&1 &
  echo $! > "$PID_FILE"

  log "Server PID: $(cat "$PID_FILE")"
  dim "  Stop with: bash scripts/stop.sh node"
  dim "  Logs: bash scripts/logs.sh node"
  wait_for_health || true
}

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
      echo -e "  ${GREEN}✓${NC} ${tool} $("$tool" --version 2>/dev/null | head -1 || true)"
    else
      echo -e "  ${DIM}✗ ${tool}  (not installed)${NC}"
    fi
  done

  echo ""
  sep
  bold "  📋 Commands:"
  dim  "  bash scripts/start.sh            → auto"
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

$(show_help_common)

EOF
}

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
    pm2)     print_banner; log "Forced: pm2";     start_pm2 ;;
    podman)  print_banner; log "Forced: podman";  start_podman ;;
    docker)  print_banner; log "Forced: docker";  start_docker ;;
    compose) print_banner; log "Forced: compose"; start_compose ;;
    node)    print_banner; log "Forced: node";    start_node ;;
    *)
      err "Unknown mode: $mode"
      echo "Usage: $0 [auto|pm2|podman|docker|compose|node|--explain]"
      exit 1
      ;;
  esac

  print_success_footer
}

main "$@"

#!/usr/bin/env bash

set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

stop_pm2() {
  if ! has_cmd pm2; then
    warn "PM2 not installed"
    return 0
  fi

  if pm2 list 2>/dev/null | grep -q "$APP_NAME"; then
    log "Stopping PM2 app: $APP_NAME"
    pm2 stop "$APP_NAME" || true
    pm2 delete "$APP_NAME" || true
    pm2 save || true
  else
    warn "PM2 app not found: $APP_NAME"
  fi
}

stop_podman() {
  if ! has_cmd podman; then
    warn "Podman not installed"
    return 0
  fi

  if podman ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$APP_NAME"; then
    log "Stopping Podman container: $APP_NAME"
    podman rm -f "$APP_NAME" || true
  else
    warn "Podman container not found: $APP_NAME"
  fi
}

stop_docker() {
  if ! has_cmd docker; then
    warn "Docker not installed"
    return 0
  fi

  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$APP_NAME"; then
    log "Stopping Docker container: $APP_NAME"
    docker rm -f "$APP_NAME" || true
  else
    warn "Docker container not found: $APP_NAME"
  fi
}

stop_compose() {
  ensure_root_dir

  local compose_cmd
  compose_cmd="$(detect_compose)"

  if [ "$compose_cmd" = "none" ]; then
    warn "Compose tool not installed"
    return 0
  fi

  if ! compose_file_exists; then
    warn "Compose file not found"
    return 0
  fi

  log "Stopping services with ${compose_cmd} ..."
  case "$compose_cmd" in
    "podman-compose") podman-compose down ;;
    "docker compose") docker compose down ;;
    "docker-compose") docker-compose down ;;
  esac
}

stop_node() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE")"

    if kill -0 "$pid" >/dev/null 2>&1; then
      log "Stopping Node process: $pid"
      kill "$pid" || true
      rm -f "$PID_FILE"
    else
      warn "PID file found but process is not running"
      rm -f "$PID_FILE"
    fi
  else
    warn "No PID file found for node mode"
  fi
}

show_help() {
  print_banner
  cat <<EOF

Usage:
  bash scripts/stop.sh [auto|pm2|podman|docker|compose|node|all]

Notes:
  auto  → stop detected/likely runtime
  all   → stop every supported runtime path for this app

EOF
}

main() {
  local mode="${1:-auto}"
  print_banner

  case "$mode" in
    --help|-h|help)
      show_help
      exit 0
      ;;
    auto)
      local runtime
      runtime="$(detect_runtime)"
      log "Detected runtime: $runtime"

      case "$runtime" in
        pm2)    stop_pm2 ;;
        podman) stop_podman ;;
        docker) stop_docker ;;
        node)   stop_node ;;
        none)   warn "No active runtime detected" ;;
      esac
      ;;
    pm2)     stop_pm2 ;;
    podman)  stop_podman ;;
    docker)  stop_docker ;;
    compose) stop_compose ;;
    node)    stop_node ;;
    all)
      stop_pm2
      stop_podman
      stop_docker
      stop_compose
      stop_node
      ;;
    *)
      err "Unknown mode: $mode"
      exit 1
      ;;
  esac

  echo ""
  log "Stop complete"
}

main "$@"

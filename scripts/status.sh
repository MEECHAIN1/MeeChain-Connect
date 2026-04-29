#!/usr/bin/env bash

set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

show_pm2_status() {
  echo ""
  bold "PM2"
  sep
  if has_cmd pm2; then
    pm2 list 2>/dev/null | grep -q "$APP_NAME" && pm2 status "$APP_NAME" || warn "PM2 app not running"
  else
    dim "PM2 not installed"
  fi
}

show_podman_status() {
  echo ""
  bold "Podman"
  sep
  if has_cmd podman; then
    podman ps -a --filter "name=$APP_NAME" || true
  else
    dim "Podman not installed"
  fi
}

show_docker_status() {
  echo ""
  bold "Docker"
  sep
  if has_cmd docker; then
    docker ps -a --filter "name=$APP_NAME" || true
  else
    dim "Docker not installed"
  fi
}

show_compose_status() {
  echo ""
  bold "Compose"
  sep
  local compose_cmd
  compose_cmd="$(detect_compose)"

  if [ "$compose_cmd" = "none" ]; then
    dim "Compose tool not installed"
    return
  fi

  if ! compose_file_exists; then
    dim "Compose file not found"
    return
  fi

  ensure_root_dir
  case "$compose_cmd" in
    "podman-compose") podman-compose ps || true ;;
    "docker compose") docker compose ps || true ;;
    "docker-compose") docker-compose ps || true ;;
  esac
}

show_node_status() {
  echo ""
  bold "Node"
  sep
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "Running with PID: $pid"
    else
      warn "PID file exists but process is not running"
    fi
  else
    dim "No node PID file found"
  fi
}

show_health_status() {
  echo ""
  bold "Health"
  sep
  if has_cmd curl && curl -fsS "$DEFAULT_HEALTH_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}Healthy${NC}  ${DEFAULT_HEALTH_URL}"
  elif has_cmd wget && wget -qO- "$DEFAULT_HEALTH_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}Healthy${NC}  ${DEFAULT_HEALTH_URL}"
  else
    echo -e "${YELLOW}Not reachable yet${NC}  ${DEFAULT_HEALTH_URL}"
  fi
}

main() {
  print_banner
  info "Detected environment: $(detect_env)"
  info "Recommended runtime: $(recommend_runtime | cut -d'|' -f1)"

  show_pm2_status
  show_podman_status
  show_docker_status
  show_compose_status
  show_node_status
  show_health_status

  echo ""
}

main "$@"

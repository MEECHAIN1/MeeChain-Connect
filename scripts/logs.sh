#!/usr/bin/env bash

set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

usage() {
  print_banner
  cat <<EOF

Usage:
  bash scripts/logs.sh [auto|pm2|podman|docker|compose|node] [--follow]

Examples:
  bash scripts/logs.sh
  bash scripts/logs.sh auto --follow
  bash scripts/logs.sh docker --follow
  bash scripts/logs.sh node

EOF
}

logs_pm2() {
  if ! has_cmd pm2; then
    err "PM2 not installed"
    exit 1
  fi

  if [ "${FOLLOW:-0}" = "1" ]; then
    pm2 logs "$APP_NAME"
  else
    pm2 logs "$APP_NAME" --lines 100 --nostream
  fi
}

logs_podman() {
  if ! has_cmd podman; then
    err "Podman not installed"
    exit 1
  fi

  if [ "${FOLLOW:-0}" = "1" ]; then
    podman logs -f "$APP_NAME"
  else
    podman logs --tail 100 "$APP_NAME"
  fi
}

logs_docker() {
  if ! has_cmd docker; then
    err "Docker not installed"
    exit 1
  fi

  if [ "${FOLLOW:-0}" = "1" ]; then
    docker logs -f "$APP_NAME"
  else
    docker logs --tail 100 "$APP_NAME"
  fi
}

logs_compose() {
  local compose_cmd
  compose_cmd="$(detect_compose)"

  if [ "$compose_cmd" = "none" ]; then
    err "Compose tool not installed"
    exit 1
  fi

  ensure_root_dir

  case "$compose_cmd" in
    "podman-compose")
      if [ "${FOLLOW:-0}" = "1" ]; then
        podman-compose logs -f
      else
        podman-compose logs --tail=100
      fi
      ;;
    "docker compose")
      if [ "${FOLLOW:-0}" = "1" ]; then
        docker compose logs -f
      else
        docker compose logs --tail=100
      fi
      ;;
    "docker-compose")
      if [ "${FOLLOW:-0}" = "1" ]; then
        docker-compose logs -f
      else
        docker-compose logs --tail=100
      fi
      ;;
  esac
}

logs_node() {
  local logfile="${ROOT_DIR}/meechain.out.log"
  if [ ! -f "$logfile" ]; then
    err "Node log file not found: $logfile"
    exit 1
  fi

  if [ "${FOLLOW:-0}" = "1" ]; then
    tail -f "$logfile"
  else
    tail -n 100 "$logfile"
  fi
}

main() {
  local mode="auto"
  FOLLOW=0

  for arg in "$@"; do
    case "$arg" in
      --follow|-f) FOLLOW=1 ;;
      --help|-h|help) usage; exit 0 ;;
      *) mode="$arg" ;;
    esac
  done

  print_banner

  if [ "$mode" = "auto" ]; then
    mode="$(detect_runtime)"
    log "Detected runtime for logs: $mode"
  fi

  case "$mode" in
    pm2)     logs_pm2 ;;
    podman)  logs_podman ;;
    docker)  logs_docker ;;
    compose) logs_compose ;;
    node)    logs_node ;;
    none)
      err "No active runtime detected"
      exit 1
      ;;
    *)
      err "Unknown mode: $mode"
      exit 1
      ;;
  esac
}

main "$@"

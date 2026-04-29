#!/usr/bin/env bash

set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

ok()  { echo -e "${GREEN}✓${NC} $*"; }
bad() { echo -e "${RED}✗${NC} $*"; }
meh() { echo -e "${YELLOW}!${NC} $*"; }

check_cmd() {
  local cmd="$1"
  local label="${2:-$1}"
  if has_cmd "$cmd"; then
    ok "${label} installed: $("$cmd" --version 2>/dev/null | head -1 || true)"
  else
    meh "${label} not installed"
  fi
}

check_file() {
  local file="$1"
  if [ -f "$ROOT_DIR/$file" ]; then
    ok "Found file: $file"
  else
    bad "Missing file: $file"
  fi
}

check_dir() {
  local dir="$1"
  if [ -d "$ROOT_DIR/$dir" ]; then
    ok "Found directory: $dir"
  else
    meh "Directory not found: $dir"
  fi
}

check_port() {
  if has_cmd lsof; then
    if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      meh "Port $PORT is already in use"
    else
      ok "Port $PORT is available"
    fi
  else
    meh "lsof not installed, skipping port check"
  fi
}

check_health_tools() {
  if has_cmd curl || has_cmd wget; then
    ok "Health-check client available"
  else
    meh "Neither curl nor wget found. Health checks may be limited."
  fi
}

check_compose() {
  local compose_cmd
  compose_cmd="$(detect_compose)"
  if [ "$compose_cmd" = "none" ]; then
    meh "Compose tool not found"
  else
    ok "Compose tool detected: $compose_cmd"
  fi
}

check_node_entry() {
  if [ -f "$ROOT_DIR/server.js" ]; then
    ok "Node entry found: server.js"
  else
    meh "server.js not found. Adjust scripts if your entrypoint is different."
  fi
}

check_pm2_config() {
  if [ -f "$ROOT_DIR/ecosystem.config.cjs" ]; then
    ok "PM2 config found: ecosystem.config.cjs"
  else
    meh "PM2 config not found"
  fi
}

show_summary() {
  echo ""
  bold "Suggested next steps"
  sep
  dim "  bash scripts/doctor.sh"
  dim "  bash scripts/start.sh --explain"
  dim "  bash scripts/start.sh"
  echo ""
}

main() {
  print_banner
  bold "  🩺 MeeChain Doctor"
  sep
  echo ""

  info "Environment: $(detect_env)"
  info "Recommended runtime: $(recommend_runtime | cut -d'|' -f1)"
  echo ""

  bold "Runtime tools"
  sep
  check_cmd node "Node.js"
  check_cmd npm "npm"
  check_cmd pm2 "PM2"
  check_cmd podman "Podman"
  check_cmd docker "Docker"
  check_cmd podman-compose "podman-compose"
  check_compose
  echo ""

  bold "Project files"
  sep
  check_file "package.json"
  check_file "server.js"
  check_file "ecosystem.config.cjs"
  if [ -f "$ROOT_DIR/compose.yml" ] || [ -f "$ROOT_DIR/docker-compose.yml" ] || [ -f "$ROOT_DIR/docker-compose.yaml" ]; then
    ok "Compose file found"
  else
    meh "Compose file not found"
  fi
  check_file "Dockerfile"
  check_dir "scripts"
  echo ""

  bold "Runtime readiness"
  sep
  check_port
  check_health_tools
  check_node_entry
  check_pm2_config
  echo ""

  show_summary
}

main "$@"

#!/usr/bin/env bash
set -euo pipefail

# Compose failover wrapper
# Priority:
#   1) docker --context <PRIMARY_CONTEXT> compose ...
#   2) docker --context <FALLBACK_CONTEXT> compose ...
#   3) podman compose ... (optional direct fallback)
#
# Env:
#   PRIMARY_CONTEXT=default
#   FALLBACK_CONTEXT=podman
#   COMPOSE_ALLOW_PODMAN_DIRECT=true|false   (default: true)

PRIMARY_CONTEXT="${PRIMARY_CONTEXT:-default}"
FALLBACK_CONTEXT="${FALLBACK_CONTEXT:-podman}"
ALLOW_PODMAN_DIRECT="${COMPOSE_ALLOW_PODMAN_DIRECT:-true}"

docker_has_context() {
  local ctx="$1"
  docker context inspect "$ctx" >/dev/null 2>&1
}

run_docker_context() {
  local ctx="$1"
  echo "🔧 docker --context ${ctx} compose $*"
  docker --context "$ctx" compose "$@"
}

run_podman_direct() {
  echo "🔧 podman compose $*"
  podman compose "$@"
}

if command -v docker >/dev/null 2>&1; then
  if docker_has_context "$PRIMARY_CONTEXT"; then
    if run_docker_context "$PRIMARY_CONTEXT" "$@"; then
      exit 0
    fi
    echo "⚠️ Compose failed on docker context '${PRIMARY_CONTEXT}'."
  else
    echo "⚠️ Docker context '${PRIMARY_CONTEXT}' not found."
  fi

  if docker_has_context "$FALLBACK_CONTEXT"; then
    if run_docker_context "$FALLBACK_CONTEXT" "$@"; then
      exit 0
    fi
    echo "⚠️ Compose failed on fallback context '${FALLBACK_CONTEXT}'."
  else
    echo "⚠️ Fallback docker context '${FALLBACK_CONTEXT}' not found."
  fi
else
  echo "⚠️ docker CLI not found in PATH."
fi

if [[ "${ALLOW_PODMAN_DIRECT,,}" == "true" ]]; then
  if command -v podman >/dev/null 2>&1; then
    run_podman_direct "$@"
    exit $?
  fi
  echo "⚠️ podman CLI not found in PATH."
fi

echo "❌ No available compose runtime succeeded."
echo "   Hint: configure docker contexts with:"
echo "   docker context create podman --docker \"host=npipe:////./pipe/podman_engine\""
exit 1

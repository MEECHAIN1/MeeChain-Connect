#!/usr/bin/env bash

set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "${SCRIPT_DIR}/stop.sh" "${1:-auto}"
bash "${SCRIPT_DIR}/start.sh" "${1:-auto}"

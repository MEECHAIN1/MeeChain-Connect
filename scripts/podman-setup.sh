#!/usr/bin/env bash
# ============================================================
# MeeChain — Podman Setup Guide & Auto-Installer
# Supports:
#   Linux (Ubuntu/Debian/Fedora/Arch)
#   Termux + proot-distro (Android)
#   macOS (via Homebrew)
#
# Usage:
#   bash scripts/podman-setup.sh          → detect & install
#   bash scripts/podman-setup.sh termux   → Termux proot guide
#   bash scripts/podman-setup.sh check    → just check status
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()   { echo -e "${GREEN}✅${NC} $*"; }
info()  { echo -e "${CYAN}ℹ️ ${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠️ ${NC}  $*"; }
err()   { echo -e "${RED}❌${NC} $*" >&2; }
title() { echo -e "\n${BOLD}${CYAN}$*${NC}"; echo "$(printf '─%.0s' {1..50})"; }

# ── Detect environment ───────────────────────────────────────
detect_env() {
  if [ -n "${TERMUX_VERSION:-}" ] || [ -d "/data/data/com.termux" ]; then
    echo "termux"
  elif uname -r 2>/dev/null | grep -qi "android"; then
    echo "termux"
  elif [ "$(uname -s)" = "Darwin" ]; then
    echo "macos"
  elif grep -qi "ubuntu\|debian" /etc/os-release 2>/dev/null; then
    echo "debian"
  elif grep -qi "fedora\|rhel\|centos" /etc/os-release 2>/dev/null; then
    echo "fedora"
  elif grep -qi "arch" /etc/os-release 2>/dev/null; then
    echo "arch"
  else
    echo "linux"
  fi
}

# ── Check current status ─────────────────────────────────────
check_status() {
  title "🔍 MeeChain Runtime Status"

  echo -e "Environment: ${CYAN}$(detect_env)${NC}"
  echo ""

  # Podman
  if command -v podman &>/dev/null; then
    log "Podman:  $(podman --version)"
  else
    warn "Podman:  not installed"
  fi

  # Docker
  if command -v docker &>/dev/null; then
    log "Docker:  $(docker --version 2>/dev/null | head -1)"
  else
    info "Docker:  not installed"
  fi

  # podman-compose
  if command -v podman-compose &>/dev/null; then
    log "podman-compose: $(podman-compose --version 2>/dev/null | head -1)"
  else
    info "podman-compose: not installed (pip3 install podman-compose)"
  fi

  # PM2
  if command -v pm2 &>/dev/null; then
    log "PM2:     $(pm2 --version 2>/dev/null)"
  else
    info "PM2:     not installed (npm install -g pm2)"
  fi

  # Node.js
  if command -v node &>/dev/null; then
    log "Node.js: $(node --version)"
  else
    err "Node.js: not installed — required!"
  fi

  echo ""
}

# ── Termux / Android guide ───────────────────────────────────
guide_termux() {
  title "📱 Termux → proot-distro → Podman Setup"

  cat << 'GUIDE'

Termux ไม่มี Podman package โดยตรง แต่ใช้งานได้ผ่าน proot-distro + Ubuntu

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: ติดตั้ง proot-distro ใน Termux
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pkg update && pkg upgrade -y
  pkg install proot-distro -y

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: ติดตั้ง Ubuntu และเข้าสู่ระบบ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  proot-distro install ubuntu
  proot-distro login ubuntu

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: ใน Ubuntu — ติดตั้ง dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  apt update && apt upgrade -y
  apt install -y curl git podman podman-compose nodejs npm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Clone และ run MeeChain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
  cd MeeChain-Connect
  cp .env.example .env   # แก้ไข .env ตามต้องการ
  bash scripts/start.sh podman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: ทดสอบ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  curl http://localhost:3000/api/health
  podman ps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
หมายเหตุ Android/Termux
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  cgroups v2 อาจไม่ครบ → บาง container feature ใช้ไม่ได้
⚠️  ใช้ --network=host ถ้า port mapping มีปัญหา
✅  Podman rootless ทำงานได้ดีโดยไม่ต้องการ root
✅  แนะนำใช้ bash scripts/start.sh node ถ้า Podman มีปัญหา

GUIDE
}

# ── Install: Debian/Ubuntu ───────────────────────────────────
install_debian() {
  title "📦 Installing Podman on Ubuntu/Debian"
  apt-get update -qq
  apt-get install -y podman podman-compose
  log "Podman installed: $(podman --version)"
}

# ── Install: Fedora/RHEL ─────────────────────────────────────
install_fedora() {
  title "📦 Installing Podman on Fedora/RHEL"
  dnf install -y podman podman-compose
  log "Podman installed: $(podman --version)"
}

# ── Install: Arch ────────────────────────────────────────────
install_arch() {
  title "📦 Installing Podman on Arch"
  pacman -Sy --noconfirm podman
  pip3 install podman-compose
  log "Podman installed: $(podman --version)"
}

# ── Install: macOS ───────────────────────────────────────────
install_macos() {
  title "🍎 Installing Podman on macOS"
  if ! command -v brew &>/dev/null; then
    err "Homebrew not found. Install from https://brew.sh first."
    exit 1
  fi
  brew install podman podman-compose
  podman machine init 2>/dev/null || true
  podman machine start 2>/dev/null || true
  log "Podman installed: $(podman --version)"
}

# ── Install podman-compose via pip ───────────────────────────
ensure_podman_compose() {
  if ! command -v podman-compose &>/dev/null; then
    info "Installing podman-compose via pip3..."
    pip3 install podman-compose 2>/dev/null || pip install podman-compose 2>/dev/null || warn "pip not available; skipping podman-compose"
  fi
}

# ── Main ─────────────────────────────────────────────────────
MODE="${1:-auto}"

case "$MODE" in
  check)
    check_status
    ;;
  termux)
    guide_termux
    ;;
  auto)
    check_status
    ENV=$(detect_env)
    info "Detected environment: $ENV"

    if command -v podman &>/dev/null; then
      log "Podman already installed — nothing to do."
      ensure_podman_compose
    else
      case "$ENV" in
        termux)  guide_termux ;;
        debian)  install_debian; ensure_podman_compose ;;
        fedora)  install_fedora; ensure_podman_compose ;;
        arch)    install_arch ;;
        macos)   install_macos ;;
        *)
          warn "Unknown Linux distro. Trying apt-get..."
          install_debian 2>/dev/null || {
            err "Automatic install failed."
            info "Manual install: https://podman.io/docs/installation"
            exit 1
          }
          ;;
      esac
    fi

    echo ""
    title "✅ Setup Complete"
    info "Start MeeChain with Podman: bash scripts/start.sh podman"
    info "Or use compose:             bash scripts/start.sh compose"
    ;;
  *)
    err "Unknown option: $MODE"
    echo "Usage: $0 [auto|check|termux]"
    exit 1
    ;;
esac

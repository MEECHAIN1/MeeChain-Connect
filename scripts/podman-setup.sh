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
# log แสดงข้อความสถานะด้วยสีเขียวและไอคอนเครื่องหมายถูก โดยรับข้อความเป็นอาร์กิวเมนต์และพิมพ์ลง stdout
log()   { echo -e "${GREEN}✅${NC} $*"; }
# info แสดงข้อความบอกสถานะเป็นข้อความข้อมูล (แสดงเป็นสีฟ้าและไอคอน ℹ️) ไปยัง stdout โดยใช้ข้อความจากอาร์กิวเมนต์ที่ส่งเข้ามา.
info()  { echo -e "${CYAN}ℹ️ ${NC}  $*"; }
# warn แสดงข้อความเตือนสีเหลืองนำหน้าด้วยสัญลักษณ์ "⚠️" ไปยัง stdout
warn()  { echo -e "${YELLOW}⚠️ ${NC}  $*"; }
# err ส่งข้อความข้อผิดพลาดที่รับเป็นอาร์กิวเมนต์ไปยัง stderr พร้อมไอคอน ❌ สีแดง
err()   { echo -e "${RED}❌${NC} $*" >&2; }
# title พิมพ์หัวเรื่องแบบตัวหนาและสีฟ้า จากนั้นขึ้นบรรทัดใหม่ด้วยเส้นคั่นยาว 50 ตัว.
title() { echo -e "\n${BOLD}${CYAN}$*${NC}"; echo "$(printf '─%.0s' {1..50})"; }

# detect_env ตรวจสอบสภาพแวดล้อมรันไทม์และส่งชื่อแพลตฟอร์มหนึ่งใน: termux, macos, debian, fedora, arch, หรือ linux.
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

# check_status แสดงสภาพแวดล้อมและสถานะของเครื่องมือที่จำเป็นสำหรับ MeeChain โดยรายงานเวอร์ชันหรือข้อความแจ้งเตือนสำหรับ Podman, Docker, podman-compose, PM2 และ Node.js (แจ้งข้อผิดพลาดหาก Node.js ไม่มี)
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

# guide_termux พิมพ์คำแนะนำสำหรับการตั้งค่า Termux โดยใช้ proot-distro เพื่อติดตั้ง Ubuntu แล้วติดตั้ง Podman, podman-compose และ Node.js พร้อมตัวอย่างคำสั่งสำหรับรันและทดสอบ MeeChain
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

# install_debian ติดตั้ง Podman และ podman-compose บนระบบ Ubuntu/Debian โดยใช้ apt-get และแสดงเวอร์ชันที่ติดตั้งแล้ว
install_debian() {
  title "📦 Installing Podman on Ubuntu/Debian"
  apt-get update -qq
  apt-get install -y podman podman-compose
  log "Podman installed: $(podman --version)"
}

# install_fedora ติดตั้ง Podman และ podman-compose บนระบบ Fedora/RHEL แล้วแสดงเวอร์ชันที่ติดตั้ง
install_fedora() {
  title "📦 Installing Podman on Fedora/RHEL"
  dnf install -y podman podman-compose
  log "Podman installed: $(podman --version)"
}

# install_arch ติดตั้ง Podman และ podman-compose บนระบบ Arch Linux
# ฟังก์ชันจะใช้ `pacman` เพื่อติดตั้ง `podman` และ `pip3` เพื่อติดตั้ง `podman-compose` แล้วพิมพ์เวอร์ชันของ Podman ที่ติดตั้งแล้ว
install_arch() {
  title "📦 Installing Podman on Arch"
  pacman -Syu --noconfirm podman
  pip3 install podman-compose
  log "Podman installed: $(podman --version)"
}

# install_macos ติดตั้ง Podman และ podman-compose บน macOS และพยายามเริ่ม `podman machine` เพื่อให้พร้อมใช้งาน.
# หาก Homebrew ไม่พบ จะพิมพ์ข้อความแสดงข้อผิดพลาดและออกด้วยสถานะ 1; เมื่อการติดตั้งเสร็จจะแสดงเวอร์ชันของ Podman.
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

# ensure_podman_compose ติดตั้ง `podman-compose` ผ่าน `pip3` (หรือ `pip`) ถ้า `podman-compose` ยังไม่ถูกติดตั้ง และจะแจ้งเตือนเมื่อไม่พบตัวจัดการแพ็กเกจ `pip`
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

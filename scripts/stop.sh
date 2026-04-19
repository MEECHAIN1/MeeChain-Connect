#!/usr/bin/env bash
# ============================================================
# MeeChain Dashboard — Universal Stop Script
# Usage:
#   bash scripts/stop.sh              → auto-detect and stop
#   bash scripts/stop.sh pm2          → stop PM2 process
#   bash scripts/stop.sh podman       → stop Podman container
#   bash scripts/stop.sh docker       → stop Docker container
#   bash scripts/stop.sh compose      → stop compose stack
# ============================================================

set -euo pipefail

APP_NAME="meechain-dashboard"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
# log พิมพ์ข้อความล็อกที่ขึ้นต้นด้วย "[stop]" เป็นสีเขียวไปยัง stdout
log()  { echo -e "${GREEN}[stop]${NC} $*"; }
# warn แสดงข้อความเตือนนำหน้าด้วย '[warn]' สีเหลือง แล้วพิมพ์ข้อความที่ส่งเข้าไปไปยัง stdout.
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
# err พิมพ์ข้อความข้อผิดพลาดไปยัง stderr โดยมีคำนำหน้า `[error]` เป็นสีแดงและรีเซ็ตสีหลังข้อความ
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# stop_pm2 หยุดกระบวนการ PM2 ที่ระบุโดยตัวแปร APP_NAME และพยายามลบรายการ PM2 นั้นออกจากตัวจัดการงาน.
stop_pm2() {
  log "Stopping PM2 process '$APP_NAME'..."
  pm2 stop "$APP_NAME"   2>/dev/null && log "PM2 stopped." || warn "PM2 process not found."
  pm2 delete "$APP_NAME" 2>/dev/null || true
}

# stop_podman หยุดและลบคอนเทนเนอร์ Podman ที่มีชื่อจากตัวแปร APP_NAME พร้อมแสดงข้อความสถานะ
# แสดงข้อความบันทึกเมื่อหยุดสำเร็จ หรือข้อความเตือนเมื่อคอนเทนเนอร์ไม่ถูกพบ/ไม่ได้รัน
stop_podman() {
  log "Stopping Podman container '$APP_NAME'..."
  podman stop "$APP_NAME"  2>/dev/null && log "Container stopped." || warn "Container not running."
  podman rm   "$APP_NAME"  2>/dev/null || true
}

# stop_docker หยุดและลบคอนเทนเนอร์ Docker ที่มีชื่อกำหนดในตัวแปร APP_NAME
# 
# จะพยายามหยุดคอนเทนเนอร์แล้วลบมัน ถ้าคอนเทนเนอร์ไม่พบจะพิมพ์คำเตือน และจะไม่ล้มเหลวหากการลบล้มเหลวหรือไม่พบคอนเทนเนอร์
stop_docker() {
  log "Stopping Docker container '$APP_NAME'..."
  docker stop "$APP_NAME"  2>/dev/null && log "Container stopped." || warn "Container not running."
  docker rm   "$APP_NAME"  2>/dev/null || true
}

# stop_compose หยุดสแต็ค Compose ของแอปใน ROOT_DIR โดยเลือกใช้ podman-compose, `docker compose` หรือ docker-compose ตามลำดับ
# หากพบเครื่องมือที่รองรับจะรันคำสั่ง `... down` ที่เหมาะสมเพื่อยกเลิกและลบทรัพยากร
# หากไม่พบเครื่องมือ Compose ใดๆ จะพิมพ์ข้อความแสดงข้อผิดพลาดและออกด้วยสถานะ 1
stop_compose() {
  cd "$ROOT_DIR"
  if   command -v podman-compose &>/dev/null; then
    log "Stopping with podman-compose..."
    podman-compose down
  elif docker compose version &>/dev/null 2>&1; then
    log "Stopping with docker compose..."
    docker compose down
  elif command -v docker-compose &>/dev/null; then
    log "Stopping with docker-compose..."
    docker-compose down
  else
    err "No compose tool found."
    exit 1
  fi
}

# stop_node หยุดกระบวนการ Node ตาม PID ที่เก็บใน /tmp/meechain.pid และลบไฟล์ PID นั้น; หากไม่พบไฟล์ จะส่งคำเตือน
stop_node() {
  if [ -f /tmp/meechain.pid ]; then
    PID=$(cat /tmp/meechain.pid)
    if kill -0 "$PID" 2>/dev/null && ps -p "$PID" -o comm= 2>/dev/null | grep -q '^node'; then
      kill "$PID" && log "Killed node process PID $PID"
    else
      warn "PID $PID not a live node process (stale PID file?)."
    fi
    rm -f /tmp/meechain.pid
  else
    warn "No PID file found at /tmp/meechain.pid"
  fi
}

# stop_auto ตรวจหาและหยุดบริการ `meechain-dashboard` โดยอัตโนมัติ โดยตรวจสอบ PM2, Podman, Docker และกระบวนการ Node (ผ่าน /tmp/meechain.pid)
# จะเรียกฟังก์ชันหยุดที่เหมาะสมเมื่อพบการรัน และจะแสดงข้อความเตือนหากไม่พบสิ่งที่ต้องหยุดหรือยืนยันเมื่อหยุดสำเร็จ
stop_auto() {
  STOPPED=0
  # PM2 - use exact name lookup with pm2 describe
  if command -v pm2 &>/dev/null && pm2 describe "$APP_NAME" &>/dev/null; then
    stop_pm2; STOPPED=1
  fi
  # Podman - use exact line match
  if command -v podman &>/dev/null && podman ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$APP_NAME"; then
    stop_podman; STOPPED=1
  fi
  # Docker - use exact line match
  if command -v docker &>/dev/null && docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$APP_NAME"; then
    stop_docker; STOPPED=1
  fi
  # Bare node
  if [ -f /tmp/meechain.pid ]; then
    stop_node; STOPPED=1
  fi

  [ $STOPPED -eq 0 ] && warn "Nothing was running to stop." || log "All '$APP_NAME' processes stopped."
}

MODE="${1:-auto}"
case "$MODE" in
  auto)    stop_auto    ;;
  pm2)     stop_pm2     ;;
  podman)  stop_podman  ;;
  docker)  stop_docker  ;;
  compose) stop_compose ;;
  node)    stop_node    ;;
  *)
    err "Unknown mode: $MODE"
    echo "Usage: $0 [auto|pm2|podman|docker|compose|node]"
    exit 1
    ;;
esac
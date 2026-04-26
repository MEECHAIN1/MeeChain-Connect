# MeeChain Dashboard

แดชบอร์ด Web Application สำหรับ MeeChain Blockchain Platform

## Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js 18+
- Local web server (`python3 -m http.server`, `npx serve`) หรือรันผ่าน `node server.js`

## Installation
```bash
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
cd MeeChain-Connect
npm install
```

## Usage
```bash
node server.js
```

เปิดเว็บที่ `http://localhost:3000`

## Contributor onboarding checklist
เอกสาร checklist ฉบับ ritualized สำหรับ contributors:
- `docs/CONTRIBUTOR_CHECKLIST.md`

## Production-safe RPC fallback
รองรับผ่าน env ใน `server.js`:
- `RPC_MODE=auto|upstream-only|mock-only`
- `RPC_ALLOW_MOCK_FALLBACK=true|false`
- `RPC_TIMEOUT_MS=3000`
- `RPC_BREAKER_FAILURE_THRESHOLD=2`
- `RPC_BREAKER_COOLDOWN_MS=60000`

ตรวจสถานะวงจร fallback:
- `GET /api/rpc/status`
- `GET /rpc/health`

## RPC smoke test
```bash
bash scripts/test-rpc.sh https://rpc.meechain.live/rpc https://rpc.meechain.live/health
```

ถ้าอยู่หลัง Cloudflare Access:
```bash
export CF_ACCESS_CLIENT_ID="<client-id>"
export CF_ACCESS_CLIENT_SECRET="<client-secret>"
bash scripts/test-rpc.sh https://rpc.meechain.live/rpc https://rpc.meechain.live/health
```

## Integration test: local `/rpc/health`
```bash
npm run test:rpc:integration
```

เทสต์นี้จะบูต `server.js` ในพอร์ตทดสอบ แล้วตรวจว่า `/rpc/health` และ `/api/rpc/status` ให้ค่า state ถูกต้อง.

## Celebration overlay demo
![RPC connected celebration animation](docs/assets/rpc-connected-demo.svg)


## External RPC verification
```bash
npm run verify:rpc
# or
bash scripts/verify-rpc-endpoint.sh https://rpc.meechain.live/rpc 10
```

เทสต์นี้บังคับตรวจทั้ง GET และ POST JSON-RPC เพื่อลด false positive (กรณี GET ตอบ 200 แต่ POST timeout).


## Docker Compose healthcheck
ตอนนี้มี `docker-compose.yml` พร้อม `healthcheck` ที่ตรวจ `GET /rpc/health` ภายใน container เพื่อให้ orchestration รู้สถานะ RPC proxy ได้อัตโนมัติ.

```bash
PRIMARY_CONTEXT=default FALLBACK_CONTEXT=podman npm run compose:up
PRIMARY_CONTEXT=default FALLBACK_CONTEXT=podman npm run compose:ps
```

## Docker → Podman failover demo log
ตัวอย่างผลลัพธ์จริงของ flow failover อยู่ที่:
- `docs/assets/compose-failover-demo.svg`

![Docker to Podman failover demo](docs/assets/compose-failover-demo.svg)

## External RPC check (ล่าสุด)
ตรวจจาก external network วันที่ **April 19, 2026**:
- `GET https://rpc.meechain.live/rpc` ตอบ `200` พร้อม JSON status
- `POST https://rpc.meechain.live/rpc` (eth_chainId) ยัง timeout ~10s
- สรุป: external endpoint ยังไม่พร้อมสำหรับ wallet client จนกว่า POST จะตอบ JSON-RPC ปกติ

## Cloudflare Tunnel
ตัวอย่าง config: `cloudflared/config.yml.example`

```bash
cp cloudflared/config.yml.example ~/.cloudflared/config.yml
cloudflared tunnel run meechain-connect
```

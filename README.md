<img width="688" height="1529" alt="1000185359" src="https://github.com/user-attachments/assets/913ae435-f0c0-41eb-922d-3e1ccae70000" />
# MeeChain Connect

Web app และ API server สำหรับ MeeChain พร้อม runtime helper สำหรับรันแบบ local, PM2, Docker และ Compose

## Features

- MeeChain API server ผ่าน `server.js`
- Health check ที่ `/health` และ `/api/health`
- Config endpoint ที่ `/api/config`
- Web3 / RPC integration สำหรับ MeeChain
- Runtime helper scripts สำหรับ start, stop, logs, status, doctor

## Requirements

- Node.js 20+ แนะนำ
- npm
- PM2 (ถ้าจะรันแบบ process manager)
- Docker / Compose (ถ้าจะรันแบบ container)

## Quick Start

```bash
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
cd MeeChain-Connect
cp .env.example .env
npm install
bash scripts/doctor.sh
bash scripts/start.sh
```

## Run Modes

### Auto

```bash
bash scripts/start.sh
```

### PM2

```bash
bash scripts/start.sh pm2
```

### Docker

```bash
bash scripts/start.sh docker
```

### Compose

```bash
bash scripts/start.sh compose
```

### Portainer (Docker Swarm)

ไฟล์ `docker-compose.portainer.yml` เพิ่ม Portainer EE แบบเชื่อมผ่าน Portainer Agent สำหรับ Docker Swarm โดยเปิดพอร์ต `9443`, `9000`, และ `8000`

```bash
docker swarm init # run once on manager, if Swarm is not initialized yet
docker stack deploy -c docker-compose.portainer.yml portainer
```

### Plain Node

```bash
bash scripts/start.sh node
```

## Useful Commands

### Environment report

```bash
bash scripts/start.sh --explain
```

### Service status

```bash
bash scripts/status.sh
```

### Logs

```bash
bash scripts/logs.sh
```

### Stop service

```bash
bash scripts/stop.sh
```

## Health Check

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/config
```

## Cloudflare Gateway RPC Profile

MeeChain exposes a Cloudflare Gateway RPC metadata profile through `GET /api/network` and the reusable `sessions.json` automation template:

- Primary RPC Gateway: IPv4 `172.64.36.1`
- Secondary RPC Gateway: IPv6 `2a06:98c1:54::4b:43e8`
- Secure DNS over TLS: `ohsut0yy6x.cloudflare-gateway.com`
- Secure DNS over HTTPS: `https://ohsut0yy6x.cloudflare-gateway.com/dns-query`

See `docs/RPC_GATEWAY_SETUP.md` for the overlay badge flow and operational checklist.


## PM2

โปรเจกต์นี้มี `ecosystem.config.cjs` สำหรับรันผ่าน PM2 โดยใช้ process name:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 logs meechain-dashboard
pm2 status
```

## Environment

ตั้งค่าผ่าน `.env`

ตัวอย่างค่าหลัก:

```env
PORT=3000
NODE_ENV=production
CHAIN_ID=13390
DRPC_RPC_URL=https://rpc.meechain.live/rpc
VITE_RPC_URL=https://rpc.meechain.live/rpc
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
```

> ถ้าไม่ได้ตั้ง `OPENAI_API_KEY` ระบบจะยังรันได้ แต่ฟีเจอร์ MeeBot AI จะถูกปิดไว้

## Project Structure

```text
.
├── server.js
├── ecosystem.config.cjs
├── docker-compose.yml
├── Dockerfile
├── scripts/
│   ├── doctor.sh
│   ├── start.sh
│   ├── stop.sh
│   ├── status.sh
│   └── logs.sh
├── src/
└── .env.example
```

## Notes

- แนะนำให้ใช้งานผ่าน `scripts/start.sh` เป็นหลัก
- ใน Termux มักเหมาะกับ `node` หรือ `pm2`
- ถ้าใช้งาน container ให้ใช้ Docker/Compose ตาม environment ที่รองรับ

## License

MIT

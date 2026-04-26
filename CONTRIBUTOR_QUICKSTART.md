# 🚀 MeeChain-Connect Contributor Quickstart Guide

เอกสารนี้สรุปคำสั่งหลักทั้งหมดจาก `package.json` เพื่อให้ contributors เริ่มทำงานได้ทันทีแบบ reproducible

## Script Reference

| Script | คำสั่งที่ใช้ | หน้าที่ |
| --- | --- | --- |
| `start` | `npm start` | รัน (production start) |
| `dev` | `npm run dev` | รันด้วย nodemon (hot reload สำหรับ dev) |
| `build` | `npm run build` | สร้าง bundle ด้วย `scripts/build-pages.mjs` |
| `deploy:worker` | `npm run deploy:worker` | Deploy ไปที่ Cloudflare Worker |
| `hardhat` | `npm run hardhat` | รัน local blockchain node ด้วย Hardhat |
| `deploy` | `npm run deploy` | Deploy smart contract ไปที่ localhost network |
| `test` | `npm test` | รัน unit test ด้วย Mocha |
| `test:rpc` | `npm run test:rpc` | ทดสอบ RPC proxy script |
| `infra:start` | `npm run infra:start` | เริ่ม infra ผ่าน `scripts/start.sh` |
| `infra:start:podman` | `npm run infra:start:podman` | เริ่ม infra ด้วย Podman |
| `infra:start:docker` | `npm run infra:start:docker` | เริ่ม infra ด้วย Docker |
| `infra:start:pm2` | `npm run infra:start:pm2` | เริ่ม infra ด้วย PM2 (Node.js process manager) |
| `container:build` | `npm run container:build` | Build image ด้วย Podman/Docker |
| `docs` | `npm run docs` | สร้างเอกสารด้วย JSDoc |
| `docs:watch` | `npm run docs:watch` | สร้างเอกสารพร้อม hot reload |

---

## 1) ติดตั้ง dependencies

```bash
npm install
```

ติดตั้งทุก package ที่จำเป็น

ถ้ามี vulnerabilities:

```bash
npm audit fix
```

## 2) รันโปรเจกต์

| โหมด | คำสั่ง | อธิบาย |
| --- | --- | --- |
| Production Start | `npm start` | รัน `server.js` |
| Development (Hot Reload) | `npm run dev` | ใช้ nodemon รัน `server.js` |
| Build Pages | `npm run build` | สร้าง bundle ด้วย `scripts/build-pages.mjs` |

## 3) Infrastructure

| Runtime | คำสั่ง | อธิบาย |
| --- | --- | --- |
| Generic Infra | `npm run infra:start` | เริ่ม infra ผ่าน `scripts/start.sh` |
| Podman | `npm run infra:start:podman` | เริ่ม infra ด้วย Podman |
| Docker | `npm run infra:start:docker` | เริ่ม infra ด้วย Docker |
| PM2 (แนะนำบน Termux) | `npm run infra:start:pm2` | เริ่ม infra ด้วย PM2 (ง่ายสุดบนมือถือ) |

## 4) Blockchain

| Task | คำสั่ง |
| --- | --- |
| รัน local node | `npm run hardhat` |
| Deploy contracts | `npm run deploy` |

## 5) Testing

| Test | คำสั่ง |
| --- | --- |
| Unit test | `npm test` |
| RPC test | `npm run test:rpc` |
| Production test | `npm run test:prod` |
| Browser regression | `npm run test:browser:live` |

## 6) Documentation

| Task | คำสั่ง |
| --- | --- |
| Generate docs | `npm run docs` |
| Watch docs | `npm run docs:watch` |

✨ Contributors ไม่ต้องเดาอีกต่อไปแล้ว → ใช้ `npm run <script>` ตามตารางนี้ได้เลย ทุกอย่าง reproducible และตรงกับ `package.json` 🎉

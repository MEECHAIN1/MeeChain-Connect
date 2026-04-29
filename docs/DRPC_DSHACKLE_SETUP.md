# dRPC + Existing RPC via Dshackle (MeeChain runbook)

เอกสารนี้จัดชุดสำหรับใช้ dRPC คู่กับ RPC ปัจจุบัน โดยให้ Dshackle เป็น proxy ตัวกลาง

## Architecture
- Wallet/DApp -> `http(s)://<dshackle-host>:12448`
- Dshackle -> Local RPC (primary) + dRPC endpoint (fallback)

## 1) เตรียม config
ใช้ไฟล์ตัวอย่าง:
- `config/dshackle/provider.example.yaml`

สิ่งที่ต้องแก้:
1. TLS cert/key paths
2. provider/drpc key paths
3. dRPC provider URL
4. เลือก primary/fallback ตามนโยบายของทีม

## 2) Routing policy แนะนำ
- `trace_*` -> dRPC (เหมาะกับ endpoint ที่ optimize trace)
- `eth_newFilter`, `eth_getFilterChanges` -> local
- generic calls -> local ก่อน, dRPC เป็นสำรอง

## 3) เชื่อมเข้ากับ MeeChain server
ตั้ง env ของ `server.js` ให้ชี้เข้าหา Dshackle แทน direct upstream:

```bash
export DRPC_RPC_URL="http://127.0.0.1:12448"
export VITE_RPC_URL="http://127.0.0.1:12448"
```

จากนั้นรัน:
```bash
node server.js
```

## 4) Verify
ตรวจ endpoint หลัก:
```bash
curl -sS http://127.0.0.1:3000/rpc/health
```

ตรวจ JSON-RPC ผ่าน proxy:
```bash
curl -sS -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  http://127.0.0.1:12448
```

## 5) Operational cautions
- ไม่ต้องวาง load balancer ซ้อนหน้า Dshackle สำหรับ node เดียวกัน
- ถ้ารันหลาย Dshackle instance ให้แยก DNS + SSL cert
- monitor timeout/error rate ที่ POST JSON-RPC เป็นหลัก (อย่าดู GET อย่างเดียว)


## 6) Run via compose

```bash
npm run compose:dshackle:up
npm run compose:dshackle:ps
npm run compose:dshackle:down
```

Compose จะใช้ `docker-compose.yml` + `docker-compose.dshackle.yml` ร่วมกัน

## 7) Local dev profile (no TLS/Auth)

สำหรับ dev เท่านั้น (ห้ามใช้ production):

```bash
npm run compose:dshackle:local:up
npm run compose:dshackle:local:ps
npm run compose:dshackle:local:down
```

ใช้ไฟล์ `docker-compose.dshackle.local.yml` และ `config/dshackle/provider.local.yaml`

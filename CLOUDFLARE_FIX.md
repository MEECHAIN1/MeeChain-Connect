# 🔧 Cloudflare RPC Fix Guide

## ❌ ปัญหาที่พบ

```
GET https://rpc.meechain.live/health
→ HTTP 404
→ Content-Type: application/xml
→ <Error><Code>NoSuchBucket</Code><BucketName>meechain-bucket</BucketName>
→ x-amz-request-id: F0DY3HANWF3TQA2S  ← Amazon/R2 signature!
```

**Root Cause**: Cloudflare ส่ง traffic ไปที่ **Cloudflare R2 bucket "meechain-bucket"** แทนที่จะ proxy ไปที่ server จริง (58.11.89.11:8080)

---

## 🔍 วิธีตรวจสอบ (ทำแล้ว)

| Item | Status |
|------|--------|
| DNS A record: rpc → 104.21.33.3, 172.67.188.103 | ✅ ถูกต้อง (Cloudflare IPs) |
| SSL cert: *.meechain.live | ✅ ถูกต้อง |
| Cloudflare backend routing → R2 bucket | ❌ ผิด! ต้องชี้ไปที่ 58.11.89.11 |
| x-amz-request-id ใน response | ❌ แสดงว่าใช้ R2 handler |

---

## ✅ วิธีแก้ไข (เลือกวิธีใดวิธีหนึ่ง)

---

### วิธีที่ 1: Cloudflare Worker (แนะนำ ✨)

**Step 1: สร้าง Worker**
1. ไปที่ https://dash.cloudflare.com → **Workers & Pages**
2. คลิก **Create Worker**
3. ตั้งชื่อ: `meechain-rpc-proxy`
4. วาง code จากไฟล์ `cloudflare-worker.js` ในโปรเจกต์นี้
5. แก้ค่า `ORIGIN_IP: '58.11.89.11'` และ `ORIGIN_PORT: 8080`
6. คลิก **Save & Deploy**

**Step 2: ผูก Worker กับ rpc.meechain.live**
1. Worker settings → **Triggers** → **Custom Domains**
2. คลิก **Add Custom Domain**
3. พิมพ์: `rpc.meechain.live`
4. คลิก **Add**
5. Cloudflare จะลบ R2 binding อัตโนมัติและผูก Worker แทน

**Step 3: ทดสอบ**
```bash
curl https://rpc.meechain.live/health
# ควรได้: {"status":"ok","service":"MeeChain RPC Gateway",...}
```

---

### วิธีที่ 2: แก้ DNS Record ตรงๆ (ถ้าไม่ได้ใช้ R2)

**Step 1: ลบ R2 Custom Domain**
1. Cloudflare Dashboard → **R2 Storage** → bucket **meechain-bucket**
2. **Settings** → **Custom Domains**
3. ลบ `rpc.meechain.live` ออก

**Step 2: ตั้ง DNS A record**
1. Cloudflare Dashboard → **DNS** → **Records**
2. หา record ของ `rpc` → แก้ไข:
   - Type: `A`
   - Name: `rpc`
   - Content (IPv4): `58.11.89.11`
   - Proxy status: **Proxied** (เมฆส้ม)
3. Save

**Step 3: ตั้ง Origin Rule / Page Rule (สำคัญ)**
1. **Rules** → **Origin Rules** → สร้างใหม่:
   - Condition: Hostname = `rpc.meechain.live`
   - Override origin port: `8080`
2. หรือใช้ **Transform Rules** redirect port

---

### วิธีที่ 3: Cloudflare Tunnel (ปลอดภัยที่สุด — ไม่ต้อง expose port)

```bash
# บนเครื่อง server ที่บ้าน (Windows หรือ Linux):
# 1. ติดตั้ง cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# 2. Login
cloudflared tunnel login

# 3. สร้าง tunnel
cloudflared tunnel create meechain-rpc

# 4. สร้าง config
cat > config.yml << 'EOF'
tunnel: 66b8d43c-39f8-4ee1-97db-13cb718825cd
credentials-file: ~/.cloudflared/66b8d43c-39f8-4ee1-97db-13cb718825cd.json
ingress:
  - hostname: rpc.meechain.live
    service: http://localhost:8080
  - hostname: app.meechain.live
    service: http://localhost:8080
  - service: http_status:404
EOF

# 5. Route DNS
cloudflared tunnel route dns 66b8d43c-39f8-4ee1-97db-13cb718825cd rpc.meechain.live
cloudflared tunnel route dns 66b8d43c-39f8-4ee1-97db-13cb718825cd app.meechain.live

# 6. Run tunnel
cloudflared tunnel run 66b8d43c-39f8-4ee1-97db-13cb718825cd
```

> หมายเหตุ: ในหน้า **Connector diagnostics** ค่า `Connector ID` จะต่างจาก `Tunnel ID` ซึ่งเป็นเรื่องปกติ
> (เช่น Connector ID ในรูปคือ `12b8991d-08ca-4050-8318-d1bac7dad5e2` แต่ Tunnel ID ที่ใช้งานคือ `66b8d43c-39f8-4ee1-97db-13cb718825cd`).

---

## 🧪 ทดสอบหลังแก้ไข

```bash
# Test 1: Health check
curl https://rpc.meechain.live/health
# ✅ ควรได้: {"status":"ok","service":"MeeChain RPC Gateway",...}

# Test 2: JSON-RPC
curl -X POST https://rpc.meechain.live/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# ✅ ควรได้: {"jsonrpc":"2.0","result":"0x344d","id":1}  (0x344d = 13390)

# Test 3: API health
curl https://rpc.meechain.live/api/health
# ✅ ควรได้: {"status":"ok","model":"gpt-5-mini",...}
```

---

## ⚠️ หมายเหตุสำคัญ

- เมื่อ Cloudflare routing ถูกต้องแล้ว → แก้ `.env` กลับ:
  ```
  DRPC_RPC_URL=https://rpc.meechain.live
  VITE_RPC_URL=https://rpc.meechain.live
  ```
- รัน `pm2 restart meechain-dashboard` หลังแก้ `.env`
- Server ต้องฟัง port 8080 (ไม่ใช่แค่ 3000) หรือตั้ง port forward ให้ถูก

---

## 📡 สถานะปัจจุบัน (2026-03-28)

```
rpc.meechain.live DNS → Cloudflare IP ✅
SSL Certificate       → Let's Encrypt *.meechain.live ✅
Cloudflare routing    → R2 bucket "meechain-bucket" ❌ (ต้องแก้)
Server (local)        → http://localhost:3000 ✅ (ทำงานปกติ)
Server (public)       → ยังไม่ verify ว่า 58.11.89.11:8080 ตอบได้
```

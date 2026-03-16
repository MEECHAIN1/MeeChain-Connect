# MeeChain Contributor Onboarding Guide

คู่มือนี้ช่วยให้ contributor ใหม่เริ่มทำงานได้ครบ flow: **start node → start RPC proxy/tunnel → test API → deploy smart contract**.

## 1) Setup Environment

```bash
git clone https://github.com/meechain1/MeeChain-Connect.git
cd MeeChain-Connect
npm install
```

---

## 2) Start Blockchain Node (Hardhat)

รัน Hardhat node บนพอร์ต `8548`:

```bash
npx hardhat node --port 8548
```

ตรวจสอบว่า node ตอบกลับได้:

```bash
curl -X POST http://127.0.0.1:8548 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected: ค่า `"result":"0x344e"`

---

## 3) Start RPC Proxy (Nginx + TLS)

ตัวอย่าง `nginx.conf`:

```nginx
server {
  listen 0.0.0.0:5005 ssl;
  server_name rpc.meechain.run.place;

  ssl_certificate     /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  location / {
    proxy_pass http://127.0.0.1:8548;
    proxy_set_header Host $host;
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
    add_header Access-Control-Allow-Headers 'Content-Type';
  }
}
```

เริ่มใช้งาน Nginx:

```bash
sudo nginx -c /home/runner/workspace/nginx.conf
sudo nginx -s reload
```

ทดสอบ RPC proxy:

```bash
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected: ค่า `"result":"0x344e"`

---

## 4) Cloudflare Tunnel (meechain.xyz)

หากเจอปัญหาการเชื่อมต่อ tunnel ให้ตรวจสอบว่า config เป็น YAML ที่ถูกต้อง และ path เป็น Linux path จริง (ไม่ใช้ `C:\...`):

```yaml
tunnel: meechaintunnel
credentials-file: /project/meechain-backend/.cloudflared/c9cfc770-2bc6-43cf-9451-316f49c6e2e7.json

ingress:
  - hostname: meechain.xyz
    service: http://meechain-backend:3000
  - service: http_status:404
```

เช็กการทำงาน:

```bash
cloudflared tunnel run meechaintunnel
```

> Tips:
> - `credentials-file` ต้องชี้ไปที่ไฟล์ JSON ที่มีอยู่จริง
> - service `http://meechain-backend:3000` ต้องเข้าถึงได้จาก container/network เดียวกับ cloudflared
> - หากรันนอก Docker ให้เปลี่ยนเป็น `http://127.0.0.1:3000` หรือ host ที่เข้าถึงได้จริง

---

## 5) Start Application Server

รันแอปที่พอร์ต `3003`:

```bash
npm run dev -- --port 3003
```

ทดสอบ API:

```bash
curl http://localhost:3003/api/web3/status
```

Expected: API ตอบกลับ chain ID เป็น `0x344e`

---

## 6) Deploy Smart Contract

ตัวอย่าง deploy script ด้วย Hardhat:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

ถ้าโปรเจกต์มีหลายสคริปต์ ให้ใช้สคริปต์ที่ทีมกำหนดในโฟลเดอร์ `scripts/`.

---

## 7) QA Checklist

- [ ] Hardhat node running on port 8548
- [ ] RPC proxy running on port 5005
- [ ] Cloudflare Tunnel `meechaintunnel` is healthy
- [ ] Application server running on port 3003
- [ ] RPC test returns `"0x344e"`
- [ ] API endpoints return valid data
- [ ] Smart contract deployment works on local node

---

## Quick Troubleshooting

1. **`connection refused` จาก tunnel**
   - ตรวจว่า service ปลายทาง (`meechain-backend:3000` หรือ `127.0.0.1:3000`) เปิดอยู่จริง
2. **`x509`/TLS error ที่ proxy**
   - ตรวจ cert/key path ใน nginx
3. **chainId ไม่ใช่ `0x344e`**
   - ตรวจว่ารัน Hardhat node คนละพอร์ตหรือมี node ตัวอื่นชนอยู่
4. **CORS error จาก frontend**
   - ตรวจ header ใน Nginx location block

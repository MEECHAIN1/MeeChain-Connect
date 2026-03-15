# MeeChain Contributor Onboarding Guide

คู่มือนี้ช่วยให้ผู้ร่วมพัฒนาเริ่มต้นระบบแบบครบลำดับ: **Blockchain node → RPC proxy/tunnel → API server → QA checks**

## 1) Setup Environment

```bash
git clone https://github.com/MeeChain/MeeChain-Connect.git
cd MeeChain-Connect
npm install
```

---

## 2) Start Blockchain Node (Hardhat)

1. เปิด Hardhat node ที่พอร์ต `8548`

```bash
npx hardhat node --port 8548
```

2. ทดสอบว่า node ตอบสนอง

```bash
curl -X POST http://127.0.0.1:8548 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

ผลลัพธ์ที่คาดหวัง:

- chain ID = `0x344e`

---

## 3) Start RPC Proxy (Nginx + TLS)

ตัวอย่าง config สำหรับ reverse proxy จาก HTTPS (`5005`) ไป Hardhat (`8548`)

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

เริ่มและ reload Nginx:

```bash
sudo nginx -c /home/runner/workspace/nginx.conf
sudo nginx -s reload
```

ทดสอบ proxy:

```bash
curl -X POST https://127.0.0.1:5005 \
  -H "Content-Type: application/json" \
  --insecure \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

ผลลัพธ์ที่คาดหวัง:

- chain ID = `0x344e`

---

## 4) Expose API ผ่าน Cloudflare Tunnel

สำหรับ config ที่ใช้งานจริง ควรแน่ใจว่า path และ service ถูกต้องตามเครื่องที่รัน tunnel:

```yaml
tunnel: meechaintunnel
credentials-file: /project/meechain-backend/.cloudflared/c9cfc770-2bc6-43cf-9451-316f49c6e2e7.json
ingress:
  - hostname: meechain.xyz
    service: http://127.0.0.1:3000
  - service: http_status:404
```

> หมายเหตุสำคัญ:
>
> - ถ้ารัน `cloudflared` บน host machine ให้ใช้ `127.0.0.1:3000` (หรือ localhost)
> - `http://meechain-backend:3000` จะใช้ได้เฉพาะตอนรันใน Docker network เดียวกันเท่านั้น
> - หลีกเลี่ยง path แบบ Windows (`C:\...`) ใน config ที่รันบน Linux container/VM

คำสั่งตรวจสอบ/รัน tunnel:

```bash
cloudflared tunnel ingress validate /project/meechain-backend/.cloudflared/config.yml
cloudflared tunnel --config /project/meechain-backend/.cloudflared/config.yml run meechaintunnel
```

---

## 5) Start Application Server

รัน API server ที่พอร์ต `3003`:

```bash
npm run dev -- --port 3003
```

ทดสอบสถานะ Web3:

```bash
curl http://localhost:3003/api/web3/status
```

ผลลัพธ์ที่คาดหวัง:

- มีค่า chain ID `0x344e`

---

## 6) QA Checklist

- [ ] Hardhat node ทำงานที่พอร์ต `8548`
- [ ] RPC proxy ทำงานที่พอร์ต `5005`
- [ ] Application server ทำงานที่พอร์ต `3003`
- [ ] RPC test ตอบกลับ chain ID `0x344e`
- [ ] API endpoints ตอบกลับข้อมูลถูกต้อง
- [ ] Smart contract APIs เข้าถึงได้

---

## 7) Quick Troubleshooting

- `ERR_NAME_NOT_RESOLVED` หรือ `host not found` บน tunnel
  - ตรวจว่าใช้ host ถูกบริบท (`127.0.0.1` vs service name ใน Docker)
- ได้ `502 Bad Gateway`
  - backend ไม่ได้รันที่พอร์ตที่ tunnel/proxy ชี้อยู่
- CORS error จากหน้าเว็บ
  - ตรวจ header ใน Nginx และ endpoint `/api/web3/status`

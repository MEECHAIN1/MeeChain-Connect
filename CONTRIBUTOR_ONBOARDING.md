# MeeChain Contributor Onboarding Guide

เอกสารนี้ช่วยให้ contributor ใหม่สามารถเริ่มระบบหลักได้ครบ: node → proxy → app → API check

## Setup Environment

1. Clone repository
   ```bash
   git clone https://github.com/MeeChain/MeeChain-Connect.git
   cd MeeChain-Connect
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Create env file
   ```bash
   cp .env.example .env
   ```

## Quick Verify

หลังจากเปิด node/proxy/app ครบแล้ว ให้ตรวจสอบทั้งหมดด้วยคำสั่งเดียว:

```bash
./scripts/verify-onboarding.sh
```

> สคริปต์จะเช็คพอร์ต 8548/5005/3003, RPC `eth_chainId`, และ API `/api/health` + `/api/web3/status` พร้อมบอกคำแนะนำเมื่อ fail

## Start Blockchain Node

1. Run Hardhat node (port 8548)
   ```bash
   npx hardhat node --port 8548
   ```
2. Verify node
   ```bash
   curl -X POST http://127.0.0.1:8548 \
   -H "Content-Type: application/json" \
   --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
   ```
   ✅ Expect `"0x344e"`

## Start RPC Proxy

1. Ensure Nginx config
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
2. Start Nginx
   ```bash
   sudo nginx -c /home/runner/workspace/nginx.conf
   sudo nginx -s reload
   ```
3. Test proxy
   ```bash
   curl -X POST https://127.0.0.1:5005 \
   -H "Content-Type: application/json" \
   --insecure \
   --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
   ```
   ✅ Expect `"0x344e"`

## Start Application Server

1. Run app (port 3003)
   ```bash
   npm run dev -- --port 3003
   ```
2. Test API
   ```bash
   curl http://localhost:3003/api/web3/status
   ```
   ✅ Should return chain ID `0x344e`

## QA Checklist

- [ ] Hardhat node running on port 8548
- [ ] RPC proxy running on port 5005
- [ ] Application server running on port 3003
- [ ] RPC test returns `"0x344e"`
- [ ] API endpoints return valid data
- [ ] Smart contract APIs accessible

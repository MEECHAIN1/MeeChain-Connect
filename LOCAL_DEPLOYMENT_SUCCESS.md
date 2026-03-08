# ✅ Local Deployment Success

## สถานะปัจจุบัน

PM2 รันสำเร็จบน WSL (Windows Subsystem for Linux):

```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ meebot             │ cluster  │ 0    │ online    │ 0%       │ 62.5mb   │
│ 1  │ meebot             │ cluster  │ 0    │ online    │ 14.3%    │ 62.3mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### ✅ ทำงานแล้ว
- PM2 cluster mode (2 instances)
- Web3 connected to BSC Mainnet (Chain 56)
- Server running on port 3000
- RPC: https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9

## 🧪 ทดสอบ Local Server

### 1. ทดสอบ Health Check

```bash
curl http://localhost:3000/api/health
```

คาดหวัง:
```json
{"status":"ok","chainId":"0x38"}
```

### 2. ทดสอบ Web3 Status

```bash
curl http://localhost:3000/api/web3/status
```

### 3. ทดสอบ Web3 Stats

```bash
curl http://localhost:3000/api/web3/stats
```

### 4. เปิดใน Browser

```
http://localhost:3000
```

## 📊 PM2 Commands

### ดู Status
```bash
pm2 status
```

### ดู Logs
```bash
pm2 logs meebot
pm2 logs meebot --lines 50
```

### Restart
```bash
pm2 restart meebot
```

### Stop
```bash
pm2 stop meebot
```

### Delete
```bash
pm2 delete meebot
```

### Save Configuration
```bash
pm2 save
pm2 startup
```

## 🌐 เข้าถึงจาก Network อื่น

ถ้าต้องการให้เครื่องอื่นเข้าถึงได้:

### 1. หา IP Address ของเครื่อง Windows

```powershell
# บน PowerShell (Windows)
ipconfig
```

หา IPv4 Address (เช่น 192.168.1.113)

### 2. เปิด Windows Firewall

```powershell
# บน PowerShell (Admin)
New-NetFirewallRule -DisplayName "MeeBot Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 3. เข้าถึงจากเครื่องอื่น

```
http://192.168.1.113:3000
```

## 🚀 Deploy to Production Server (meebot.io)

ตอนนี้ local ทำงานแล้ว ขั้นตอนถัดไปคือ deploy ไป production:

### Option 1: Deploy ผ่าน SSH (ถ้า SSH ใช้งานได้)

```bash
# SSH เข้า server
ssh root@2.57.91.91

# Clone repo
cd /var/www
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git meebot.io
cd meebot.io

# Install dependencies
npm install

# Copy environment file
cp .env.production .env

# แก้ไข .env ให้ใส่ API keys จริง
nano .env

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup Nginx
sudo cp nginx/meebot.io.conf /etc/nginx/sites-available/meebot.io
sudo ln -s /etc/nginx/sites-available/meebot.io /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

### Option 2: Deploy ผ่าน Vercel (ถ้า SSH ไม่ได้)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /mnt/c/MeeChain-Connect
vercel --prod

# Add custom domain
vercel domains add meebot.io
```

จากนั้นตั้งค่า DNS:
- Type: CNAME
- Name: @
- Value: cname.vercel-dns.com

### Option 3: Deploy ผ่าน Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Add domain
railway domain
```

## 🔍 Troubleshooting

### ถ้า PM2 ไม่ทำงาน

```bash
# ดู error logs
pm2 logs meebot --err

# Restart
pm2 restart meebot

# Delete และ start ใหม่
pm2 delete meebot
pm2 start ecosystem.config.js
```

### ถ้า Port 3000 ถูกใช้แล้ว

```bash
# หา process ที่ใช้ port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### ถ้า Web3 ไม่เชื่อมต่อ

ตรวจสอบ `.env`:
```bash
cat .env | grep RPC
```

ต้องมี:
```
DRPC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
```

## 📝 Next Steps

1. ✅ Local deployment สำเร็จ
2. ⏳ ทดสอบ API endpoints
3. ⏳ Deploy to production (meebot.io)
4. ⏳ Setup Nginx + SSL
5. ⏳ Configure domain DNS
6. ⏳ Run production QA tests

---

**สรุป:** ตอนนี้ MeeBot รันบน local (WSL) สำเร็จแล้ว ขั้นตอนถัดไปคือทดสอบ API และ deploy ไป production server

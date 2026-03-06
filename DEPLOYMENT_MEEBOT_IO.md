# 🚀 Deploy MeeChain Dashboard to meebot.io

## Overview
คู่มือนี้จะแนะนำวิธีการ deploy แอป MeeChain Dashboard ให้เข้าถึงได้ผ่าน `https://meebot.io`

---

## Prerequisites

### 1. Domain Setup
- ✅ มี domain `meebot.io` แล้ว
- ⚠️ ต้องมีสิทธิ์จัดการ DNS records

### 2. Server Requirements
- Ubuntu/Debian Linux server
- Node.js v18+ installed
- Nginx installed
- SSL certificate (Let's Encrypt)

---

## Step 1: DNS Configuration

### เพิ่ม DNS Records ที่ Domain Registrar:

```
Type: A
Name: @
Value: [YOUR_SERVER_IP]
TTL: 3600

Type: A
Name: www
Value: [YOUR_SERVER_IP]
TTL: 3600
```

### ตรวจสอบ DNS:
```bash
nslookup meebot.io
dig meebot.io
```

---

## Step 2: Server Setup

### 1. เชื่อมต่อ Server
```bash
ssh user@YOUR_SERVER_IP
```

### 2. Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### 4. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install Certbot (SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 3: Deploy Application

### 1. Clone Repository
```bash
cd /var/www
sudo mkdir meebot.io
sudo chown $USER:$USER meebot.io
cd meebot.io

# Clone your repo or upload files
git clone [YOUR_REPO_URL] .
# หรือ
scp -r /path/to/MeeChain-Connect/* user@server:/var/www/meebot.io/
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env
```

แก้ไข `.env`:
```env
PORT=3000
NODE_ENV=production

# BSC Configuration
DRPC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
VITE_RPC_URL=https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
CHAIN_ID=56

# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Contracts
TOKEN_ADDRESS=0x8da6eb1cd5c0c8cf84bd522ab7c11747db1128c9
```

### 4. Test Application
```bash
node server.js
```

ควรเห็น:
```
✅ MeeBot AI Server running on http://0.0.0.0:3000
```

กด `Ctrl+C` เพื่อหยุด

---

## Step 4: Setup PM2 (Process Manager)

### 1. Install PM2
```bash
sudo npm install -g pm2
```

### 2. Start Application
```bash
pm2 start server.js --name meebot
pm2 save
pm2 startup
```

### 3. Check Status
```bash
pm2 status
pm2 logs meebot
```

---

## Step 5: Configure Nginx

### 1. Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/meebot.io
```

เพิ่มเนื้อหา:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name meebot.io www.meebot.io;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name meebot.io www.meebot.io;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/meebot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meebot.io/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root /var/www/meebot.io;
    index index.html;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### 2. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/meebot.io /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Setup SSL Certificate

### 1. Get SSL Certificate
```bash
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

ตอบคำถาม:
- Email: your@email.com
- Agree to terms: Yes
- Redirect HTTP to HTTPS: Yes

### 2. Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## Step 7: Firewall Configuration

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## Step 8: Test Deployment

### 1. เปิดเบราว์เซอร์
```
https://meebot.io
```

### 2. ตรวจสอบ SSL
- ดู padlock icon ในเบราว์เซอร์
- ตรวจสอบ certificate validity

### 3. ทดสอบ API
```bash
curl https://meebot.io/api/health
```

---

## Monitoring & Maintenance

### PM2 Commands
```bash
pm2 status              # ดูสถานะ
pm2 logs meebot         # ดู logs
pm2 restart meebot      # restart app
pm2 stop meebot         # หยุด app
pm2 delete meebot       # ลบ app
```

### Nginx Commands
```bash
sudo systemctl status nginx    # ดูสถานะ
sudo systemctl restart nginx   # restart
sudo nginx -t                  # test config
sudo tail -f /var/log/nginx/error.log  # ดู error logs
```

### SSL Renewal
```bash
sudo certbot renew             # renew certificates
sudo certbot certificates      # ดู certificates
```

---

## Alternative: Deploy to Replit

ถ้าไม่มี server สามารถใช้ Replit:

### 1. สร้าง Replit Project
- ไปที่ https://replit.com
- สร้าง new Repl (Node.js)
- Upload files

### 2. Configure Custom Domain
- ไปที่ Replit Settings → Domains
- เพิ่ม custom domain: `meebot.io`
- ทำตาม DNS instructions

### 3. Deploy
- กด "Run" button
- Replit จะ auto-deploy

---

## Alternative: Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy
```bash
cd /path/to/MeeChain-Connect
vercel
```

### 3. Add Custom Domain
```bash
vercel domains add meebot.io
```

ทำตาม DNS instructions

---

## Alternative: Deploy to Railway

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login & Deploy
```bash
railway login
railway init
railway up
```

### 3. Add Custom Domain
- ไปที่ Railway Dashboard
- Settings → Domains
- เพิ่ม `meebot.io`

---

## Troubleshooting

### ปัญหา: DNS ไม่ resolve
```bash
# ตรวจสอบ DNS propagation
nslookup meebot.io
dig meebot.io

# รอ DNS propagation (24-48 ชั่วโมง)
```

### ปัญหา: SSL certificate error
```bash
# ลบ certificate เก่า
sudo certbot delete --cert-name meebot.io

# สร้างใหม่
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

### ปัญหา: Nginx 502 Bad Gateway
```bash
# ตรวจสอบว่า Node.js app รันอยู่
pm2 status

# ตรวจสอบ port
netstat -tulpn | grep 3000

# Restart app
pm2 restart meebot
```

### ปัญหา: Port already in use
```bash
# หา process ที่ใช้ port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 [PID]

# หรือเปลี่ยน port ใน .env
PORT=3001
```

---

## Security Checklist

- ✅ SSL certificate installed
- ✅ Firewall configured
- ✅ Security headers added
- ✅ Environment variables secured
- ✅ Regular backups
- ✅ Monitor logs
- ✅ Update dependencies regularly

---

## Next Steps

1. **Setup Monitoring:**
   - Install monitoring tools (PM2 Plus, New Relic)
   - Setup error tracking (Sentry)

2. **Setup CI/CD:**
   - GitHub Actions for auto-deployment
   - Automated testing

3. **Performance Optimization:**
   - Enable CDN (Cloudflare)
   - Optimize images
   - Enable caching

4. **Backup Strategy:**
   - Database backups
   - Code backups
   - SSL certificate backups

---

**สรุป:** หลังจากทำตามขั้นตอนนี้ แอปจะเข้าถึงได้ที่ `https://meebot.io` แล้วครับ! 🚀

# 🚀 Vercel Deployment Guide for MeeBot.io

## ข้อดีของ Vercel

- ✅ ไม่ต้องใช้ SSH
- ✅ SSL/HTTPS อัตโนมัติ (ไม่ต้องรัน Certbot)
- ✅ Auto-deploy จาก GitHub
- ✅ Custom domain support (meebot.io)
- ✅ Global CDN
- ✅ ฟรีสำหรับ hobby projects

## 📋 Step-by-Step Deployment

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

เลือก login method:
- GitHub (แนะนำ)
- GitLab
- Bitbucket
- Email

### Step 3: Deploy

```bash
cd /mnt/c/MeeChain-Connect

# Deploy to production
vercel --prod
```

Vercel จะถาม:
1. **Set up and deploy?** → Yes
2. **Which scope?** → เลือก account ของคุณ
3. **Link to existing project?** → No
4. **Project name?** → meebot (หรือชื่อที่ต้องการ)
5. **Directory?** → ./ (กด Enter)
6. **Override settings?** → No

### Step 4: ตั้งค่า Environment Variables

```bash
# เพิ่ม environment variables
vercel env add OPENAI_API_KEY
vercel env add DRPC_RPC_URL
vercel env add CHAIN_ID
vercel env add RPC_API_KEY
vercel env add NODECORE_API_KEY
vercel env add NODECLOUD_API_KEY
vercel env add NODECLOUD_STATS_KEY
```

หรือตั้งค่าผ่าน Vercel Dashboard:
1. ไปที่ https://vercel.com/dashboard
2. เลือก project "meebot"
3. Settings → Environment Variables
4. เพิ่มตัวแปรจาก `.env.production`

### Step 5: Add Custom Domain (meebot.io)

```bash
vercel domains add meebot.io
```

Vercel จะให้ DNS records ที่ต้องตั้งค่า:

#### Option A: CNAME (แนะนำ)
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

#### Option B: A Record
```
Type: A
Name: @
Value: 76.76.21.21
```

### Step 6: ตั้งค่า DNS

ไปที่ DNS provider (ที่จัดการ meebot.io) และเพิ่ม:

**สำหรับ root domain (meebot.io):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**สำหรับ www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 7: ตรวจสอบ Deployment

```bash
# ดู deployment URL
vercel ls

# เปิด project ใน browser
vercel open
```

### Step 8: ทดสอบ

```bash
# ทดสอบ Vercel URL
curl https://meebot.vercel.app/api/health

# ทดสอบ custom domain (หลังตั้งค่า DNS แล้ว)
curl https://meebot.io/api/health
```

## 🔄 Auto-Deploy from GitHub

### เชื่อมต่อ GitHub Repository

1. ไปที่ https://vercel.com/dashboard
2. เลือก project "meebot"
3. Settings → Git
4. Connect GitHub repository: `MEECHAIN1/MeeChain-Connect`

หลังจากนี้ทุกครั้งที่ push ไป GitHub:
- Push to `main` branch → Deploy to production
- Push to other branches → Deploy to preview

## 📝 Environment Variables ที่ต้องตั้งค่า

```bash
# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# RPC
DRPC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
VITE_RPC_URL=https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY
WSS_RPC_URL=wss://bsc-mainnet.nodereal.io/ws/v1/YOUR_API_KEY
RPC_API_KEY=YOUR_API_KEY
CHAIN_ID=56

# NodeCore & NodeCloud
NODECORE_API_KEY=your_key_here
NODECLOUD_API_KEY=your_key_here
NODECLOUD_STATS_KEY=your_key_here

# Contracts
MCB_MAINNET_ADDRESS=0x8da6eb1cd5c0c8cf84bd522ab7c11747db1128c9
TOKEN_ADDRESS=0x8da6eb1cd5c0c8cf84bd522ab7c11747db1128c9

# Server
NODE_ENV=production
PORT=3000
```

## 🔧 Troubleshooting

### ถ้า Deploy ล้มเหลว

```bash
# ดู logs
vercel logs

# Deploy อีกครั้งพร้อม verbose
vercel --prod --debug
```

### ถ้า Domain ไม่ทำงาน

```bash
# ตรวจสอบ DNS
nslookup meebot.io

# ตรวจสอบ domain status
vercel domains ls
```

### ถ้า Environment Variables ไม่ทำงาน

1. ไปที่ Vercel Dashboard
2. Settings → Environment Variables
3. ตรวจสอบว่าตั้งค่าครบและถูกต้อง
4. Redeploy: `vercel --prod --force`

## 📊 Vercel Dashboard

URL: https://vercel.com/dashboard

ใน Dashboard คุณสามารถ:
- ดู deployment history
- ตั้งค่า environment variables
- ดู analytics
- ตั้งค่า custom domains
- ดู logs

## 🎯 Quick Commands

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# List deployments
vercel ls

# View logs
vercel logs

# Open project in browser
vercel open

# Remove deployment
vercel rm <deployment-url>

# Add domain
vercel domains add meebot.io

# List domains
vercel domains ls

# Remove domain
vercel domains rm meebot.io

# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls

# Pull environment variables
vercel env pull
```

## 🔄 Update Deployment

หลังจาก deploy แล้ว ถ้าต้องการอัปเดต:

### Method 1: Push to GitHub (Auto-deploy)
```bash
git add .
git commit -m "Update"
git push origin main
```

### Method 2: Manual Deploy
```bash
vercel --prod
```

## 📌 Important Notes

1. **Serverless Functions**: Vercel รัน Node.js เป็น serverless functions
2. **Cold Start**: อาจจะมี delay เล็กน้อยในการ start (1-2 วินาที)
3. **Execution Timeout**: ฟรี tier มี timeout 10 วินาที
4. **Memory Limit**: ฟรี tier มี memory limit 1024 MB
5. **Bandwidth**: ฟรี tier มี bandwidth 100 GB/month

## 🎉 Success Checklist

- [ ] Vercel CLI ติดตั้งแล้ว
- [ ] Login to Vercel สำเร็จ
- [ ] Deploy สำเร็จ (ได้ URL: https://meebot.vercel.app)
- [ ] Environment variables ตั้งค่าครบ
- [ ] Custom domain (meebot.io) เพิ่มแล้ว
- [ ] DNS records ตั้งค่าแล้ว
- [ ] HTTPS ทำงาน (อัตโนมัติ)
- [ ] API endpoints ทดสอบผ่าน
- [ ] GitHub auto-deploy ตั้งค่าแล้ว

---

**สรุป:** Vercel ทำให้ deployment ง่ายกว่า traditional VPS มาก ไม่ต้องจัดการ Nginx, SSL, PM2 เอง และได้ global CDN ฟรี!

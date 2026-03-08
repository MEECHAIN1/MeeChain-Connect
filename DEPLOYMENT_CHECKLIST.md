# 🚀 Pre-Deployment Checklist for meebot.io

## ✅ ก่อน Deploy - ต้องเตรียมให้พร้อม

### 1. Server Requirements
- [ ] มี VPS/Server (Ubuntu 20.04+ แนะนำ)
  - RAM: อย่างน้อย 2GB
  - Storage: อย่างน้อย 20GB
  - CPU: อย่างน้อย 2 cores
- [ ] มี root หรือ sudo access
- [ ] มี SSH access (port 22 เปิดอยู่)
- [ ] รู้ IP address ของ server

### 2. Domain Configuration
- [ ] มี domain `meebot.io` พร้อมใช้งาน
- [ ] มีสิทธิ์จัดการ DNS records
- [ ] ตั้ง DNS A records:
  ```
  @ (root)  →  YOUR_SERVER_IP
  www       →  YOUR_SERVER_IP
  ```
- [ ] รอ DNS propagation (ตรวจสอบด้วย `nslookup meebot.io`)

### 3. Email for SSL
- [ ] มี email address สำหรับ Let's Encrypt SSL certificate
- [ ] Email ต้องสามารถรับข้อความได้ (สำหรับ renewal notifications)

### 4. API Keys & Credentials
- [ ] OpenAI API Key (สำหรับ MeeBot AI)
- [ ] RPC API Keys (BSC Mainnet - มีอยู่แล้วใน .env.production)
- [ ] NodeCore API Key (มีอยู่แล้ว)
- [ ] NodeCloud API Key (มีอยู่แล้ว)

### 5. Files Ready
- [ ] ไฟล์ทั้งหมดใน project พร้อม
- [ ] `scripts/deploy.sh` มี execute permission
- [ ] `.env.production` พร้อมสำหรับ copy ไป server
- [ ] `nginx/meebot.io.conf` พร้อม
- [ ] `ecosystem.config.js` พร้อม

---

## 📋 Deployment Methods (เลือก 1 วิธี)

### Method A: Automated Script (แนะนำ - ง่ายที่สุด)
```bash
# 1. Upload files to server
scp -r * user@YOUR_SERVER_IP:/home/user/meebot-temp/

# 2. SSH to server
ssh user@YOUR_SERVER_IP

# 3. Move to /var/www
sudo mkdir -p /var/www/meebot.io
sudo mv /home/user/meebot-temp/* /var/www/meebot.io/
cd /var/www/meebot.io

# 4. Run deployment script
sudo chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

### Method B: Manual Step-by-Step
ดูรายละเอียดใน `DEPLOY_STEP_BY_STEP.md`

### Method C: Git Clone (ถ้ามี Git repo)
```bash
ssh user@YOUR_SERVER_IP
cd /var/www
sudo git clone YOUR_REPO meebot.io
cd meebot.io
sudo chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

---

## 🔧 Quick Commands Reference

### Before Deployment
```bash
# ตรวจสอบ DNS
nslookup meebot.io

# ทดสอบ SSH connection
ssh user@YOUR_SERVER_IP

# ตรวจสอบ server resources
ssh user@YOUR_SERVER_IP "free -h && df -h"
```

### During Deployment
```bash
# ดู deployment progress
tail -f /var/log/nginx/error.log

# ตรวจสอบ PM2 status
pm2 status

# ดู application logs
pm2 logs meebot
```

### After Deployment
```bash
# ทดสอบ API
curl https://meebot.io/api/health

# ทดสอบ SSL
curl -I https://meebot.io

# ดู Nginx status
sudo systemctl status nginx

# ดู PM2 status
pm2 status
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: DNS not resolving
**Problem:** `nslookup meebot.io` ไม่แสดง IP
**Solution:** 
- รอ DNS propagation (24-48 ชั่วโมง)
- ตรวจสอบ DNS records ที่ domain registrar
- ใช้ `dig meebot.io` เพื่อ debug

### Issue 2: SSH connection refused
**Problem:** Cannot connect to server
**Solution:**
- ตรวจสอบ IP address ถูกต้อง
- ตรวจสอบ firewall เปิด port 22
- ตรวจสอบ SSH service: `sudo systemctl status ssh`

### Issue 3: Permission denied
**Problem:** Cannot write to /var/www
**Solution:**
```bash
sudo chown -R $USER:$USER /var/www/meebot.io
sudo chmod -R 755 /var/www/meebot.io
```

### Issue 4: Port 3000 already in use
**Problem:** Application won't start
**Solution:**
```bash
# หา process ที่ใช้ port
sudo lsof -i :3000

# Kill process
sudo kill -9 [PID]

# หรือเปลี่ยน port ใน .env
PORT=3001
```

### Issue 5: SSL certificate failed
**Problem:** Certbot cannot verify domain
**Solution:**
- ตรวจสอบ DNS resolving ถูกต้อง
- ตรวจสอบ port 80 และ 443 เปิดอยู่
- ตรวจสอบ Nginx running: `sudo systemctl status nginx`

---

## 📊 Deployment Timeline

| Step | Time | Description |
|------|------|-------------|
| DNS Setup | 15 min - 48 hrs | ตั้ง DNS records และรอ propagation |
| Server Setup | 5-10 min | SSH, create user, upload files |
| Run deploy.sh | 10-15 min | Automated installation |
| Configuration | 5 min | Edit .env, test |
| SSL Setup | 2-5 min | Certbot certificate |
| Testing | 5-10 min | Test API, SSL, functionality |
| **Total** | **30 min - 48 hrs** | (รวมเวลารอ DNS) |

---

## 🎯 Success Criteria

เมื่อ deploy สำเร็จ คุณควรเห็น:

### 1. Website Accessible
- ✅ `https://meebot.io` เปิดได้
- ✅ `https://www.meebot.io` เปิดได้
- ✅ HTTP redirect ไป HTTPS อัตโนมัติ

### 2. API Working
```bash
curl https://meebot.io/api/health
# Response: {"status":"ok","chainId":56,...}
```

### 3. SSL Valid
- ✅ Browser แสดง 🔒 (padlock icon)
- ✅ Certificate valid
- ✅ No security warnings

### 4. PM2 Running
```bash
pm2 status
# meebot | online | 2 instances
```

### 5. Nginx Running
```bash
sudo systemctl status nginx
# Active: active (running)
```

---

## 📞 Need Help?

### Before Deployment
1. อ่าน `DEPLOY_STEP_BY_STEP.md` ทั้งหมด
2. ตรวจสอบ checklist นี้ให้ครบ
3. เตรียม API keys และ credentials

### During Deployment
1. ดู logs: `pm2 logs meebot`
2. ตรวจสอบ Nginx: `sudo nginx -t`
3. ดู system logs: `sudo journalctl -xe`

### After Deployment
1. ทดสอบทุก endpoint ใน `QA_CHECKLIST.md`
2. ตรวจสอบ SSL certificate
3. Setup monitoring และ backups

---

## 🚀 Ready to Deploy?

ถ้าทุกอย่างใน checklist นี้พร้อมแล้ว:

```bash
# เริ่ม deployment!
sudo ./scripts/deploy.sh
```

หรือทำตาม `DEPLOY_STEP_BY_STEP.md` ทีละขั้นตอน

---

**Good luck! 🎉**

# 🔐 Server Access Troubleshooting Guide

## ปัญหา: SSH Connection Timeout

```
ssh: connect to host 2.57.91.91 port 22: Connection timed out
```

## วิธีแก้ไข

### 1. ตรวจสอบว่า Server Online หรือไม่

```powershell
ping 2.57.91.91
```

ถ้า ping ไม่ผ่าน → Server อาจจะ offline หรือ ICMP ถูกบล็อก

### 2. ตรวจสอบ SSH Port

ลอง telnet เพื่อดูว่า port 22 เปิดอยู่หรือไม่:

```powershell
Test-NetConnection -ComputerName 2.57.91.91 -Port 22
```

หรือ:

```powershell
telnet 2.57.91.91 22
```

### 3. ตรวจสอบ Firewall Rules

คุณต้องเข้าไปที่ **Control Panel ของ VPS Provider** (เช่น DigitalOcean, AWS, Vultr, etc.) และ:

- เปิด **Port 22** (SSH) ใน Security Group/Firewall
- เปิด **Port 80** (HTTP) 
- เปิด **Port 443** (HTTPS)
- เปิด **Port 3000** (Node.js app) ถ้าต้องการ

### 4. ทางเลือกอื่นในการเข้าถึง Server

#### Option A: ใช้ Web Console ของ VPS Provider
- DigitalOcean → Droplet Console
- AWS → EC2 Instance Connect
- Vultr → View Console
- Linode → Launch LISH Console

#### Option B: ใช้ SSH Key แทน Password
```powershell
ssh -i path/to/private-key.pem root@2.57.91.91
```

#### Option C: ลอง SSH ผ่าน Port อื่น
บาง provider ใช้ port อื่นแทน 22:

```powershell
ssh -p 2222 root@2.57.91.91
```

### 5. ถ้ายังไม่ได้ → Deploy ผ่าน Alternative Methods

#### Method 1: ใช้ cPanel/Plesk (ถ้ามี)
- Upload files ผ่าน File Manager
- ตั้งค่า Node.js app ผ่าน UI

#### Method 2: ใช้ FTP/SFTP
```powershell
# ใช้ WinSCP หรือ FileZilla
# Host: 2.57.91.91
# Protocol: SFTP
# Port: 22 (หรือ port ที่ provider กำหนด)
```

#### Method 3: Deploy ผ่าน CI/CD
- ตั้งค่า GitHub Actions
- ให้ GitHub Actions deploy แทน

#### Method 4: ใช้ Hosting Platform แทน VPS
- **Vercel** (แนะนำ - ฟรี, รองรับ Node.js)
- **Netlify** (ฟรี, รองรับ serverless functions)
- **Railway** (ฟรี $5/month credit)
- **Render** (ฟรี tier)

## 🚀 Quick Deploy to Vercel (Alternative)

ถ้า SSH ไม่ได้ ให้ลอง deploy ผ่าน Vercel แทน:

### 1. Install Vercel CLI

```powershell
npm install -g vercel
```

### 2. Login to Vercel

```powershell
vercel login
```

### 3. Deploy

```powershell
cd C:\MeeChain-Connect
vercel
```

### 4. Configure Domain

```
vercel domains add meebot.io
```

จากนั้นตั้งค่า DNS:
- Type: CNAME
- Name: @
- Value: cname.vercel-dns.com

## 📋 Checklist สำหรับ VPS Provider

ถ้าคุณใช้ VPS ให้ตรวจสอบ:

- [ ] SSH service ติดตั้งและรันอยู่
- [ ] Port 22 เปิดใน firewall
- [ ] Security Group อนุญาต SSH (port 22)
- [ ] Root login enabled (หรือมี sudo user)
- [ ] SSH key หรือ password ถูกต้อง
- [ ] Server ไม่ได้ถูก suspend/terminated

## 🔍 ตรวจสอบ VPS Provider Dashboard

1. เข้าไปที่ dashboard ของ provider (DigitalOcean, Vultr, AWS, etc.)
2. ตรวจสอบ:
   - Server status: Running/Stopped
   - Firewall rules
   - SSH access settings
   - Console access (web-based terminal)

## 💡 คำแนะนำ

ถ้าคุณยังไม่มี VPS หรือ SSH access ไม่ได้:

**แนะนำให้ใช้ Vercel หรือ Railway** เพราะ:
- ✅ Deploy ง่ายกว่า (ไม่ต้อง SSH)
- ✅ SSL/HTTPS อัตโนมัติ
- ✅ ฟรี tier เพียงพอสำหรับ development
- ✅ Custom domain support
- ✅ Auto-deploy จาก GitHub

## 📞 ติดต่อ VPS Provider

ถ้าปัญหายังไม่หาย ให้ติดต่อ support ของ VPS provider:
- DigitalOcean: https://www.digitalocean.com/support
- Vultr: https://www.vultr.com/support/
- AWS: https://console.aws.amazon.com/support/
- Linode: https://www.linode.com/support/

---

**สรุป:** SSH timeout มักเกิดจาก firewall หรือ SSH service ไม่เปิด → ให้เข้าไปตั้งค่าผ่าน VPS provider dashboard หรือใช้ alternative deployment methods

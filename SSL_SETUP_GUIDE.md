# 🔐 SSL Certificate Setup Guide for meebot.io

## ปัญหาปัจจุบัน

Certbot ไม่สามารถยืนยันโดเมนได้เพราะ:
- ❌ Nginx config มี HTTPS redirect ทันที → Certbot ไม่สามารถเข้าถึง HTTP challenge
- ❌ SSL certificate ยังไม่มี → Nginx ไม่สามารถ start HTTPS block ได้
- ❌ Path `/var/www/certbot` ไม่ถูกต้อง → ควรใช้ `/var/www/html`

## ✅ วิธีแก้ไข (Step-by-Step)

### Step 1: สร้างโฟลเดอร์สำหรับ Challenge

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### Step 2: ใช้ HTTP-Only Config ชั่วคราว

```bash
# Backup config เดิม
sudo cp /etc/nginx/sites-available/meebot.io /etc/nginx/sites-available/meebot.io.backup

# Copy HTTP-only config
sudo cp /var/www/meebot.io/nginx/meebot.io-http-only.conf /etc/nginx/sites-available/meebot.io

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 3: ทดสอบว่า HTTP ทำงาน

```bash
# ทดสอบจาก server
curl http://localhost/api/health

# ทดสอบจากภายนอก (บนเครื่อง local)
curl http://meebot.io/api/health
```

ต้องได้ response:
```json
{"status":"ok","chainId":"0x38"}
```

### Step 4: รัน Certbot

```bash
sudo certbot certonly --webroot -w /var/www/html -d meebot.io -d www.meebot.io
```

หรือใช้ nginx plugin:

```bash
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

### Step 5: ตรวจสอบ Certificate

```bash

sudo certbot certificates
```

ต้องเห็น:
```
Certificate Name: meebot.io
  Domains: meebot.io www.meebot.io
  Expiry Date: ...
  Certificate Path: /etc/letsencrypt/live/meebot.io/fullchain.pem
  Private Key Path: /etc/letsencrypt/live/meebot.io/privkey.pem
```

### Step 6: ใช้ Full Config (HTTPS)

```bash
# Restore full config
sudo cp /var/www/meebot.io/nginx/meebot.io.conf /etc/nginx/sites-available/meebot.io

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: ทดสอบ HTTPS

```bash
# ทดสอบจาก server
curl https://meebot.io/api/health

# ทดสอบ SSL
curl -I https://meebot.io
```

## 🔧 Troubleshooting

### ถ้า Certbot ยังล้มเหลว

#### 1. ตรวจสอบ DNS

```bash
nslookup meebot.io
dig meebot.io
```

ต้องชี้ไปที่ IP server (2.57.91.91)

#### 2. ตรวจสอบ Firewall

```bash
# ตรวจสอบว่า port 80 เปิดอยู่
sudo ufw status

# ถ้าปิดอยู่ ให้เปิด
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### 3. ตรวจสอบ Nginx Logs

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/meebot.io.error.log
```

#### 4. ทดสอบ Challenge Path

```bash
# สร้างไฟล์ทดสอบ
echo "test" | sudo tee /var/www/html/.well-known/acme-challenge/test.txt

# ทดสอบเข้าถึง
curl http://meebot.io/.well-known/acme-challenge/test.txt

# ลบไฟล์ทดสอบ
sudo rm /var/www/html/.well-known/acme-challenge/test.txt
```

### ถ้า Nginx ไม่ start

```bash
# ดู error
sudo nginx -t

# ดู logs
sudo journalctl -u nginx -n 50

# Restart Nginx
sudo systemctl restart nginx
```

### ถ้า Certificate หมดอายุ

```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## 🔄 Auto-Renewal Setup

Certbot ติดตั้ง cron job อัตโนมัติ แต่ควรตรวจสอบ:

```bash
# ตรวจสอบ systemd timer
sudo systemctl status certbot.timer

# หรือ cron job
sudo crontab -l
```

ถ้าไม่มี ให้เพิ่ม:

```bash
# เพิ่ม cron job
sudo crontab -e

# เพิ่มบรรทัดนี้
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

## 📋 Quick Commands Reference

```bash
# ตรวจสอบ certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal (dry run)
sudo certbot renew --dry-run

# Delete certificate
sudo certbot delete --cert-name meebot.io

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/meebot.io/cert.pem

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 🎯 Summary

1. ใช้ HTTP-only config ก่อน (ไม่มี HTTPS redirect)
2. สร้างโฟลเดอร์ `/var/www/html/.well-known/acme-challenge`
3. รัน Certbot เพื่อขอ certificate
4. หลังได้ certificate แล้ว ใช้ full config (มี HTTPS)
5. ตั้งค่า auto-renewal

---

**หมายเหตุ:** ถ้ายังไม่ได้ ให้ตรวจสอบว่า DNS ชี้ถูกต้อง และ firewall เปิด port 80, 443

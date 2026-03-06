# 🚀 Step-by-Step Deployment Guide for meebot.io

## Prerequisites Checklist

- [ ] มี VPS/Server (Ubuntu 20.04+ แนะนำ)
- [ ] มี domain `meebot.io` และสิทธิ์จัดการ DNS
- [ ] มี SSH access ไปยัง server
- [ ] มี email สำหรับ SSL certificate

---

## Phase 1: DNS Configuration (ทำก่อนทุกอย่าง)

### 1.1 เข้าไปที่ Domain Registrar (เช่น Namecheap, GoDaddy, Cloudflare)

### 1.2 เพิ่ม DNS Records:

```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: 3600

Type: A  
Name: www
Value: YOUR_SERVER_IP
TTL: 3600
```

### 1.3 รอ DNS Propagation (15 นาที - 24 ชั่วโมง)

ตรวจสอบด้วย:
```bash
nslookup meebot.io
```

---

## Phase 2: Server Setup

### 2.1 เชื่อมต่อ Server

```bash
ssh root@YOUR_SERVER_IP
# หรือ
ssh username@YOUR_SERVER_IP
```

### 2.2 สร้าง User สำหรับ Deploy (แนะนำ)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 2.3 Upload Files ไปยัง Server

**ตัวเลือก A: ใช้ SCP**
```bash
# จาก local machine
cd /path/to/MeeChain-Connect
scp -r * deploy@YOUR_SERVER_IP:/home/deploy/meebot-temp/
```

**ตัวเลือก B: ใช้ Git**
```bash
# บน server
cd /home/deploy
git clone YOUR_GITHUB_REPO meebot-temp
```

**ตัวเลือก C: ใช้ SFTP Client**
- ใช้ FileZilla, WinSCP, หรือ Cyberduck
- Upload ทั้ง folder ไปยัง `/home/deploy/meebot-temp/`

---

## Phase 3: Automated Deployment

### 3.1 ย้ายไฟล์ไปยัง /var/www

```bash
sudo mkdir -p /var/www/meebot.io
sudo mv /home/deploy/meebot-temp/* /var/www/meebot.io/
sudo chown -R deploy:deploy /var/www/meebot.io
```

### 3.2 ทำให้ Deploy Script Execute ได้

```bash
cd /var/www/meebot.io
chmod +x scripts/deploy.sh
chmod +x scripts/quick-deploy.sh
```

### 3.3 รัน Deployment Script

```bash
sudo ./scripts/deploy.sh
```

Script จะทำอัตโนมัติ:
- ✅ Update system
- ✅ Install Node.js
- ✅ Install Nginx
- ✅ Install Certbot
- ✅ Install PM2
- ✅ Configure Nginx
- ✅ Setup SSL
- ✅ Start application

### 3.4 ตอบคำถามระหว่าง Setup

```
Do you want to setup SSL now? (y/n) y
```

---

## Phase 4: Configuration

### 4.1 แก้ไข Environment Variables

```bash
cd /var/www/meebot.io
nano .env
```

แก้ไข:
```env
OPENAI_API_KEY=your_actual_key_here
EMAIL=your@email.com
```

บันทึก: `Ctrl+X`, `Y`, `Enter`

### 4.2 แก้ไข Nginx Config (ถ้าจำเป็น)

```bash
sudo nano /etc/nginx/sites-available/meebot.io
```

### 4.3 แก้ไข PM2 Config (ถ้าจำเป็น)

```bash
nano ecosystem.config.js
```

---

## Phase 5: Start Application

### 5.1 Start ด้วย PM2

```bash
cd /var/www/meebot.io
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5.2 ตรวจสอบสถานะ

```bash
pm2 status
pm2 logs meebot
```

ควรเห็น:
```
✅ MeeBot AI Server running on http://0.0.0.0:3000
```

---

## Phase 6: SSL Certificate

### 6.1 ถ้ายังไม่ได้ทำใน deploy script

```bash
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

ตอบคำถาม:
```
Email: your@email.com
Agree to terms: Y
Redirect HTTP to HTTPS: 2 (Yes)
```

### 6.2 ทดสอบ Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Phase 7: Firewall

### 7.1 Configure UFW

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

ควรเห็น:
```
Status: active

To                         Action      From
--                         ------      ----
Nginx Full                 ALLOW       Anywhere
OpenSSH                    ALLOW       Anywhere
```

---

## Phase 8: Testing

### 8.1 ทดสอบจาก Browser

เปิด: `https://meebot.io`

ควรเห็น MeeChain Dashboard

### 8.2 ทดสอบ API

```bash
curl https://meebot.io/api/health
```

ควรได้:
```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "bot": "MeeBot AI",
  "web3": true,
  "chainId": 56
}
```

### 8.3 ทดสอบ SSL

เปิด: `https://www.ssllabs.com/ssltest/analyze.html?d=meebot.io`

ควรได้ Grade A

---

## Phase 9: Monitoring Setup

### 9.1 ดู Logs

```bash
# PM2 logs
pm2 logs meebot

# Nginx access logs
sudo tail -f /var/log/nginx/meebot.io.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/meebot.io.error.log
```

### 9.2 Setup PM2 Monitoring (Optional)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Phase 10: Backup Strategy

### 10.1 สร้าง Backup Script

```bash
sudo nano /usr/local/bin/backup-meebot.sh
```

เพิ่ม:
```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/meebot_$DATE.tar.gz /var/www/meebot.io
find $BACKUP_DIR -name "meebot_*.tar.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-meebot.sh
```

### 10.2 Setup Cron Job

```bash
crontab -e
```

เพิ่ม:
```
0 2 * * * /usr/local/bin/backup-meebot.sh
```

---

## Common Commands

### Application Management
```bash
pm2 status              # ดูสถานะ
pm2 logs meebot         # ดู logs
pm2 restart meebot      # restart
pm2 stop meebot         # หยุด
pm2 delete meebot       # ลบ
pm2 monit               # monitoring dashboard
```

### Nginx Management
```bash
sudo systemctl status nginx     # ดูสถานะ
sudo systemctl restart nginx    # restart
sudo systemctl reload nginx     # reload config
sudo nginx -t                   # test config
```

### SSL Management
```bash
sudo certbot certificates       # ดู certificates
sudo certbot renew             # renew certificates
sudo certbot delete            # ลบ certificate
```

### Updates
```bash
cd /var/www/meebot.io
./scripts/quick-deploy.sh      # deploy updates
```

---

## Troubleshooting

### ปัญหา: Cannot connect to server
```bash
# ตรวจสอบ SSH
ssh -v user@server

# ตรวจสอบ firewall
sudo ufw status
```

### ปัญหา: DNS not resolving
```bash
# ตรวจสอบ DNS
nslookup meebot.io
dig meebot.io

# รอ propagation (24-48 ชั่วโมง)
```

### ปัญหา: Nginx 502 Bad Gateway
```bash
# ตรวจสอบ app
pm2 status
pm2 logs meebot

# ตรวจสอบ port
sudo netstat -tulpn | grep 3000

# Restart
pm2 restart meebot
```

### ปัญหา: SSL certificate error
```bash
# ลบ certificate
sudo certbot delete --cert-name meebot.io

# สร้างใหม่
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

### ปัญหา: Port already in use
```bash
# หา process
sudo lsof -i :3000

# Kill process
sudo kill -9 [PID]

# หรือเปลี่ยน port
nano .env
# PORT=3001
```

---

## Security Checklist

- [ ] SSL certificate installed and working
- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Regular backups scheduled
- [ ] Monitoring setup
- [ ] Environment variables secured
- [ ] Nginx security headers configured
- [ ] Rate limiting configured (optional)
- [ ] Fail2ban installed (optional)

---

## Performance Optimization

### 1. Enable Cloudflare (Optional)
- เพิ่ม domain ใน Cloudflare
- เปลี่ยน nameservers
- Enable CDN + DDoS protection

### 2. Enable Redis Caching (Optional)
```bash
sudo apt install redis-server
npm install redis
```

### 3. Enable Nginx Caching
แก้ไข nginx config เพิ่ม:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
```

---

## Next Steps

1. **Setup Monitoring:**
   - Install monitoring tools (PM2 Plus, New Relic, Datadog)
   - Setup error tracking (Sentry)
   - Setup uptime monitoring (UptimeRobot)

2. **Setup CI/CD:**
   - GitHub Actions for auto-deployment
   - Automated testing before deploy

3. **Optimize Performance:**
   - Enable CDN (Cloudflare)
   - Optimize images
   - Enable HTTP/2

4. **Security Hardening:**
   - Install Fail2ban
   - Setup rate limiting
   - Regular security updates

---

## Support

ถ้ามีปัญหาหรือคำถาม:
1. ตรวจสอบ logs: `pm2 logs meebot`
2. ตรวจสอบ nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. ตรวจสอบ system logs: `sudo journalctl -xe`

---

**🎉 Congratulations! แอปของคุณพร้อมใช้งานที่ https://meebot.io แล้ว!**

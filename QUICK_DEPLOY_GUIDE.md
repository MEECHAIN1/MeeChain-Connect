# ⚡ Quick Deploy Guide - meebot.io

## 🎯 Deploy ใน 5 นาที (ถ้า DNS พร้อมแล้ว)

### Prerequisites
- ✅ DNS records ตั้งค่าแล้ว (meebot.io → YOUR_SERVER_IP)
- ✅ มี SSH access ไปยัง server
- ✅ มี OpenAI API Key

---

## 🚀 Method 1: One-Command Deploy (Fastest)

### Step 1: Upload & Deploy
```bash
# จาก local machine
cd /path/to/MeeChain-Connect

# Upload to server
scp -r * root@YOUR_SERVER_IP:/tmp/meebot/

# SSH and deploy
ssh root@YOUR_SERVER_IP << 'EOF'
  mkdir -p /var/www/meebot.io
  mv /tmp/meebot/* /var/www/meebot.io/
  cd /var/www/meebot.io
  chmod +x scripts/deploy.sh
  ./scripts/deploy.sh
EOF
```

### Step 2: Configure
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io
nano .env
# แก้ไข OPENAI_API_KEY
pm2 restart meebot
```

### Step 3: Test
```bash
curl https://meebot.io/api/health
```

**Done! 🎉**

---

## 🚀 Method 2: Git Clone Deploy

### Step 1: Clone & Deploy
```bash
ssh root@YOUR_SERVER_IP
cd /var/www
git clone YOUR_GITHUB_REPO meebot.io
cd meebot.io
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Step 2: Configure
```bash
nano .env
# แก้ไข OPENAI_API_KEY
pm2 restart meebot
```

### Step 3: Test
```bash
curl https://meebot.io/api/health
```

**Done! 🎉**

---

## 🚀 Method 3: Manual Deploy (Full Control)

### Step 1: System Setup
```bash
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Install PM2
npm install -g pm2
```

### Step 2: Upload Files
```bash
# จาก local machine
scp -r * root@YOUR_SERVER_IP:/var/www/meebot.io/
```

### Step 3: Install Dependencies
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io
npm install --production
```

### Step 4: Configure Environment
```bash
cp .env.production .env
nano .env
# แก้ไข OPENAI_API_KEY
```

### Step 5: Configure Nginx
```bash
cp nginx/meebot.io.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/meebot.io /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 6: Setup SSL
```bash
certbot --nginx -d meebot.io -d www.meebot.io
```

### Step 7: Start Application
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 8: Configure Firewall
```bash
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

### Step 9: Test
```bash
curl https://meebot.io/api/health
pm2 status
```

**Done! 🎉**

---

## 🔄 Update Existing Deployment

### Quick Update
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io
./scripts/quick-deploy.sh
```

### Manual Update
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io

# Pull changes (if using git)
git pull

# Or upload new files
# scp -r * root@YOUR_SERVER_IP:/var/www/meebot.io/

# Install new dependencies
npm install --production

# Restart
pm2 restart meebot

# Check status
pm2 status
pm2 logs meebot --lines 50
```

---

## 🧪 Testing Checklist

### 1. Website
- [ ] `https://meebot.io` เปิดได้
- [ ] `https://www.meebot.io` เปิดได้
- [ ] HTTP redirect ไป HTTPS

### 2. API Endpoints
```bash
# Health check
curl https://meebot.io/api/health

# Web3 status
curl https://meebot.io/api/web3/status

# Chain stats
curl https://meebot.io/api/chain/stats

# Token info
curl https://meebot.io/api/token/info

# Price
curl https://meebot.io/api/price/mintme
```

### 3. SSL Certificate
```bash
# Check certificate
curl -vI https://meebot.io 2>&1 | grep -i "SSL certificate"

# Or visit
# https://www.ssllabs.com/ssltest/analyze.html?d=meebot.io
```

### 4. Application Status
```bash
pm2 status
pm2 logs meebot --lines 20
```

### 5. Nginx Status
```bash
systemctl status nginx
nginx -t
```

---

## 🐛 Quick Troubleshooting

### Problem: Website not loading
```bash
# Check Nginx
systemctl status nginx
systemctl restart nginx

# Check PM2
pm2 status
pm2 restart meebot

# Check logs
pm2 logs meebot
tail -f /var/log/nginx/error.log
```

### Problem: 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Check port
netstat -tulpn | grep 3000

# Restart app
pm2 restart meebot
```

### Problem: SSL not working
```bash
# Check certificate
certbot certificates

# Renew certificate
certbot renew

# Restart Nginx
systemctl restart nginx
```

### Problem: API returning errors
```bash
# Check logs
pm2 logs meebot --lines 50

# Check environment
cat .env | grep -v "^#"

# Restart with fresh logs
pm2 restart meebot
pm2 flush
```

---

## 📊 Monitoring Commands

### Application
```bash
pm2 status              # Status overview
pm2 logs meebot         # Live logs
pm2 monit               # Real-time monitoring
pm2 describe meebot     # Detailed info
```

### Server
```bash
htop                    # System resources
df -h                   # Disk usage
free -h                 # Memory usage
netstat -tulpn          # Network connections
```

### Nginx
```bash
systemctl status nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔐 Security Checklist

- [ ] SSL certificate installed
- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Root login disabled (optional)
- [ ] Fail2ban installed (optional)
- [ ] Regular backups scheduled

---

## 📞 Support

### Logs Location
- Application: `pm2 logs meebot`
- Nginx Access: `/var/log/nginx/meebot.io.access.log`
- Nginx Error: `/var/log/nginx/meebot.io.error.log`
- System: `journalctl -xe`

### Useful Commands
```bash
# Restart everything
pm2 restart meebot
systemctl restart nginx

# Check everything
pm2 status && systemctl status nginx

# View all logs
pm2 logs meebot & tail -f /var/log/nginx/error.log
```

---

## 🎉 Success!

ถ้าทุกอย่างทำงานได้:
- ✅ Website: https://meebot.io
- ✅ API: https://meebot.io/api/health
- ✅ SSL: Grade A
- ✅ PM2: Running
- ✅ Nginx: Active

**Congratulations! 🚀**

---

## 📚 More Resources

- Full Guide: `DEPLOY_STEP_BY_STEP.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Main Docs: `DEPLOYMENT_MEEBOT_IO.md`
- API Docs: `docs/API.md`
- JSDoc: `docs/jsdoc/index.html`

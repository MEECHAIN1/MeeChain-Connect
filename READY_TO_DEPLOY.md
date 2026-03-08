# 🎉 Ready to Deploy to meebot.io!

## ✅ All Files Prepared

ไฟล์และเอกสารสำหรับ deployment ไปยัง production (meebot.io) พร้อมหมดแล้ว!

---

## 📦 What's Included

### Deployment Scripts
- ✅ `scripts/deploy.sh` - Automated full deployment (installs everything)
- ✅ `scripts/quick-deploy.sh` - Quick update script (for future updates)

### Configuration Files
- ✅ `nginx/meebot.io.conf` - Nginx reverse proxy + SSL configuration
- ✅ `ecosystem.config.js` - PM2 process manager (cluster mode, 2 instances)
- ✅ `.env.production` - Production environment template

### Documentation (5 Guides)
- ✅ `DEPLOYMENT_MEEBOT_IO.md` - Main deployment overview
- ✅ `DEPLOY_STEP_BY_STEP.md` - Detailed step-by-step guide (30-45 min)
- ✅ `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- ✅ `QUICK_DEPLOY_GUIDE.md` - Quick 5-minute deployment guide
- ✅ `DEPLOYMENT_SUMMARY.md` - Status and overview

---

## 🚀 Quick Start (Choose One Method)

### Method 1: Automated Script (Recommended) ⭐
**Time:** 10-15 minutes  
**Best for:** Quick deployment with minimal manual work

```bash
# 1. Upload files to server
scp -r * root@YOUR_SERVER_IP:/var/www/meebot.io/

# 2. SSH and deploy
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh

# 3. Configure
nano .env  # Add your OPENAI_API_KEY
pm2 restart meebot

# 4. Test
curl https://meebot.io/api/health
```

### Method 2: Git Clone ⭐
**Time:** 10-15 minutes  
**Best for:** If you have a Git repository

```bash
ssh root@YOUR_SERVER_IP
cd /var/www
git clone YOUR_REPO meebot.io
cd meebot.io
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

### Method 3: Manual Step-by-Step ⭐⭐
**Time:** 30-45 minutes  
**Best for:** Full control and understanding

Follow the detailed guide in `DEPLOY_STEP_BY_STEP.md`

---

## 📋 Prerequisites (Must Have)

### 1. Server
- [ ] VPS/Server with Ubuntu 20.04+ (or Debian 10+)
- [ ] Minimum: 2GB RAM, 2 CPU cores, 20GB storage
- [ ] Root or sudo access
- [ ] SSH access (port 22 open)

### 2. Domain
- [ ] Domain `meebot.io` registered
- [ ] Access to DNS management
- [ ] DNS A records configured:
  ```
  @ (root)  →  YOUR_SERVER_IP
  www       →  YOUR_SERVER_IP
  ```
- [ ] DNS propagated (check with `nslookup meebot.io`)

### 3. Credentials
- [ ] OpenAI API Key (for MeeBot AI)
- [ ] Email address (for SSL certificate)
- [ ] Server IP address

### 4. Optional but Recommended
- [ ] Git repository (for version control)
- [ ] Backup solution
- [ ] Monitoring service

---

## 🎯 Deployment Steps Overview

### Phase 1: DNS Configuration (Do First!)
1. Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. Add A records:
   - `@` → YOUR_SERVER_IP
   - `www` → YOUR_SERVER_IP
3. Wait for DNS propagation (15 min - 48 hours)
4. Verify: `nslookup meebot.io`

### Phase 2: Upload Files
Choose one:
- **SCP:** `scp -r * root@YOUR_SERVER_IP:/var/www/meebot.io/`
- **Git:** `git clone YOUR_REPO /var/www/meebot.io`
- **SFTP:** Use FileZilla, WinSCP, or Cyberduck

### Phase 3: Run Deployment
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

The script will automatically:
- ✅ Install Node.js 20.x
- ✅ Install Nginx
- ✅ Install Certbot (Let's Encrypt)
- ✅ Install PM2
- ✅ Configure Nginx with SSL
- ✅ Start application
- ✅ Configure firewall

### Phase 4: Configure
```bash
nano .env
# Update OPENAI_API_KEY
pm2 restart meebot
```

### Phase 5: Test
```bash
# Test website
curl https://meebot.io

# Test API
curl https://meebot.io/api/health

# Check status
pm2 status
systemctl status nginx
```

---

## 🧪 Testing Checklist

After deployment, verify:

### Website
- [ ] `https://meebot.io` loads correctly
- [ ] `https://www.meebot.io` loads correctly
- [ ] HTTP redirects to HTTPS automatically
- [ ] No browser security warnings

### API Endpoints
```bash
curl https://meebot.io/api/health
curl https://meebot.io/api/web3/status
curl https://meebot.io/api/chain/stats
curl https://meebot.io/api/token/info
curl https://meebot.io/api/price/mintme
```

### SSL Certificate
- [ ] Certificate valid (no warnings)
- [ ] Grade A on SSL Labs
- [ ] Auto-renewal configured

### Application
- [ ] PM2 shows 2 instances running
- [ ] No errors in logs: `pm2 logs meebot`
- [ ] Memory usage normal
- [ ] CPU usage normal

### Infrastructure
- [ ] Nginx active: `systemctl status nginx`
- [ ] Firewall configured: `ufw status`
- [ ] Ports 80, 443 open
- [ ] Port 22 (SSH) open

---

## 📖 Documentation Guide

### For Quick Deployment
Start here: **`QUICK_DEPLOY_GUIDE.md`**
- 5-minute deployment
- Essential commands only
- Quick troubleshooting

### For Detailed Setup
Read: **`DEPLOY_STEP_BY_STEP.md`**
- Complete step-by-step guide
- Explanations for each step
- Troubleshooting section
- Security best practices

### Before You Start
Check: **`DEPLOYMENT_CHECKLIST.md`**
- Prerequisites verification
- Pre-deployment checklist
- Common issues and solutions

### For Overview
See: **`DEPLOYMENT_SUMMARY.md`**
- Architecture diagram
- Security features
- Performance optimizations
- Maintenance schedule

---

## 🔧 Configuration Files Explained

### `scripts/deploy.sh`
Automated deployment script that:
- Updates system packages
- Installs Node.js, Nginx, Certbot, PM2
- Configures Nginx with SSL
- Starts application with PM2
- Configures firewall (UFW)

### `nginx/meebot.io.conf`
Nginx configuration with:
- HTTP to HTTPS redirect
- SSL/TLS configuration
- Reverse proxy to Node.js (port 3000)
- Security headers
- Gzip compression
- Static file caching

### `ecosystem.config.js`
PM2 configuration with:
- Cluster mode (2 instances)
- Auto-restart on crash
- Log management
- Memory limits
- Graceful shutdown

### `.env.production`
Environment variables for production:
- OpenAI API Key
- RPC URLs (BSC Mainnet)
- Contract addresses
- CORS origins
- Security keys

---

## 🐛 Common Issues & Quick Fixes

### Issue: DNS not resolving
```bash
# Check DNS
nslookup meebot.io

# Solution: Wait for propagation (24-48 hours)
```

### Issue: 502 Bad Gateway
```bash
# Check app status
pm2 status

# Restart
pm2 restart meebot
systemctl restart nginx
```

### Issue: SSL certificate failed
```bash
# Check DNS first
nslookup meebot.io

# Retry SSL
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

### Issue: Port 3000 already in use
```bash
# Find process
sudo lsof -i :3000

# Kill process
sudo kill -9 [PID]

# Restart app
pm2 restart meebot
```

---

## 📊 What Happens During Deployment

```
1. System Update          [████████████████████] 100%
2. Install Node.js        [████████████████████] 100%
3. Install Nginx          [████████████████████] 100%
4. Install Certbot        [████████████████████] 100%
5. Install PM2            [████████████████████] 100%
6. Configure Nginx        [████████████████████] 100%
7. Setup SSL              [████████████████████] 100%
8. Start Application      [████████████████████] 100%
9. Configure Firewall     [████████████████████] 100%
10. Final Checks          [████████████████████] 100%

✅ Deployment Complete!
```

---

## 🎯 Success Criteria

When deployment is successful, you should see:

### ✅ Website
- https://meebot.io loads MeeChain Dashboard
- SSL certificate valid (🔒 in browser)
- No errors in console

### ✅ API
```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "bot": "MeeBot AI",
  "web3": true,
  "chainId": 56
}
```

### ✅ Infrastructure
```
PM2 Status:
┌─────┬──────────┬─────────┬─────────┐
│ id  │ name     │ status  │ restart │
├─────┼──────────┼─────────┼─────────┤
│ 0   │ meebot   │ online  │ 0       │
│ 1   │ meebot   │ online  │ 0       │
└─────┴──────────┴─────────┴─────────┘

Nginx: Active (running)
Firewall: Active
```

---

## 🔄 After Deployment

### Immediate (Day 1)
1. Test all API endpoints
2. Verify SSL certificate
3. Check PM2 logs for errors
4. Monitor server resources

### Short-term (Week 1)
1. Setup monitoring (PM2 Plus, New Relic)
2. Configure automated backups
3. Setup error tracking (Sentry)
4. Performance testing

### Long-term (Month 1)
1. Setup CI/CD pipeline
2. Add CDN (Cloudflare)
3. Implement caching (Redis)
4. Security audit
5. Load testing

---

## 📞 Need Help?

### Documentation
- Quick: `QUICK_DEPLOY_GUIDE.md`
- Detailed: `DEPLOY_STEP_BY_STEP.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Summary: `DEPLOYMENT_SUMMARY.md`

### Logs
```bash
# Application logs
pm2 logs meebot

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -xe
```

### Commands
```bash
# Status
pm2 status
systemctl status nginx

# Restart
pm2 restart meebot
systemctl restart nginx

# Stop
pm2 stop meebot
systemctl stop nginx
```

---

## 🎉 You're Ready!

**All files and documentation are prepared for production deployment.**

### Next Steps:
1. ✅ Review `DEPLOYMENT_CHECKLIST.md`
2. ⏳ Configure DNS records
3. ⏳ Wait for DNS propagation
4. ⏳ Choose deployment method
5. ⏳ Run deployment script
6. ⏳ Test at https://meebot.io

**Good luck with your deployment! 🚀**

---

**Prepared:** March 6, 2026  
**Target:** https://meebot.io  
**Status:** ✅ Ready for Production

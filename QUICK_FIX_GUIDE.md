# ⚡ Quick Fix Guide - Deployment Errors

## 🎯 Fix All Errors in 5 Minutes

Based on your deployment errors, here's the quickest way to fix everything:

---

## Step 1: Fix Missing Files (2 minutes)

```bash
# SSH to server
ssh root@2.57.91.91

# Go to app directory
cd /var/www/meebot.io

# Check what's missing
ls -la .env.example
ls -la nginx/meebot.io.conf

# If .env.example is missing, create it
cat > .env.example << 'EOF'
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
DRPC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
VITE_RPC_URL=https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
CHAIN_ID=56
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://meebot.io,https://www.meebot.io
EOF

# Create .env from example
cp .env.example .env

# Edit with your actual API key
nano .env
# Change: OPENAI_API_KEY=your_actual_key_here
# Save: Ctrl+X, Y, Enter
```

---

## Step 2: Fix Nginx Config (2 minutes)

```bash
# Create nginx directory if missing
mkdir -p /var/www/meebot.io/nginx

# Create Nginx config
cat > /var/www/meebot.io/nginx/meebot.io.conf << 'EOF'
# HTTP Server
server {
    listen 80;
    listen [::]:80;
    server_name meebot.io www.meebot.io;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy to Node.js
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
}
EOF

# Create certbot directory
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

# Copy config to Nginx
sudo cp /var/www/meebot.io/nginx/meebot.io.conf /etc/nginx/sites-available/meebot.io

# Create symlink
sudo ln -sf /etc/nginx/sites-available/meebot.io /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 3: Start Application (1 minute)

```bash
cd /var/www/meebot.io

# Install dependencies if not done
npm install --production

# Start with PM2
pm2 start ecosystem.config.js

# Or if ecosystem.config.js doesn't exist:
pm2 start server.js --name meebot -i 2

# Save PM2 process list
pm2 save

# Setup PM2 startup
pm2 startup

# Check status
pm2 status
pm2 logs meebot --lines 20
```

---

## Step 4: Setup SSL (After app is running)

```bash
# Verify DNS first
nslookup meebot.io
# Should show: 2.57.91.91

# If DNS is correct, setup SSL
sudo certbot --nginx -d meebot.io -d www.meebot.io

# Follow prompts:
# Email: your@email.com
# Agree to terms: Y
# Redirect HTTP to HTTPS: 2 (Yes)
```

---

## Step 5: Test Everything

```bash
# Test locally first
curl http://localhost:3000/api/health

# Test via domain (HTTP)
curl http://meebot.io/api/health

# Test via domain (HTTPS - after SSL)
curl https://meebot.io/api/health

# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check logs
pm2 logs meebot --lines 20
```

---

## ✅ Expected Results

### PM2 Status
```
┌─────┬──────────┬─────────┬─────────┐
│ id  │ name     │ status  │ restart │
├─────┼──────────┼─────────┼─────────┤
│ 0   │ meebot   │ online  │ 0       │
│ 1   │ meebot   │ online  │ 0       │
└─────┴──────────┴─────────┴─────────┘
```

### API Response
```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "bot": "MeeBot AI",
  "web3": true,
  "chainId": 56
}
```

### Browser
- http://meebot.io → Shows MeeChain Dashboard
- https://meebot.io → Shows MeeChain Dashboard (after SSL)
- 🔒 Padlock icon in address bar (after SSL)

---

## 🐛 If Still Having Issues

### Issue: Application won't start
```bash
# Check logs
pm2 logs meebot --lines 50

# Common fixes:
# 1. Missing OPENAI_API_KEY
nano /var/www/meebot.io/.env

# 2. Port already in use
sudo lsof -i :3000
sudo kill -9 [PID]

# 3. Missing dependencies
cd /var/www/meebot.io
npm install --production

# Restart
pm2 restart meebot
```

### Issue: Nginx 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# If not running, start it
pm2 start ecosystem.config.js

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Restart both
pm2 restart meebot
sudo systemctl restart nginx
```

### Issue: SSL fails
```bash
# Make sure DNS is resolving
nslookup meebot.io

# Make sure Nginx is serving HTTP first
curl http://meebot.io/api/health

# Make sure certbot directory exists
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

# Try again
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

---

## 🚀 Alternative: Use Fixed Deployment Script

If you want to start fresh:

```bash
cd /var/www/meebot.io

# Make script executable
chmod +x scripts/deploy-fixed.sh

# Run fixed deployment script
sudo ./scripts/deploy-fixed.sh

# This script handles all the errors automatically
```

---

## 📞 Quick Commands Reference

```bash
# Check everything
pm2 status && sudo systemctl status nginx

# Restart everything
pm2 restart meebot && sudo systemctl restart nginx

# View logs
pm2 logs meebot
sudo tail -f /var/log/nginx/error.log

# Test API
curl http://localhost:3000/api/health
curl http://meebot.io/api/health
curl https://meebot.io/api/health

# Check DNS
nslookup meebot.io

# Check SSL
sudo certbot certificates
```

---

## 🎯 Summary

**3 main fixes needed:**
1. ✅ Create .env file with OPENAI_API_KEY
2. ✅ Create and configure Nginx config
3. ✅ Setup SSL after Nginx is working

**Total time:** ~5 minutes

**After fixes, you should have:**
- ✅ Application running on PM2
- ✅ Nginx serving on port 80
- ✅ SSL certificate (after certbot)
- ✅ https://meebot.io working

---

**Need more help?** Check:
- `DEPLOYMENT_TROUBLESHOOTING.md` - Detailed solutions
- `PRODUCTION_QUICK_REFERENCE.md` - Command reference
- `POST_DEPLOYMENT_QA.md` - Testing checklist

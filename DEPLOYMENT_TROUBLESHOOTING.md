# 🔧 Deployment Troubleshooting Guide

## ❌ Common Deployment Errors & Solutions

---

## Error 1: .env.example not found

### Problem
```
.env.example not found
Skipping .env creation
```

### Root Cause
- Files not uploaded completely to server
- Wrong directory structure

### Solution

```bash
# Check if .env.example exists
ls -la /var/www/meebot.io/.env.example

# If not found, create it manually
cd /var/www/meebot.io
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

# Copy to .env
cp .env.example .env

# Edit with your actual values
nano .env
```

---

## Error 2: Nginx config not found

### Problem
```
nginx/meebot.io.conf not found
Nginx configuration failed
```

### Root Cause
- nginx/ directory not uploaded
- Files in wrong location

### Solution

```bash
# Check if nginx config exists
ls -la /var/www/meebot.io/nginx/meebot.io.conf

# If not found, create it manually
mkdir -p /var/www/meebot.io/nginx

cat > /var/www/meebot.io/nginx/meebot.io.conf << 'EOF'
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name meebot.io www.meebot.io;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name meebot.io www.meebot.io;

    # SSL Certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/meebot.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meebot.io/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Root directory
    root /var/www/meebot.io;
    index index.html;

    # Logging
    access_log /var/log/nginx/meebot.io.access.log;
    error_log /var/log/nginx/meebot.io.error.log;

    # Proxy to Node.js application
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

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Copy to Nginx sites-available
sudo cp /var/www/meebot.io/nginx/meebot.io.conf /etc/nginx/sites-available/meebot.io

# Create symlink to sites-enabled
sudo ln -sf /etc/nginx/sites-available/meebot.io /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Error 3: SSL Certificate Failed

### Problem
```
Certbot failed to verify domain
Challenge validation failed
```

### Root Cause
- DNS not pointing to server IP
- Nginx not serving .well-known/acme-challenge/
- Port 80 blocked by firewall

### Solution

#### Step 1: Verify DNS
```bash
# Check DNS resolution
nslookup meebot.io
dig meebot.io

# Should show: 2.57.91.91
```

#### Step 2: Create certbot directory
```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

#### Step 3: Update Nginx config for HTTP challenge
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/meebot.io

# Make sure this section exists in HTTP server block:
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: Check firewall
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

#### Step 5: Run Certbot manually
```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Run Certbot in standalone mode
sudo certbot certonly --standalone -d meebot.io -d www.meebot.io --email your@email.com --agree-tos

# Start Nginx
sudo systemctl start nginx

# Or use Nginx plugin
sudo certbot --nginx -d meebot.io -d www.meebot.io --email your@email.com --agree-tos
```

---

## Error 4: Port 3000 Already in Use

### Problem
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solution

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 [PID]

# Or kill all node processes
sudo pkill -9 node

# Restart application
pm2 restart meebot
```

---

## Error 5: PM2 Process Not Starting

### Problem
```
PM2 shows "errored" status
Application crashes immediately
```

### Solution

```bash
# Check logs
pm2 logs meebot --lines 100

# Common issues:

# 1. Missing dependencies
cd /var/www/meebot.io
npm install --production

# 2. Wrong .env configuration
nano .env
# Check OPENAI_API_KEY, PORT, etc.

# 3. Permission issues
sudo chown -R $USER:$USER /var/www/meebot.io

# 4. Node version
node --version  # Should be 20.x

# Restart
pm2 delete meebot
pm2 start ecosystem.config.js
pm2 save
```

---

## Error 6: 502 Bad Gateway

### Problem
Browser shows "502 Bad Gateway" error

### Root Cause
- Application not running
- Nginx can't connect to Node.js

### Solution

```bash
# Check if app is running
pm2 status

# If not running, start it
pm2 start ecosystem.config.js

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Check Nginx error logs
sudo tail -f /var/log/nginx/meebot.io.error.log

# Restart both
pm2 restart meebot
sudo systemctl restart nginx
```

---

## Error 7: DNS Not Resolving

### Problem
```
nslookup meebot.io
Server can't find meebot.io: NXDOMAIN
```

### Solution

```bash
# Wait for DNS propagation (24-48 hours)

# Check DNS records at registrar
# Should have:
# A record: @ → 2.57.91.91
# A record: www → 2.57.91.91

# Use alternative DNS servers to check
nslookup meebot.io 8.8.8.8
nslookup meebot.io 1.1.1.1

# Check propagation status
# Visit: https://www.whatsmydns.net/#A/meebot.io
```

---

## Complete Manual Deployment (If Script Fails)

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Install PM2
sudo npm install -g pm2

# Verify installations
node --version
nginx -v
certbot --version
pm2 --version
```

### Step 2: Setup Application

```bash
cd /var/www/meebot.io

# Install dependencies
npm install --production

# Create .env
cp .env.example .env
nano .env
# Add your OPENAI_API_KEY

# Create logs directory
mkdir -p logs
```

### Step 3: Configure Nginx

```bash
# Copy config
sudo cp nginx/meebot.io.conf /etc/nginx/sites-available/meebot.io

# Create symlink
sudo ln -sf /etc/nginx/sites-available/meebot.io /etc/nginx/sites-enabled/

# Remove default
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 4: Setup SSL (After Nginx is working)

```bash
# Create certbot directory
sudo mkdir -p /var/www/certbot

# Run Certbot
sudo certbot --nginx -d meebot.io -d www.meebot.io

# Follow prompts:
# Email: your@email.com
# Agree to terms: Y
# Redirect HTTP to HTTPS: 2 (Yes)

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 5: Start Application

```bash
cd /var/www/meebot.io

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs meebot
```

### Step 6: Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# Check status
sudo ufw status
```

### Step 7: Test Everything

```bash
# Test API
curl https://meebot.io/api/health

# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check logs
pm2 logs meebot --lines 20
sudo tail -20 /var/log/nginx/meebot.io.error.log
```

---

## Quick Diagnostic Commands

```bash
# Check all services
pm2 status && sudo systemctl status nginx

# Check ports
sudo netstat -tulpn | grep -E ':(80|443|3000)'

# Check DNS
nslookup meebot.io

# Check SSL
curl -vI https://meebot.io 2>&1 | grep "SSL certificate"

# Check logs
pm2 logs meebot --lines 50
sudo tail -50 /var/log/nginx/error.log

# Check disk space
df -h

# Check memory
free -h

# Check processes
ps aux | grep node
```

---

## Emergency Recovery

### If everything is broken:

```bash
# Stop everything
pm2 stop all
sudo systemctl stop nginx

# Clean up
pm2 delete all
pm2 flush

# Start fresh
cd /var/www/meebot.io
npm install --production
pm2 start ecosystem.config.js
pm2 save

sudo systemctl start nginx

# Check status
pm2 status
sudo systemctl status nginx
curl https://meebot.io/api/health
```

---

## Contact Information

### Logs Location
- Application: `pm2 logs meebot`
- Nginx Access: `/var/log/nginx/meebot.io.access.log`
- Nginx Error: `/var/log/nginx/meebot.io.error.log`
- System: `sudo journalctl -xe`

### Useful Commands
```bash
# Restart everything
pm2 restart meebot && sudo systemctl restart nginx

# View all logs
pm2 logs meebot & sudo tail -f /var/log/nginx/error.log

# Check everything
pm2 status && sudo systemctl status nginx && curl https://meebot.io/api/health
```

---

**If you're still stuck, check the detailed guides:**
- `DEPLOY_STEP_BY_STEP.md` - Complete manual deployment
- `PRODUCTION_QUICK_REFERENCE.md` - Quick commands
- `POST_DEPLOYMENT_QA.md` - Testing checklist

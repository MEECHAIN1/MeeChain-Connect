# MeeChain Deployment Guide

คู่มือการ deploy MeeChain ไปยัง production environment

## 🎯 Deployment Options

1. **Traditional Server** (VPS, Dedicated Server)
2. **Cloud Platform** (AWS, GCP, Azure)
3. **Container** (Docker, Kubernetes)
4. **Serverless** (Vercel, Netlify + Backend API)

---

## 🚀 Option 1: Traditional Server (VPS)

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+
- Nginx
- SSL certificate (Let's Encrypt)
- Domain name

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/MEECHAIN1/MeeChain-Connect.git
cd MeeChain-Connect

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Edit with production values
```

### Step 3: Configure Nginx

```nginx
# /etc/nginx/sites-available/meechain
server {
    listen 80;
    server_name meechain.run.place;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name meechain.run.place;

    ssl_certificate /etc/letsencrypt/live/meechain.run.place/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meechain.run.place/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # RPC Proxy
    location /rpc {
        proxy_pass http://localhost:8545;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```


### Step 4: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d meechain.run.place

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### Step 5: Start Application

```bash
# Start with PM2
pm2 start server.js --name meechain
pm2 startup  # Enable auto-start on boot
pm2 save

# Check status
pm2 status
pm2 logs meechain
```

### Step 6: Enable Nginx

```bash
sudo ln -s /etc/nginx/sites-available/meechain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🐳 Option 2: Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

### Deploy

```bash
docker-compose up -d
docker-compose logs -f
```

---

## ☁️ Option 3: Cloud Platform (AWS Example)

### AWS EC2 + RDS

1. Launch EC2 instance (t3.medium recommended)
2. Configure security groups (ports 80, 443, 22)
3. Follow "Traditional Server" steps above
4. Optional: Use RDS for database (if needed)
5. Optional: Use S3 for static assets
6. Optional: Use CloudFront for CDN

---

## 📋 Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Use strong API keys
- [ ] Enable firewall (ufw)
- [ ] Configure fail2ban
- [ ] Regular security updates
- [ ] Backup strategy

### Performance
- [ ] Enable Nginx caching
- [ ] Configure CDN
- [ ] Optimize images
- [ ] Enable gzip compression
- [ ] Monitor resource usage

### Monitoring
- [ ] Setup PM2 monitoring
- [ ] Configure log rotation
- [ ] Setup uptime monitoring
- [ ] Configure alerts
- [ ] Track error rates

---

## 🔧 Environment Variables (Production)

```env
# Production values
NODE_ENV=production
PORT=3000

# OpenAI
OPENAI_API_KEY=sk-prod-xxxxx
OPENAI_BASE_URL=https://api.openai.com/v1

# RPC
DRPC_RPC_URL=https://rpc.meechain.run.place:5005
CHAIN_ID=13390

# CORS
CORS_ORIGINS=https://meechain.run.place

# Contracts (update after deployment)
VITE_TOKEN_CONTRACT_ADDRESS=0x...
VITE_NFT_CONTRACT_ADDRESS=0x...
VITE_STAKING_CONTRACT_ADDRESS=0x...
```

---

## 📊 Monitoring & Logs

### PM2 Monitoring

```bash
pm2 monit
pm2 logs meechain --lines 100
```

### Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔄 Updates & Rollback

### Update

```bash
cd MeeChain-Connect
git pull origin main
npm install
pm2 restart meechain
```

### Rollback

```bash
git log --oneline
git checkout <previous-commit>
pm2 restart meechain
```

---

## 🆘 Troubleshooting

See [QA_CHECKLIST.md](../QA_CHECKLIST.md) for common issues.

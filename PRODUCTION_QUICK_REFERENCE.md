# 🚀 Production Quick Reference - meebot.io

## 📋 Essential Information

**Domain:** https://meebot.io  
**Server:** YOUR_SERVER_IP  
**Environment:** Production  
**Chain:** BSC Mainnet (Chain ID: 56)

---

## 🔧 Quick Commands

### Check Status
```bash
# Application status
pm2 status

# Nginx status
sudo systemctl status nginx

# SSL certificate
sudo certbot certificates

# Firewall status
sudo ufw status
```

### View Logs
```bash
# Application logs (live)
pm2 logs meebot

# Application logs (last 100 lines)
pm2 logs meebot --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/meebot.io.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/meebot.io.error.log

# System logs
sudo journalctl -xe
```

### Restart Services
```bash
# Restart application
pm2 restart meebot

# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx config
sudo systemctl reload nginx

# Restart both
pm2 restart meebot && sudo systemctl restart nginx
```

### Stop/Start Services
```bash
# Stop application
pm2 stop meebot

# Start application
pm2 start meebot

# Delete from PM2
pm2 delete meebot

# Start with ecosystem file
pm2 start ecosystem.config.js
```

---

## 🧪 Quick Tests

### Test API Endpoints
```bash
# Health check
curl https://meebot.io/api/health

# Web3 status
curl https://meebot.io/api/web3/status

# Chain stats
curl https://meebot.io/api/chain/stats

# Price
curl https://meebot.io/api/price/mintme
```

### Run Full QA
```bash
cd /var/www/meebot.io
chmod +x scripts/test-production.sh
./scripts/test-production.sh
```

### Test SSL
```bash
# Check certificate
curl -vI https://meebot.io 2>&1 | grep "SSL certificate"

# Test SSL Labs
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=meebot.io
```

---

## 🔄 Update Deployment

### Quick Update
```bash
cd /var/www/meebot.io
./scripts/quick-deploy.sh
```

### Manual Update
```bash
cd /var/www/meebot.io

# Pull changes (if using git)
git pull

# Or upload new files
# scp -r * root@YOUR_SERVER_IP:/var/www/meebot.io/

# Install dependencies
npm install --production

# Restart
pm2 restart meebot

# Check status
pm2 status
pm2 logs meebot --lines 20
```

---

## 🐛 Troubleshooting

### Problem: 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Check port
sudo netstat -tulpn | grep 3000

# Restart app
pm2 restart meebot

# Check logs
pm2 logs meebot --lines 50
```

### Problem: SSL Certificate Error
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

### Problem: High Memory Usage
```bash
# Check memory
free -h
pm2 monit

# Restart app
pm2 restart meebot

# Check for memory leaks
pm2 logs meebot | grep "memory"
```

### Problem: Application Crashes
```bash
# Check logs
pm2 logs meebot --lines 100

# Check error logs
pm2 logs meebot --err --lines 50

# Restart with fresh logs
pm2 restart meebot
pm2 flush
```

### Problem: DNS Not Resolving
```bash
# Check DNS
nslookup meebot.io
dig meebot.io

# Wait for propagation (24-48 hours)
```

---

## 📊 Monitoring

### Real-time Monitoring
```bash
# PM2 monitoring dashboard
pm2 monit

# System resources
htop

# Disk usage
df -h

# Memory usage
free -h

# Network connections
sudo netstat -tulpn
```

### Check Resource Usage
```bash
# CPU usage
top -bn1 | grep "Cpu(s)"

# Memory usage
free -m

# Disk usage
df -h /

# Process list
pm2 list
```

---

## 🔐 Security

### Firewall
```bash
# Check firewall
sudo ufw status

# Allow port
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny port
sudo ufw deny 3000/tcp

# Enable firewall
sudo ufw enable
```

### SSL Certificate
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📁 Important Paths

### Application
```
/var/www/meebot.io/          # Application root
/var/www/meebot.io/.env      # Environment variables
/var/www/meebot.io/logs/     # Application logs
```

### Nginx
```
/etc/nginx/sites-available/meebot.io    # Nginx config
/etc/nginx/sites-enabled/meebot.io      # Enabled config (symlink)
/var/log/nginx/meebot.io.access.log     # Access logs
/var/log/nginx/meebot.io.error.log      # Error logs
```

### SSL
```
/etc/letsencrypt/live/meebot.io/        # SSL certificates
/etc/letsencrypt/renewal/meebot.io.conf # Renewal config
```

### PM2
```
~/.pm2/logs/                            # PM2 logs
~/.pm2/pids/                            # Process IDs
```

---

## 🔄 Backup & Restore

### Create Backup
```bash
# Backup application
cd /var/www
sudo tar -czf meebot-backup-$(date +%Y%m%d).tar.gz meebot.io/

# Backup database (if any)
# mysqldump -u user -p database > backup.sql
```

### Restore Backup
```bash
# Stop application
pm2 stop meebot

# Restore files
cd /var/www
sudo tar -xzf meebot-backup-YYYYMMDD.tar.gz

# Restart application
pm2 restart meebot
```

---

## 📞 Emergency Contacts

### Critical Issues
1. Check logs: `pm2 logs meebot --lines 100`
2. Check Nginx: `sudo tail -100 /var/log/nginx/error.log`
3. Restart services: `pm2 restart meebot && sudo systemctl restart nginx`

### If Site is Down
```bash
# Quick fix
pm2 restart meebot
sudo systemctl restart nginx

# Check status
pm2 status
sudo systemctl status nginx

# View logs
pm2 logs meebot --lines 50
```

---

## 📊 Performance Metrics

### Target Metrics
- Response time: < 500ms
- Uptime: > 99.9%
- Memory usage: < 400MB per instance
- CPU usage: < 50%
- Error rate: < 0.1%

### Check Metrics
```bash
# Response time
curl -w "@curl-format.txt" -o /dev/null -s https://meebot.io/api/health

# Uptime
pm2 status

# Memory
pm2 monit

# CPU
top -bn1 | grep "Cpu(s)"
```

---

## 🎯 Quick Checklist

### Daily
- [ ] Check PM2 status: `pm2 status`
- [ ] Check logs for errors: `pm2 logs meebot --lines 50`
- [ ] Verify site is accessible: `curl https://meebot.io/api/health`

### Weekly
- [ ] Review logs: `pm2 logs meebot --lines 1000 > review.log`
- [ ] Check disk space: `df -h`
- [ ] Check SSL expiry: `sudo certbot certificates`
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`

### Monthly
- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Review and rotate logs
- [ ] Test backup restoration
- [ ] Review and update documentation

---

## 📚 Documentation Links

- Full Deployment Guide: `DEPLOY_STEP_BY_STEP.md`
- QA Checklist: `POST_DEPLOYMENT_QA.md`
- API Documentation: `docs/API.md`
- JSDoc: https://meebot.io/docs/jsdoc/index.html

---

## 🆘 Support

### Logs Location
- Application: `pm2 logs meebot`
- Nginx Access: `/var/log/nginx/meebot.io.access.log`
- Nginx Error: `/var/log/nginx/meebot.io.error.log`
- System: `sudo journalctl -xe`

### Common Commands
```bash
# Status check
pm2 status && sudo systemctl status nginx

# Restart everything
pm2 restart meebot && sudo systemctl restart nginx

# View all logs
pm2 logs meebot & sudo tail -f /var/log/nginx/error.log
```

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0  
**Status:** Production Ready

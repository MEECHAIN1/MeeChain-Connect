# 📋 Post-Deployment QA Checklist - meebot.io

## 🎯 Overview

ใช้ checklist นี้เพื่อตรวจสอบว่า production ที่ https://meebot.io ทำงานครบทุกส่วนหลัง deploy เสร็จ

**Target:** https://meebot.io  
**Environment:** Production  
**Date:** _____________

---

## 🔧 Server & Process Health

### PM2 Process Manager
```bash
ssh root@YOUR_SERVER_IP
pm2 status
```

- [ ] PM2 process `meebot` รันอยู่ (status: `online`)
- [ ] มี 2 instances ทำงาน (cluster mode)
- [ ] Restart count = 0 (ไม่มี crash)
- [ ] Uptime > 1 minute
- [ ] Memory usage < 400MB per instance
- [ ] CPU usage < 50%

**Expected Output:**
```
┌─────┬──────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name     │ mode    │ status  │ restart │ uptime   │
├─────┼──────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ meebot   │ cluster │ online  │ 0       │ 5m       │
│ 1   │ meebot   │ cluster │ online  │ 0       │ 5m       │
└─────┴──────────┴─────────┴─────────┴─────────┴──────────┘
```

### Nginx Web Server
```bash
sudo systemctl status nginx
sudo nginx -t
```

- [ ] Nginx service active (running)
- [ ] Config test passed: `nginx: configuration file /etc/nginx/nginx.conf test is successful`
- [ ] No errors in status output
- [ ] Listening on ports 80 and 443

**Expected Output:**
```
● nginx.service - A high performance web server
   Active: active (running)
```

### SSL Certificate
```bash
sudo certbot certificates
curl -vI https://meebot.io 2>&1 | grep "SSL certificate"
```

- [ ] Certificate valid for `meebot.io` and `www.meebot.io`
- [ ] Expiry date > 30 days from now
- [ ] Auto-renewal configured
- [ ] No browser security warnings when visiting https://meebot.io

**Test in Browser:**
- [ ] 🔒 Padlock icon shows in address bar
- [ ] Certificate issued by Let's Encrypt
- [ ] No "Not Secure" warnings

### Application Logs
```bash
pm2 logs meebot --lines 50
```

- [ ] No error messages in logs
- [ ] Server startup message visible: `✅ MeeBot AI Server running on http://0.0.0.0:3000`
- [ ] Web3 connection successful or using mock data
- [ ] No repeated error patterns

---

## 🌐 DNS & Network

### DNS Resolution
```bash
nslookup meebot.io
nslookup www.meebot.io
```

- [ ] `meebot.io` resolves to correct server IP
- [ ] `www.meebot.io` resolves to correct server IP
- [ ] No DNS errors

**Expected Output:**
```
Name:   meebot.io
Address: YOUR_SERVER_IP
```

### Network Connectivity
```bash
ping -c 4 meebot.io
curl -I https://meebot.io
```

- [ ] Ping successful (0% packet loss)
- [ ] HTTP response code: 200 OK
- [ ] Response time < 500ms

### Firewall
```bash
sudo ufw status
```

- [ ] Firewall active
- [ ] Port 80 (HTTP) allowed
- [ ] Port 443 (HTTPS) allowed
- [ ] Port 22 (SSH) allowed
- [ ] Port 3000 NOT exposed to public

**Expected Output:**
```
Status: active

To                         Action      From
--                         ------      ----
Nginx Full                 ALLOW       Anywhere
OpenSSH                    ALLOW       Anywhere
```

---

## 🧪 API Endpoints Testing

### Health Check
```bash
curl https://meebot.io/api/health
```

- [ ] Status code: 200
- [ ] Response contains: `"status":"ok"`
- [ ] Response contains: `"chainId":56` (BSC Mainnet)
- [ ] Response contains: `"model":"gpt-5-mini"`
- [ ] Response time < 500ms

**Expected Response:**
```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "bot": "MeeBot AI",
  "web3": true,
  "chainId": 56,
  "rpc": "https://bsc-mainnet.nodereal.io/v1/...",
  "contracts": {...},
  "uptime": 300
}
```

### Network Info
```bash
curl https://meebot.io/api/network
```

- [ ] Status code: 200
- [ ] Response contains: `"chainId":"0x38"` (56 in hex)
- [ ] Response contains: `"chainName":"Ritual Chain (MeeChain)"`
- [ ] Response contains RPC URLs
- [ ] Response contains contract addresses

### Web3 Status
```bash
curl https://meebot.io/api/web3/status
```

- [ ] Status code: 200
- [ ] Response contains: `"connected":true` or `"connected":false`
- [ ] Response contains: `"chainId":56`
- [ ] If connected, `blockNumber` is present

**Expected Response:**
```json
{
  "connected": true,
  "blockNumber": 84934046,
  "rpc": "https://bsc-mainnet.nodereal.io/v1/...",
  "chainId": 56,
  "contracts": {...}
}
```

### Chain Stats
```bash
curl https://meebot.io/api/chain/stats
```

- [ ] Status code: 200
- [ ] Response contains: `"blockNumber"`
- [ ] Response contains: `"gasPrice"`
- [ ] Block number is reasonable (> 84000000 for BSC)

### Token Info
```bash
curl https://meebot.io/api/token/info
```

- [ ] Status code: 200 or 500 (if contract not deployed)
- [ ] If 200: Response contains token name, symbol, decimals
- [ ] If 500: Error message is clear

### Token Balance
```bash
curl https://meebot.io/api/token/balance/0x8da6eb1cd5c0c8cf84bd522ab7c11747db1128c9
```

- [ ] Status code: 200 or 500
- [ ] Response format is valid JSON
- [ ] If 200: Contains address and balance

### NFT Info
```bash
curl https://meebot.io/api/nft/info
```

- [ ] Status code: 200 or 500
- [ ] Response format is valid JSON

### Staking Info
```bash
curl https://meebot.io/api/staking/info
```

- [ ] Status code: 200 or 500
- [ ] Response format is valid JSON

### Recent Transactions
```bash
curl https://meebot.io/api/chain/transactions
```

- [ ] Status code: 200
- [ ] Response contains: `"transactions"` array
- [ ] Response contains: `"live"` boolean

### MintMe Price
```bash
curl https://meebot.io/api/price/mintme
```

- [ ] Status code: 200
- [ ] Response contains: `"token":"MeeChain"`
- [ ] Response contains: `"price"` (number)
- [ ] Response contains: `"exchange":"MintMe"`
- [ ] Response contains: `"timestamp"`

**Expected Response:**
```json
{
  "success": true,
  "token": "MeeChain",
  "pair": "MEE/POL",
  "price": 0.0842,
  "priceUSD": 0.0421,
  "volume24h": 0,
  "exchange": "MintMe",
  "url": "https://www.mintme.com/token/MeeChain/POL/trade",
  "timestamp": "2026-03-06T..."
}
```

### MeeBot AI Chat (Non-streaming)
```bash
curl -X POST https://meebot.io/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"สวัสดี","sessionId":"test"}'
```

- [ ] Status code: 200
- [ ] Response contains: `"reply"` (string in Thai)
- [ ] Response time < 5 seconds
- [ ] Reply is relevant to message

### Clear Chat Session
```bash
curl -X DELETE https://meebot.io/api/chat/test
```

- [ ] Status code: 200
- [ ] Response contains: `"cleared":true`

---

## 🌐 Website Frontend

### Homepage
```bash
curl https://meebot.io
```

- [ ] Status code: 200
- [ ] Response contains HTML
- [ ] Response contains: `<title>MeeChain Dashboard</title>`
- [ ] Response size > 10KB

### Browser Testing
Open https://meebot.io in browser:

- [ ] Page loads without errors
- [ ] No console errors (F12 → Console)
- [ ] Dashboard displays correctly
- [ ] Navigation works (Dashboard, NFT Market, Staking, etc.)
- [ ] MeeBot chat widget loads
- [ ] Price widget displays
- [ ] Network status bar shows connection status

### Static Assets
- [ ] CSS files load correctly
- [ ] JavaScript files load correctly
- [ ] Images load correctly
- [ ] Fonts load correctly

### Responsive Design
- [ ] Desktop view works (1920x1080)
- [ ] Tablet view works (768x1024)
- [ ] Mobile view works (375x667)

---

## 🔐 Security Testing

### HTTPS Redirect
```bash
curl -I http://meebot.io
```

- [ ] Status code: 301 (Moved Permanently)
- [ ] Location header: `https://meebot.io`

### Security Headers
```bash
curl -I https://meebot.io
```

- [ ] `Strict-Transport-Security` header present
- [ ] `X-Frame-Options` header present
- [ ] `X-Content-Type-Options` header present
- [ ] `X-XSS-Protection` header present

### SSL Labs Test
Visit: https://www.ssllabs.com/ssltest/analyze.html?d=meebot.io

- [ ] Overall Rating: A or A+
- [ ] Certificate: Valid
- [ ] Protocol Support: TLS 1.2, TLS 1.3
- [ ] No major vulnerabilities

---

## 📊 Performance Testing

### Response Times
```bash
curl -w "@curl-format.txt" -o /dev/null -s https://meebot.io/api/health
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
```

- [ ] DNS lookup < 100ms
- [ ] Connection time < 200ms
- [ ] Time to first byte < 500ms
- [ ] Total time < 1000ms

### Load Testing (Optional)
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 https://meebot.io/api/health
```

- [ ] No failed requests
- [ ] Average response time < 500ms
- [ ] Requests per second > 50

---

## 📚 Documentation

### JSDoc Documentation
```bash
curl https://meebot.io/docs/jsdoc/index.html
```

- [ ] Status code: 200
- [ ] HTML documentation loads
- [ ] Contains server.js documentation
- [ ] Contains app.js documentation

### API Documentation
- [ ] `docs/API.md` accessible
- [ ] All endpoints documented
- [ ] Examples provided

### README
- [ ] `README.md` up to date
- [ ] Installation instructions correct
- [ ] Links work

---

## 🔄 Monitoring & Logs

### PM2 Monitoring
```bash
pm2 monit
```

- [ ] CPU usage stable
- [ ] Memory usage stable
- [ ] No memory leaks
- [ ] No error spikes

### Nginx Access Logs
```bash
sudo tail -f /var/log/nginx/meebot.io.access.log
```

- [ ] Requests logging correctly
- [ ] Status codes mostly 200
- [ ] No unusual patterns

### Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/meebot.io.error.log
```

- [ ] No critical errors
- [ ] No repeated errors
- [ ] No connection refused errors

### System Resources
```bash
htop
df -h
free -h
```

- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Disk usage < 80%
- [ ] No swap usage

---

## 🧪 Smart Contracts (If Deployed)

### Token Contract
```bash
curl https://meebot.io/api/token/info
```

- [ ] Contract deployed successfully
- [ ] Token name correct
- [ ] Token symbol correct
- [ ] Decimals = 18

### NFT Contract
```bash
curl https://meebot.io/api/nft/info
```

- [ ] Contract deployed successfully
- [ ] NFT name correct
- [ ] NFT symbol correct

### Staking Contract
```bash
curl https://meebot.io/api/staking/info
```

- [ ] Contract deployed successfully
- [ ] Staking parameters correct

---

## 🎯 Functional Testing

### Wallet Connection (Browser)
1. Open https://meebot.io
2. Click "Connect Wallet"
3. Select MetaMask

- [ ] MetaMask popup appears
- [ ] Can connect wallet
- [ ] Wallet address displays correctly
- [ ] Balance updates

### NFT Marketplace (Browser)
1. Navigate to NFT Market
2. Browse NFTs

- [ ] NFTs display correctly
- [ ] Filters work
- [ ] Search works
- [ ] NFT details modal opens

### MeeBot AI Chat (Browser)
1. Click MeeBot icon
2. Send message: "สวัสดี"

- [ ] Chat widget opens
- [ ] Message sends
- [ ] Response received in Thai
- [ ] Response is relevant

### Price Widget (Browser)
- [ ] Price widget displays
- [ ] Shows MeeChain/POL price
- [ ] Updates automatically
- [ ] "Trade on MintMe" button works

---

## 🔄 Backup & Recovery

### Backup Configuration
```bash
ls -la /home/deploy/backups/
```

- [ ] Backup directory exists
- [ ] Backup script exists
- [ ] Cron job configured
- [ ] Recent backup file exists

### PM2 Startup
```bash
pm2 startup
pm2 save
```

- [ ] PM2 startup configured
- [ ] Process list saved
- [ ] Will auto-start on reboot

---

## 📊 QA Summary

### Critical Issues (Must Fix)
- [ ] No critical issues found

**List any critical issues:**
1. _____________
2. _____________

### Major Issues (Should Fix)
- [ ] No major issues found

**List any major issues:**
1. _____________
2. _____________

### Minor Issues (Nice to Fix)
- [ ] No minor issues found

**List any minor issues:**
1. _____________
2. _____________

---

## ✅ Final Checklist

### Infrastructure
- [ ] Server running and accessible
- [ ] PM2 process healthy
- [ ] Nginx configured correctly
- [ ] SSL certificate valid
- [ ] Firewall configured
- [ ] DNS resolving correctly

### Application
- [ ] All API endpoints responding
- [ ] Frontend loads correctly
- [ ] No console errors
- [ ] MeeBot AI working
- [ ] Price widget working
- [ ] Wallet integration working

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] SSL grade A or A+
- [ ] No exposed ports
- [ ] Firewall active

### Performance
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] CPU usage normal
- [ ] Disk space sufficient

### Documentation
- [ ] JSDoc accessible
- [ ] API docs up to date
- [ ] README accurate

### Monitoring
- [ ] Logs accessible
- [ ] No error patterns
- [ ] Resources monitored
- [ ] Backups configured

---

## 🎉 Deployment Status

**Overall Status:** [ ] ✅ PASS | [ ] ⚠️ PASS WITH ISSUES | [ ] ❌ FAIL

**Tested By:** _____________  
**Date:** _____________  
**Time:** _____________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 📞 If Issues Found

### Check Logs
```bash
# Application logs
pm2 logs meebot --lines 100

# Nginx error logs
sudo tail -100 /var/log/nginx/meebot.io.error.log

# System logs
sudo journalctl -xe
```

### Restart Services
```bash
# Restart application
pm2 restart meebot

# Restart Nginx
sudo systemctl restart nginx

# Check status
pm2 status
sudo systemctl status nginx
```

### Common Fixes
- **502 Bad Gateway:** `pm2 restart meebot`
- **SSL Error:** `sudo certbot renew && sudo systemctl reload nginx`
- **High Memory:** `pm2 restart meebot`
- **DNS Issues:** Wait for propagation (24-48 hours)

---

## 🚀 Next Steps After QA Pass

1. ✅ Announce deployment to team
2. ✅ Update documentation with production URLs
3. ✅ Setup monitoring alerts
4. ✅ Schedule regular backups
5. ✅ Plan for next release

---

**🎉 If all checks pass, production is READY for users!**

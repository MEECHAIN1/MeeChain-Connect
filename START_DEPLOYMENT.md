# 🚀 Start Deployment to meebot.io

## ✅ Prerequisites Confirmed

- ✅ DNS configured and propagated
- ✅ All deployment files ready
- ✅ Documentation complete

---

## 📋 Deployment Steps

### Step 1: Verify DNS Resolution

```bash
# From your local machine
nslookup meebot.io
```

**Expected output:**
```
Name:   meebot.io
Address: YOUR_SERVER_IP
```

✅ If you see your server IP, DNS is ready!

---

### Step 2: Prepare Files for Upload

```bash
# From your local machine, in project directory
cd C:\MeeChain-Connect

# Create deployment package (optional - for backup)
tar -czf meebot-deploy-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=docs/jsdoc \
  --exclude=logs \
  .
```

---

### Step 3: Upload Files to Server

**Option A: Using SCP (Recommended)**

```bash
# Upload all files
scp -r * root@YOUR_SERVER_IP:/tmp/meebot-upload/

# Or if you have specific user
scp -r * deploy@YOUR_SERVER_IP:/tmp/meebot-upload/
```

**Option B: Using Git (If you have repository)**

```bash
# SSH to server first
ssh root@YOUR_SERVER_IP

# Clone repository
cd /var/www
git clone YOUR_GITHUB_REPO meebot.io
cd meebot.io
```

**Option C: Using SFTP Client**
- Use FileZilla, WinSCP, or Cyberduck
- Connect to YOUR_SERVER_IP
- Upload entire project folder to `/tmp/meebot-upload/`

---

### Step 4: SSH to Server

```bash
ssh root@YOUR_SERVER_IP
```

---

### Step 5: Move Files to Production Directory

```bash
# Create production directory
sudo mkdir -p /var/www/meebot.io

# Move files from upload location
sudo mv /tmp/meebot-upload/* /var/www/meebot.io/

# Set ownership (if using non-root user)
sudo chown -R $USER:$USER /var/www/meebot.io

# Set permissions
sudo chmod -R 755 /var/www/meebot.io
```

---

### Step 6: Make Scripts Executable

```bash
cd /var/www/meebot.io

# Make deployment scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/quick-deploy.sh
chmod +x scripts/test-production.sh
```

---

### Step 7: Update Deployment Script Email

```bash
# Edit deploy.sh to add your email
nano scripts/deploy.sh

# Find this line:
# EMAIL="your@email.com"

# Change to your actual email:
# EMAIL="youremail@example.com"

# Save: Ctrl+X, Y, Enter
```

---

### Step 8: Run Deployment Script

```bash
cd /var/www/meebot.io
sudo ./scripts/deploy.sh
```

**What the script will do:**
1. ✅ Update system packages
2. ✅ Install Node.js 20.x
3. ✅ Install Nginx
4. ✅ Install Certbot (Let's Encrypt)
5. ✅ Install PM2
6. ✅ Install npm dependencies
7. ✅ Configure Nginx
8. ✅ Setup SSL certificate
9. ✅ Start application with PM2
10. ✅ Configure firewall

**During deployment, you'll be asked:**
```
Do you want to setup SSL now? (y/n)
```
Type: `y` and press Enter

**For SSL setup, provide:**
- Email: your@email.com
- Agree to terms: Y
- Share email: N (optional)

---

### Step 9: Configure Environment Variables

```bash
cd /var/www/meebot.io

# Edit .env file
nano .env

# Update these values:
OPENAI_API_KEY=your_actual_openai_key_here
PORT=3000
CHAIN_ID=56

# Save: Ctrl+X, Y, Enter
```

---

### Step 10: Restart Application

```bash
pm2 restart meebot
pm2 save
```

---

### Step 11: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check application logs
pm2 logs meebot --lines 20

# Test API
curl https://meebot.io/api/health
```

**Expected output:**
```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "bot": "MeeBot AI",
  "web3": true,
  "chainId": 56
}
```

---

### Step 12: Run Automated QA Tests

```bash
cd /var/www/meebot.io
./scripts/test-production.sh
```

**Expected output:**
```
✅ ALL TESTS PASSED! 🎉
Production is READY for users!
```

---

### Step 13: Test in Browser

Open in your browser:
- https://meebot.io
- https://www.meebot.io

**Verify:**
- ✅ Page loads without errors
- ✅ SSL certificate valid (🔒 padlock icon)
- ✅ Dashboard displays correctly
- ✅ MeeBot chat widget works
- ✅ Price widget displays
- ✅ Navigation works

---

## 🎉 Deployment Complete!

If all steps passed, your application is now live at:
- **Website:** https://meebot.io
- **API:** https://meebot.io/api/health
- **Docs:** https://meebot.io/docs/jsdoc/index.html

---

## 📊 Post-Deployment Checklist

Use the complete QA checklist:
```bash
cat POST_DEPLOYMENT_QA.md
```

Or run automated tests:
```bash
./scripts/test-production.sh
```

---

## 🔧 Useful Commands

### Check Status
```bash
pm2 status
sudo systemctl status nginx
```

### View Logs
```bash
pm2 logs meebot
sudo tail -f /var/log/nginx/meebot.io.error.log
```

### Restart Services
```bash
pm2 restart meebot
sudo systemctl restart nginx
```

---

## 🐛 Troubleshooting

### If deployment script fails:
```bash
# Check logs
cat /var/log/nginx/error.log
pm2 logs meebot

# Try manual steps from DEPLOY_STEP_BY_STEP.md
```

### If SSL setup fails:
```bash
# Make sure DNS is resolving
nslookup meebot.io

# Try manual SSL setup
sudo certbot --nginx -d meebot.io -d www.meebot.io
```

### If application won't start:
```bash
# Check logs
pm2 logs meebot --lines 50

# Check .env file
cat .env

# Restart
pm2 restart meebot
```

---

## 📞 Need Help?

1. Check logs: `pm2 logs meebot`
2. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Review: `DEPLOY_STEP_BY_STEP.md`
4. Quick reference: `PRODUCTION_QUICK_REFERENCE.md`

---

## 🎯 Next Steps After Deployment

1. ✅ Run full QA tests: `./scripts/test-production.sh`
2. ✅ Complete QA checklist: `POST_DEPLOYMENT_QA.md`
3. ✅ Setup monitoring (PM2 Plus, New Relic)
4. ✅ Configure automated backups
5. ✅ Announce to team!

---

**Ready to deploy? Let's go! 🚀**

```bash
# Start deployment now:
ssh root@YOUR_SERVER_IP
cd /var/www/meebot.io
sudo ./scripts/deploy.sh
```

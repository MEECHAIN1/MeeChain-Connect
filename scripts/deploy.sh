#!/bin/bash

# ===== MeeBot.io Deployment Script =====
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting MeeBot.io Deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/meebot.io"
NGINX_CONF="/etc/nginx/sites-available/meebot.io"
DOMAIN="meebot.io"
EMAIL="your@email.com"  # Change this!

# Functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Step 2: Install Node.js
if ! command -v node &> /dev/null; then
    print_info "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

# Step 3: Install Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Step 4: Install Certbot
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_success "Certbot already installed"
fi

# Step 5: Install PM2
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

# Step 6: Create app directory
print_info "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
print_success "Directory created: $APP_DIR"

# Step 7: Copy files
print_info "Copying application files..."
# Note: You need to upload files manually or use git clone
print_info "Please upload your application files to $APP_DIR"
print_info "Or clone from git: cd $APP_DIR && git clone YOUR_REPO ."

# Step 8: Install dependencies
if [ -f "$APP_DIR/package.json" ]; then
    print_info "Installing npm dependencies..."
    cd $APP_DIR
    npm install --production
    print_success "Dependencies installed"
else
    print_info "Skipping npm install (no package.json found)"
fi

# Step 9: Setup environment
if [ ! -f "$APP_DIR/.env" ]; then
    print_info "Creating .env file..."
    if [ -f "$APP_DIR/.env.example" ]; then
        cp $APP_DIR/.env.example $APP_DIR/.env
        print_info "Please edit $APP_DIR/.env with your configuration"
    else
        print_error ".env.example not found"
    fi
fi

# Step 10: Configure Nginx
print_info "Configuring Nginx..."
if [ -f "$APP_DIR/nginx/meebot.io.conf" ]; then
    cp $APP_DIR/nginx/meebot.io.conf $NGINX_CONF
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
    print_success "Nginx configured"
else
    print_error "Nginx config not found at $APP_DIR/nginx/meebot.io.conf"
fi

# Step 11: Setup SSL
print_info "Setting up SSL certificate..."
read -p "Do you want to setup SSL now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL
    print_success "SSL certificate installed"
else
    print_info "Skipping SSL setup. Run manually: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# Step 12: Start application with PM2
print_info "Starting application with PM2..."
cd $APP_DIR
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start server.js --name meebot -i 2
fi
pm2 save
pm2 startup
print_success "Application started"

# Step 13: Configure firewall
print_info "Configuring firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable
print_success "Firewall configured"

# Step 14: Final checks
print_info "Running final checks..."
pm2 status
systemctl status nginx --no-pager

# Summary
echo ""
echo "========================================="
print_success "Deployment Complete!"
echo "========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Edit .env file: nano $APP_DIR/.env"
echo "2. Restart app: pm2 restart meebot"
echo "3. Check logs: pm2 logs meebot"
echo "4. Visit: https://$DOMAIN"
echo ""
echo "🔧 Useful Commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs meebot     - View logs"
echo "  pm2 restart meebot  - Restart app"
echo "  pm2 stop meebot     - Stop app"
echo "  nginx -t            - Test nginx config"
echo "  systemctl reload nginx - Reload nginx"
echo ""
print_success "Happy deploying! 🚀"

#!/bin/bash

# ===== MeeBot.io Fixed Deployment Script =====
# Handles common deployment errors

set -e  # Exit on error

echo "🚀 Starting MeeBot.io Fixed Deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/meebot.io"
NGINX_CONF="/etc/nginx/sites-available/meebot.io"
DOMAIN="meebot.io"
EMAIL="${DEPLOY_EMAIL:-admin@meebot.io}"  # Use env var or default

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
print_info "Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
print_success "Directories created"

# Step 7: Install dependencies
if [ -f "$APP_DIR/package.json" ]; then
    print_info "Installing npm dependencies..."
    cd $APP_DIR
    npm install --production
    print_success "Dependencies installed"
else
    print_info "Skipping npm install (no package.json found)"
fi

# Step 8: Setup environment
print_info "Setting up environment file..."
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        cp $APP_DIR/.env.example $APP_DIR/.env
        print_success ".env created from .env.example"
        print_info "⚠️  Please edit $APP_DIR/.env with your configuration"
    elif [ -f "$APP_DIR/.env.production" ]; then
        cp $APP_DIR/.env.production $APP_DIR/.env
        print_success ".env created from .env.production"
        print_info "⚠️  Please edit $APP_DIR/.env with your configuration"
    else
        print_info "Creating default .env file..."
        cat > $APP_DIR/.env << 'EOF'
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
DRPC_RPC_URL=https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
VITE_RPC_URL=https://bsc-mainnet.nodereal.io/v1/b08e185f1d8041d2b035dc0f4c747dd9
CHAIN_ID=56
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://meebot.io,https://www.meebot.io
EOF
        print_success "Default .env created"
        print_info "⚠️  Please edit $APP_DIR/.env with your OPENAI_API_KEY"
    fi
else
    print_success ".env already exists"
fi

# Step 9: Configure Nginx
print_info "Configuring Nginx..."
if [ -f "$APP_DIR/nginx/meebot.io.conf" ]; then
    cp $APP_DIR/nginx/meebot.io.conf $NGINX_CONF
    print_success "Nginx config copied from project"
elif [ ! -f "$NGINX_CONF" ]; then
    print_info "Creating default Nginx config..."
    cat > $NGINX_CONF << 'EOF'
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name meebot.io www.meebot.io;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary: serve app before SSL
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
    print_success "Default Nginx config created"
fi

# Create symlink
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test and reload
if nginx -t; then
    systemctl reload nginx
    print_success "Nginx configured and reloaded"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 10: Start application with PM2
print_info "Starting application with PM2..."
cd $APP_DIR

# Stop any existing instances
pm2 delete meebot 2>/dev/null || true

if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start server.js --name meebot -i 2
fi

pm2 save
print_success "Application started"

# Step 11: Setup PM2 startup
print_info "Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root
print_success "PM2 startup configured"

# Step 12: Configure firewall
print_info "Configuring firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable
print_success "Firewall configured"

# Step 13: Wait for app to start
print_info "Waiting for application to start..."
sleep 5

# Check if app is running
if pm2 list | grep -q "online"; then
    print_success "Application is running"
else
    print_error "Application failed to start"
    print_info "Check logs: pm2 logs meebot"
fi

# Step 14: Setup SSL
print_info "Setting up SSL certificate..."
print_info "Checking DNS resolution..."

if nslookup $DOMAIN | grep -q "Address:"; then
    print_success "DNS is resolving"
    
    read -p "Do you want to setup SSL now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Running Certbot..."
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
        
        if [ $? -eq 0 ]; then
            print_success "SSL certificate installed"
        else
            print_error "SSL setup failed"
            print_info "You can run it manually later:"
            print_info "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
        fi
    else
        print_info "Skipping SSL setup"
        print_info "Run manually: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    fi
else
    print_error "DNS not resolving yet"
    print_info "Wait for DNS propagation, then run:"
    print_info "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# Step 15: Final checks
print_info "Running final checks..."
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager | head -5
echo ""

# Summary
echo ""
echo "========================================="
print_success "Deployment Complete!"
echo "========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Edit .env file: nano $APP_DIR/.env"
echo "   - Add your OPENAI_API_KEY"
echo "2. Restart app: pm2 restart meebot"
echo "3. Check logs: pm2 logs meebot"
echo "4. Test API: curl http://localhost:3000/api/health"
if nslookup $DOMAIN | grep -q "Address:"; then
    echo "5. Visit: http://$DOMAIN (or https:// if SSL is setup)"
else
    echo "5. Wait for DNS propagation, then setup SSL"
fi
echo ""
echo "🔧 Useful Commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs meebot     - View logs"
echo "  pm2 restart meebot  - Restart app"
echo "  pm2 stop meebot     - Stop app"
echo "  nginx -t            - Test nginx config"
echo "  systemctl reload nginx - Reload nginx"
echo ""
echo "🐛 Troubleshooting:"
echo "  See: DEPLOYMENT_TROUBLESHOOTING.md"
echo ""
print_success "Happy deploying! 🚀"

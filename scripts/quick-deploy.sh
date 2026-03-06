#!/bin/bash

# ===== Quick Deploy Script for Updates =====
# Use this after initial setup to deploy updates

set -e

echo "🔄 Deploying updates to MeeBot.io..."

APP_DIR="/var/www/meebot.io"
cd $APP_DIR

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull origin main
fi

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Restart application
echo "🔄 Restarting application..."
pm2 restart meebot

# Show status
echo "✅ Deployment complete!"
pm2 status
pm2 logs meebot --lines 20

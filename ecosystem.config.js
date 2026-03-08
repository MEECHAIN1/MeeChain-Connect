// PM2 Ecosystem Configuration for MeeBot.io
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'meebot',
    script: './server.js',
    
    // Instances
    instances: 2,
    exec_mode: 'cluster',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto restart
    watch: false,
    max_memory_restart: '500M',
    
    // Restart behavior
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Source map support
    source_map_support: true,
    
    // Advanced features
    instance_var: 'INSTANCE_ID',
    
    // Cron restart (optional - restart every day at 3 AM)
    cron_restart: '0 3 * * *',
    
    // Post-deploy hooks
    post_update: ['npm install', 'echo Deployment complete']
  }],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPO',
      path: '/var/www/meebot.io',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git'
    }
  }
};

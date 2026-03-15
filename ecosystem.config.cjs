module.exports = {
  apps: [
    {
      name: 'meechain-dashboard',
      script: 'server.js',
      cwd: '/home/user/webapp',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/user/webapp/logs/pm2-error.log',
      out_file: '/home/user/webapp/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

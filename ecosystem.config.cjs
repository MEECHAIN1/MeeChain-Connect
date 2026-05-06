const path = require('path');
const fs = require('fs');

const appRoot = __dirname;
const logsDir = path.join(appRoot, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

module.exports = {
  apps: [
    {
      name: 'meechain-dashboard',
      script: 'server.js',
      cwd: appRoot,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: path.join(logsDir, 'pm2-error.log'),
      out_file: path.join(logsDir, 'pm2-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};

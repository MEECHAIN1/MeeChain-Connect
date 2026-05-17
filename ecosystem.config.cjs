module.exports = {
  apps: [
    {
      name: "meechain-dashboard",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
      },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "meechain-dashboard",
      script: "./server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      time: true,
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};

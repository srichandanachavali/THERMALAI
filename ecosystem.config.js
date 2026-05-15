module.exports = {
  apps: [
    {
      name: "thermalai-backend",
      script: "server.js",
      cwd: "./backend",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "thermalai-ml",
      script: "app.py",
      interpreter: "python",
      cwd: "./ml-model",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "15s",
      restart_delay: 5000,
    },
  ],
};

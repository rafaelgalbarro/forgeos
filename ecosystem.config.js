/**
 * PM2 ecosystem — ForgeOS app + cycle scheduler + external watchdog.
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only forgeos-scheduler
 *   pm2 start ecosystem.config.js --only forgeos-watchdog
 *
 * Export IBKR_INTERNAL_API_KEY in the host shell before `pm2 start` (do not commit secrets).
 * Example: $env:IBKR_INTERNAL_API_KEY="…"; pm2 start ecosystem.config.js --only forgeos-scheduler
 */
module.exports = {
  apps: [
    {
      name: "forgeos",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "forgeos-scheduler",
      script: "./scripts/cycle-scheduler.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 50,
      env: {
        NODE_ENV: "production",
        FORGEOS_BASE_URL: "http://localhost:3000",
        // Inherited from host at `pm2 start` time — never hardcode in git
        IBKR_INTERNAL_API_KEY: process.env.IBKR_INTERNAL_API_KEY || "",
      },
    },
    {
      name: "forgeos-watchdog",
      script: "./scripts/watchdog.sh",
      interpreter: "bash",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 50,
      env: {
        FORGEOS_HEALTH_URL: "http://localhost:3000/api/health",
        IBKR_SERVICE_URL: "http://localhost:8002",
        IBKR_INTERNAL_API_KEY: process.env.IBKR_INTERNAL_API_KEY || "",
        WATCHDOG_LOG: "/var/log/forgeos-watchdog.log",
        WATCHDOG_SLEEP_SEC: "300",
        PM2_APP_NAME: "forgeos",
      },
    },
  ],
};

/**
 * PM2 ecosystem — ForgeOS app + external watchdog.
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only forgeos-watchdog
 *
 * Export IBKR_INTERNAL_API_KEY before starting (do not commit secrets).
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
      name: "forgeos-watchdog",
      script: "./scripts/watchdog.sh",
      interpreter: "bash",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 50,
      env: {
        FORGEOS_HEALTH_URL: "http://localhost:3000/api/health",
        IBKR_SERVICE_URL: "http://localhost:8002",
        // Set IBKR_INTERNAL_API_KEY in the process environment / PM2 ecosystem secrets
        WATCHDOG_LOG: "/var/log/forgeos-watchdog.log",
        WATCHDOG_SLEEP_SEC: "300",
        PM2_APP_NAME: "forgeos",
      },
    },
  ],
};

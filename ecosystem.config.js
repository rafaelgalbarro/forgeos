/**
 * PM2 ecosystem — ForgeOS app + cycle scheduler + crypto engine + external watchdog.
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only forgeos-scheduler
 *   pm2 start ecosystem.config.js --only forgeos-crypto-engine
 *   pm2 start ecosystem.config.js --only forgeos-watchdog
 *
 * Export IBKR_INTERNAL_API_KEY / Kraken keys in the host shell or .env.local
 * before `pm2 start` (do not commit secrets).
 * Example: $env:IBKR_INTERNAL_API_KEY="…"; pm2 start ecosystem.config.js --only forgeos-scheduler
 */
const path = require("node:path");
const fs = require("node:fs");

const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, "logs");
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  /* ignore */
}

module.exports = {
  apps: [
    {
      name: "forgeos",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3000",
      cwd: ROOT,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Kraken WS/exits/analysis owned by forgeos-crypto-engine
        CRYPTO_ENGINE_EXTERNAL: "1",
      },
    },
    {
      name: "forgeos-scheduler",
      script: "./scripts/cycle-scheduler.js",
      cwd: ROOT,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 50,
      env: {
        NODE_ENV: "production",
        FORGEOS_BASE_URL: "http://localhost:3000",
        // Inherited from host at `pm2 start` time — never hardcode in git
        IBKR_INTERNAL_API_KEY: process.env.IBKR_INTERNAL_API_KEY || "",
        // Scheduler still POSTs /crypto; route returns heartbeat when external
        CRYPTO_ENGINE_EXTERNAL: "1",
      },
    },
    {
      name: "forgeos-crypto-engine",
      script: "./scripts/crypto-engine.cjs",
      cwd: ROOT,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 100,
      min_uptime: "10s",
      restart_delay: 5_000,
      kill_timeout: 10_000,
      out_file: path.join(LOG_DIR, "forgeos-crypto-engine-out.log"),
      error_file: path.join(LOG_DIR, "forgeos-crypto-engine-error.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        CRYPTO_BROKER: "kraken",
        CRYPTO_ENGINE_ROLE: "standalone",
        CRYPTO_ANALYSIS_INTERVAL_MS: "60000",
        // Keys loaded from .env.local inside crypto-engine.mjs
      },
    },
    {
      name: "forgeos-watchdog",
      script: "./scripts/watchdog.sh",
      interpreter: "bash",
      cwd: ROOT,
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
    {
      // Daily 03:00 Europe/Madrid — crypto strategy backtest + auto-degrade
      name: "forgeos-crypto-backtest",
      script: "./scripts/crypto-backtest-cron.cjs",
      cwd: ROOT,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      env: {
        NODE_ENV: "production",
        FORGEOS_ROOT: ROOT,
        CRYPTO_BACKTEST_TZ: "Europe/Madrid",
        CRYPTO_BACKTEST_HOUR: "3",
      },
    },
  ],
};

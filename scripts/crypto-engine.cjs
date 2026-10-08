/**
 * PM2 entry for forgeos-crypto-engine (CommonJS).
 * Loads .env.local, stubs server-only, runs TypeScript via `node --import tsx`.
 *
 * Usage:
 *   node scripts/crypto-engine.cjs
 *   pm2 start ecosystem.config.js --only forgeos-crypto-engine
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const text = fs.readFileSync(filePath, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !(process.env[key] ?? "").trim()) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn(
      "[CryptoEngine] env file:",
      filePath,
      err instanceof Error ? err.message : err,
    );
  }
}

const root = path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || root;
const envCandidates = [
  process.env.FORGEOS_ENV_FILE,
  "/var/www/forgeos/.env.local",
  path.join(root, ".env.local"),
].filter(Boolean);

for (const candidate of envCandidates) {
  loadEnvFile(candidate);
}

process.env.CRYPTO_ENGINE_ROLE = "standalone";
process.env.CRYPTO_BROKER = (process.env.CRYPTO_BROKER || "kraken").trim() || "kraken";
process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || root;
process.chdir(root);
console.log(`[CryptoEngine] FORGEOS_ROOT=${process.env.FORGEOS_ROOT}`);

const stub = path.join(__dirname, "stub-server-only.cjs");
const mainTs = path.join(__dirname, "crypto-engine-main.ts");

console.log(
  `[CryptoEngine] boot pid=${process.pid} broker=${process.env.CRYPTO_BROKER} analysis=${process.env.CRYPTO_ANALYSIS_INTERVAL_MS || 60000}ms`,
);

const child = spawn(
  process.execPath,
  ["--require", stub, "--import", "tsx", mainTs],
  {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[CryptoEngine] killed by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error("[CryptoEngine] spawn error:", err.message);
  process.exit(1);
});

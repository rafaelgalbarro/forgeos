/**
 * PM2 entry for forgeos-eodhd-us-ws (CommonJS).
 * Loads .env.local, stubs server-only, runs TypeScript via `node --import tsx`.
 *
 * Usage:
 *   node scripts/eodhd-us-ws.cjs
 *   pm2 start ecosystem.config.js --only forgeos-eodhd-us-ws
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
      "[EODHD/WS/Engine] env file:",
      filePath,
      err instanceof Error ? err.message : err,
    );
  }
}

const root = path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || root;

if (typeof globalThis.WebSocket === "undefined") {
  try {
    const undici = require("node:undici");
    if (undici.WebSocket) globalThis.WebSocket = undici.WebSocket;
  } catch {
    /* Node without undici WebSocket */
  }
}

const envCandidates = [
  process.env.FORGEOS_ENV_FILE,
  "/var/www/forgeos/.env.local",
  path.join(root, ".env.local"),
].filter(Boolean);

for (const candidate of envCandidates) {
  loadEnvFile(candidate);
}

process.env.EODHD_WS_ROLE = "standalone";
process.chdir(root);
console.log(`[EODHD/WS/Engine] FORGEOS_ROOT=${process.env.FORGEOS_ROOT}`);

const stub = path.join(__dirname, "stub-server-only.cjs");
const mainTs = path.join(__dirname, "eodhd-us-ws-main.ts");

console.log(`[EODHD/WS/Engine] boot wrapper pid=${process.pid}`);

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
    console.error(`[EODHD/WS/Engine] killed by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  console.error("[EODHD/WS/Engine] spawn error:", err.message);
  process.exit(1);
});

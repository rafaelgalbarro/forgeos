/**
 * PM2 entry for forgeos-forex-bot (CommonJS).
 * Loads .env.local, stubs server-only, runs TypeScript via `node --import tsx`.
 *
 * Usage:
 *   node scripts/forex-bot.cjs
 *   pm2 start ecosystem.config.js --only forgeos-forex-bot
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
      "[ForexBot] env file:",
      filePath,
      err instanceof Error ? err.message : err,
    );
  }
}

const os = require("node:os");
const root = path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || root;

if (!(process.env.FORGEOS_CACHE_DIR ?? "").trim()) {
  const local =
    process.env.LOCALAPPDATA?.trim() ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local")
      : "");
  if (local) {
    process.env.FORGEOS_CACHE_DIR = path.join(
      local,
      "forgeos-node",
      ".forgeos",
      "cache",
    );
  }
}

if (typeof globalThis.WebSocket === "undefined") {
  try {
    const undici = require("node:undici");
    if (undici.WebSocket) globalThis.WebSocket = undici.WebSocket;
  } catch {
    /* Node without undici WebSocket — REST fallback */
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

process.env.FORGEOS_ROOT = process.env.FORGEOS_ROOT || root;
process.chdir(root);

const stub = path.join(__dirname, "stub-server-only.cjs");
const ENTRIES = { backtest: "forex-backtest.ts", optimize: "forex-optimize.ts", playbook: "forex-playbook.ts", methods: "forex-methods.ts" };
const mainTs = path.join(__dirname, ENTRIES[process.argv[2]] || "forex-bot-main.ts");
console.log(`[ForexBot] boot pid=${process.pid} entry=${path.basename(mainTs)} mode=${process.env.FOREX_BOT_MODE || "shadow"}`);

const child = spawn(process.execPath, ["--require", stub, "--import", "tsx", mainTs, ...process.argv.slice(3)], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[ForexBot] killed by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
child.on("error", (err) => {
  console.error("[ForexBot] spawn error:", err.message);
  process.exit(1);
});

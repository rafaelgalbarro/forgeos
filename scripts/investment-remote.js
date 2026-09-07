#!/usr/bin/env node
/** ForgeOS Investment + Cloudflare tunnel (no extra deps). */
const { spawn } = require("child_process");
const path = require("path");
const { ROOT, log, killChild, loadEnvLocal } = require("./_utils");

const node = process.execPath;
let shuttingDown = false;
const children = [];

loadEnvLocal();

function spawnScript(script) {
  const child = spawn(node, [path.join(ROOT, "scripts", script)], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
    windowsHide: true,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (shuttingDown) return;
    if (script === "run-tunnel.js") {
      log(
        `⚠ Túnel Cloudflare no arrancó (code=${code}). Completa scripts/setup-tunnel.ps1 y CLOUDFLARE_TUNNEL_TOKEN en .env.local`,
      );
      log("  → El servidor local sigue en http://localhost:3000/investment");
      return;
    }
    log(`⚠ ${script} terminó (code=${code})`);
    shutdown(code ?? 1);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) killChild(c);
  setTimeout(() => process.exit(code), 400);
}

log("\n=== ForgeOS Investment Remote ===\n");
spawnScript("start-investment.js");
spawnScript("run-tunnel.js");

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

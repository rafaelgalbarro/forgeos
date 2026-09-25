#!/usr/bin/env node
/** Runs cloudflared tunnel (token or named tunnel forgeos). */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ROOT, log, isWindows, loadEnvLocal } = require("./_utils");

loadEnvLocal();

const bin = path.join(ROOT, ".forgeos", "bin", isWindows() ? "cloudflared.exe" : "cloudflared");
const token = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim();

if (!fs.existsSync(bin)) {
  log("✗ cloudflared no encontrado — ejecuta scripts/setup-tunnel.ps1 primero");
  process.exit(1);
}

if (!token) {
  log("⚠ CLOUDFLARE_TUNNEL_TOKEN vacío — ejecuta setup-tunnel.ps1 y tunnel login primero");
  log("  Pasos: tunnel login → tunnel create forgeos → tunnel token forgeos → .env.local");
  process.exit(1);
}

const args = ["tunnel", "run", "--token", token];

log(`▶ cloudflared ${args.join(" ")}`);
const child = spawn(bin, args, { stdio: "inherit", shell: false, cwd: ROOT });
child.on("exit", (code) => process.exit(code ?? 0));

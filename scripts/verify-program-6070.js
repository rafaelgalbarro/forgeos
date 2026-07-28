#!/usr/bin/env node
/**
 * PROGRAM 6070 — sequential verification (never parallel build+dev).
 * architecture:check → typecheck → test → build (optional via --with-build)
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { ROOT, log, logStep } = require("./_utils");

const nodeBin = process.execPath;
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, command, args) {
  logStep(label);
  const res = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (res.status !== 0) {
    log(`FAIL: ${label} exit=${res.status}`);
    process.exit(res.status || 1);
  }
  log(`OK: ${label}`);
}

const withBuild = process.argv.includes("--with-build");

run("architecture:check", npmCmd, ["run", "architecture:check:6070"]);
run("typecheck", npmCmd, ["run", "typecheck"]);
run("test", npmCmd, ["run", "test:migration-6070"]);

if (withBuild) {
  run("build", npmCmd, ["run", "build"]);
} else {
  log("Skipping build (pass --with-build to include). Smoke flags-off assumed via defaults.");
}

log("\nPROGRAM 6070 verification sequence completed.");

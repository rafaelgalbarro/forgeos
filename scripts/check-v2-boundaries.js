#!/usr/bin/env node
/**
 * PROGRAM 6085 — check V2 boundaries (canonical redefinition + architecture checks).
 */
const { spawnSync } = require("child_process");
const { ROOT } = require("./_utils");

function run(name, cmd, args) {
  console.log(`\n▸ ${name}`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    env: process.env,
    timeout: 300000,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    console.error(`✗ ${name} failed (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

run("canonical-redefinition", "node", ["scripts/check-canonical-redefinition.js"]);
run("architecture:check", "npm", ["run", "architecture:check"]);
console.log("\n✓ V2 boundaries OK\n");

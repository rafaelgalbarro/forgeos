#!/usr/bin/env node
/**
 * PROGRAM 6085 — Sequential V2 integration validation.
 * NEVER parallelizes clean/build/dev. Propagates first error.
 *
 * Flags:
 *   --keep-dev-running
 *   --skip-dev          (run cert + live path without HTTP smoke)
 *   --skip-build
 */
const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ROOT, log, logStep } = require("./_utils");
const {
  acquireExclusiveLock,
  releaseExclusiveLock,
  heartbeatExclusiveLock,
} = require("./lib/exclusive-execution-lock");
const { cleanupRegisteredForgeosProcesses } = require("./lib/process-cleanup");
const { registerProcess, unregisterProcess } = require("./lib/process-registry");
const { registerPort, unregisterPort, isPortFree } = require("./lib/port-registry");

const args = new Set(process.argv.slice(2));
const keepDev = args.has("--keep-dev-running");
const skipDev = args.has("--skip-dev");
const skipBuild = args.has("--skip-build");

const evidence = {
  program: "6085",
  startedAt: new Date().toISOString(),
  steps: [],
  keepDev,
  skipDev,
  skipBuild,
};

function record(step, status, detail) {
  evidence.steps.push({ step, status, detail, at: new Date().toISOString() });
  log(`  [${status}] ${step}${detail ? ` — ${detail}` : ""}`);
}

function runStep(name, command, cmdArgs, opts = {}) {
  logStep(name);
  heartbeatExclusiveLock();
  const started = Date.now();
  const result = spawnSync(command, cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...opts.env },
    timeout: opts.timeout ?? 600000,
  });
  const detail = ((result.stderr || "") + "\n" + (result.stdout || "")).trim().slice(0, 2500);
  if (result.status !== 0) {
    record(name, "FAIL", `exit=${result.status}; ${detail.slice(0, 400)}`);
    throw new Error(`Step failed: ${name} (exit ${result.status})`);
  }
  record(name, "PASS", `${Date.now() - started}ms`);
  return result;
}

function writeEvidence(verdict) {
  evidence.endedAt = new Date().toISOString();
  evidence.verdict = verdict;
  const dir = path.join(ROOT, "artifacts", "v2-certification");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "sequential-validation.json"), JSON.stringify(evidence, null, 2));
  const docsDir = path.join(ROOT, "docs", "v2", "integration-closure");
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(
    path.join(docsDir, "sequential-pipeline.md"),
    `# Sequential Pipeline Evidence\n\n\`\`\`json\n${JSON.stringify(evidence, null, 2)}\n\`\`\`\n`,
  );
}

async function waitReady(base) {
  runStep("wait-for-ready", "node", [
    "scripts/wait-for-forgeos-ready.js",
    "--base",
    base,
    "--timeout",
    "180000",
  ]);
}

function startDevRegistered() {
  const PORT = 3000;
  if (!isPortFree(PORT)) {
    throw new Error(`Port ${PORT} not free before starting dev`);
  }
  const child = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd: ROOT,
    shell: true,
    stdio: "pipe",
    env: { ...process.env },
    detached: false,
  });
  const register = (pid) => {
    if (!pid) return;
    registerProcess({
      pid,
      command: "next dev (validate:v2-integration)",
      role: "dev-server",
      port: PORT,
      owner: "forgeos",
    });
    registerPort({ port: PORT, pid, role: "dev-server" });
  };
  child.on("spawn", () => register(child.pid));
  if (child.pid) register(child.pid);
  return child;
}

function stopDev(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      process.kill(child.pid, "SIGTERM");
    }
  } catch {
    /* ignore */
  }
  unregisterProcess(child.pid);
  unregisterPort(3000);
}

async function main() {
  const lock = acquireExclusiveLock({
    owner: "validate:v2-integration",
    command: "npm run validate:v2-integration",
  });
  if (!lock.ok) {
    console.error(lock.error);
    process.exit(1);
  }

  let devChild = null;
  try {
    logStep("kill registered ForgeOS processes");
    const cleaned = cleanupRegisteredForgeosProcesses();
    if (!cleaned.ok) {
      throw new Error(`Required ports stuck: ${cleaned.stuckRequired.join(", ")}`);
    }
    record("kill:ports", "PASS", `killed=${cleaned.killed}`);

    runStep("clean", "npm", ["run", "clean"]);
    runStep("check:v2-boundaries", "npm", ["run", "check:v2-boundaries"]);

    if (!skipBuild) {
      runStep("typecheck", "npm", ["run", "typecheck"], { timeout: 300000 });
      runStep("test", "npm", ["run", "test"], { timeout: 300000 });
      runStep("build", "npm", ["run", "build"], { timeout: 600000 });
    } else {
      record("build", "SKIP", "--skip-build");
    }

    // Live integration path (composition) before / without relying solely on HTTP
    runStep(
      "live-integration-atlas",
      "npx",
      ["--yes", "tsx", "scripts/run-atlas-integration.ts"],
      { timeout: 180000 },
    );

    if (!skipDev) {
      // After production build, .next is production — clean before next dev
      runStep("clean-before-dev", "npm", ["run", "clean"]);
      logStep("start dev");
      devChild = startDevRegistered();
      record("start-dev", "PASS", `pid=${devChild.pid}`);
      await waitReady("http://127.0.0.1:3000");

      const smoke = spawnSync(
        "node",
        ["scripts/run-v2-smoke-tests.js", "--base", "http://127.0.0.1:3000"],
        { cwd: ROOT, encoding: "utf8", shell: true, timeout: 180000 },
      );
      const smokeDetail = ((smoke.stderr || "") + smoke.stdout || "").slice(0, 1500);
      if (smoke.status === 0) {
        record("smoke", "PASS", smokeDetail.slice(0, 200));
      } else if (smoke.status === 2) {
        record("smoke", "BLOCKED", smokeDetail.slice(0, 400));
      } else {
        record("smoke", "FAIL", smokeDetail.slice(0, 400));
        throw new Error("Smoke tests failed");
      }
    } else {
      record("smoke", "SKIP", "--skip-dev");
    }

    runStep("lineage", "node", ["scripts/check-v2-lineage.js"]);
    runStep("certification", "node", ["scripts/run-v2-certification.js", "--skip-build"]);

    writeEvidence("INTEGRATION_PIPELINE_OK");
    if (!keepDev && devChild) stopDev(devChild);
    releaseExclusiveLock();
    console.log("\n✓ validate:v2-integration completed\n");
    process.exit(0);
  } catch (err) {
    record("pipeline", "FAIL", err instanceof Error ? err.message : String(err));
    writeEvidence("INTEGRATION_PIPELINE_FAILED");
    if (devChild && !keepDev) stopDev(devChild);
    releaseExclusiveLock();
    console.error(err);
    process.exit(1);
  }
}

main();

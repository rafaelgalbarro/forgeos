/**
 * PROGRAM 6085 — V2 certification (real checks; structured JSON; nonzero on fail).
 *
 * Flags:
 *   --skip-build     skip kill/clean/typecheck/test/build (use after sequential pipeline)
 *   --with-tsx       legacy flag (always uses tsx for live path)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_utils");

const CERT_DIR = path.join(ROOT, "docs", "architecture-v2", "certification");
const ART_DIR = path.join(ROOT, "artifacts", "v2-certification");
const RESULTS_PATH = path.join(CERT_DIR, "certification-results.json");
const LATEST_PATH = path.join(ART_DIR, "latest.json");

const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");

function ensureDirs() {
  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.mkdirSync(ART_DIR, { recursive: true });
}

function run(name, command, cmdArgs, opts = {}) {
  const started = Date.now();
  const result = spawnSync(command, cmdArgs, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    shell: true,
    timeout: opts.timeout ?? 600000,
  });
  return {
    id: name,
    command: [command, ...cmdArgs].join(" "),
    exitCode: result.status,
    status: result.status === 0 ? "PASS" : result.status === 2 ? "BLOCKED" : "FAIL",
    durationMs: Date.now() - started,
    notes: ((result.stderr || "") + "\n" + (result.stdout || "")).trim().slice(0, 2500),
  };
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function main() {
  ensureDirs();
  const started = Date.now();
  const checks = [];
  const gaps = [];

  if (!skipBuild) {
    checks.push(run("kill_ports", "npm", ["run", "kill:ports"]));
    checks.push(run("clean", "npm", ["run", "clean"]));
    checks.push(run("boundaries", "npm", ["run", "check:v2-boundaries"]));
    checks.push(run("typecheck", "npm", ["run", "typecheck"], { timeout: 300000 }));
    checks.push(run("test", "npm", ["run", "test"], { timeout: 300000 }));
    checks.push(run("build", "npm", ["run", "build"], { timeout: 600000 }));
  } else {
    checks.push({
      id: "build_pipeline",
      status: "SKIP",
      exitCode: 0,
      notes: "--skip-build",
      durationMs: 0,
    });
  }

  // Live ATLAS integration (real commands/queries/workflow/persistence)
  const live = run(
    "atlas_live_integration",
    "npx",
    ["--yes", "tsx", "scripts/run-atlas-integration.ts"],
    { timeout: 180000 },
  );
  checks.push(live);
  const atlas = loadJson(path.join(ART_DIR, "atlas-clubs-run.json"));

  // Lineage
  const lineage = run("lineage_check", "node", ["scripts/check-v2-lineage.js"]);
  checks.push(lineage);

  // Composition / health modules exist
  const healthFiles = [
    "app/api/health/route.ts",
    "app/api/ready/route.ts",
    "app/api/v2/health/route.ts",
    "src/core/composition/root.ts",
    "scripts/lib/exclusive-execution-lock.js",
    "scripts/lib/process-registry.js",
    "scripts/lib/port-registry.js",
  ];
  for (const f of healthFiles) {
    const ok = fs.existsSync(path.join(ROOT, f));
    checks.push({
      id: `file:${f}`,
      status: ok ? "PASS" : "FAIL",
      exitCode: ok ? 0 : 1,
      durationMs: 0,
      notes: ok ? "present" : "missing",
    });
  }

  // Evaluate
  if (atlas) {
    for (const c of atlas.checks || []) {
      checks.push({
        id: `atlas:${c.id}`,
        status: c.status,
        exitCode: c.status === "PASS" ? 0 : 1,
        durationMs: 0,
        notes: c.detail,
      });
    }
    for (const g of atlas.gaps || []) {
      gaps.push(g);
    }
  } else {
    gaps.push({
      severity: "P0",
      id: "atlas_evidence_missing",
      message: "atlas-clubs-run.json not produced",
    });
  }

  const hardFail = checks.some((c) => c.status === "FAIL");
  const p0p1 = gaps.filter((g) => g.severity === "P0" || g.severity === "P1");
  const blockedOnly = !hardFail && (checks.some((c) => c.status === "BLOCKED") || p0p1.length > 0);

  let status = "CERTIFIED";
  if (hardFail) status = "FAILED";
  else if (blockedOnly) status = "BLOCKED";

  // Honest: PLAN_ONLY preview is P2 — does not block CERTIFIED if everything else passes
  const declaration =
    status === "CERTIFIED"
      ? "FORGEOS V2 — END-TO-END CERTIFIED"
      : status === "BLOCKED"
        ? "FORGEOS V2 — CERTIFICATION BLOCKED"
        : "FORGEOS V2 — CERTIFICATION FAILED";

  const payload = {
    program: "6085",
    title: "ForgeOS V2 Integration Closure Certification",
    status,
    declaration,
    certified: status === "CERTIFIED",
    missionId: atlas?.missionId ?? null,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    checks,
    gaps,
    evidence: {
      atlas: atlas ? path.relative(ROOT, path.join(ART_DIR, "atlas-clubs-run.json")) : null,
      lineage: path.relative(ROOT, path.join(ART_DIR, "lineage-check.json")),
      previewClassification: atlas?.previewClassification ?? null,
      deploymentStatus: atlas?.deploymentStatus ?? null,
      releaseId: atlas?.releaseId ?? null,
      flags: atlas?.evidence?.flags ?? null,
    },
  };

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(LATEST_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${path.relative(ROOT, LATEST_PATH)}`);
  console.log(`Declaration: ${declaration}`);
  console.log(`status=${status}`);
  process.exit(status === "CERTIFIED" ? 0 : 1);
}

main();

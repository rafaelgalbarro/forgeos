#!/usr/bin/env node
/**
 * PROGRAM 6085 — V2 lineage integrity check.
 * Exit nonzero on critical errors.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_utils");

const STORE = path.join(ROOT, ".forgeos", "v2-store", "application-state.json");

function loadStore() {
  if (!fs.existsSync(STORE)) {
    return { missing: true };
  }
  return JSON.parse(fs.readFileSync(STORE, "utf8").replace(/^\uFEFF/, ""));
}

function main() {
  const critical = [];
  const warnings = [];
  const store = loadStore();

  if (store.missing) {
    // Try running integration to produce store if empty — structural check only
    warnings.push("store_missing_before_check");
  } else {
    const missions = store.missions || {};
    const lineage = store.lineage || {};
    const delivery = store.deliverySnapshots || {};
    const workflows = store.workflowPlans || {};

    for (const missionId of Object.keys(missions)) {
      if (!lineage[missionId]) {
        critical.push({ code: "missing_lineage", missionId });
      }
      if (!workflows[missionId]) {
        critical.push({ code: "missing_workflow", missionId });
      }
      const snap = delivery[missionId];
      if (!snap) {
        critical.push({ code: "missing_delivery_snapshot", missionId });
        continue;
      }
      const artifacts = snap.artifacts || [];
      const outputs = snap.outputs || [];
      const codebases = snap.codebases || [];
      const releases = snap.releases || [];
      const deployments = snap.deployments || [];

      for (const o of outputs) {
        for (const aid of o.sourceArtifactIds || []) {
          if (!artifacts.some((a) => a.artifactId === aid)) {
            critical.push({ code: "output_without_artifact", missionId, outputId: o.outputId, aid });
          }
        }
      }
      for (const c of codebases) {
        if (c.outputId && !outputs.some((o) => o.outputId === c.outputId)) {
          critical.push({
            code: "project_without_source_output",
            missionId,
            codebaseId: c.codebaseId,
          });
        }
      }
      for (const d of deployments) {
        if (!releases.some((r) => r.releaseId === d.releaseId)) {
          critical.push({
            code: "deployment_without_release",
            missionId,
            deploymentId: d.deploymentId,
          });
        }
        if (d.status === "DEPLOYED" && d.dryRun) {
          critical.push({ code: "deployed_on_dry_run", missionId, deploymentId: d.deploymentId });
        }
      }
      for (const r of releases) {
        if (r.mutable === true) {
          critical.push({ code: "release_mutable", missionId, releaseId: r.releaseId });
        }
      }
    }
  }

  // Also run TS checker when tsx available for deeper graph walk
  const tsCheck = path.join(ROOT, "scripts", "check-v2-lineage-deep.ts");
  if (fs.existsSync(tsCheck)) {
    const r = spawnSync(
      "npx",
      ["--yes", "tsx", tsCheck],
      { cwd: ROOT, encoding: "utf8", shell: true, timeout: 120000 },
    );
    if (r.status !== 0) {
      critical.push({
        code: "deep_lineage_failed",
        detail: ((r.stderr || "") + (r.stdout || "")).slice(0, 1500),
      });
    }
  }

  const result = {
    ok: critical.length === 0,
    critical,
    warnings,
    storePath: STORE,
    ranAt: new Date().toISOString(),
  };
  const outDir = path.join(ROOT, "artifacts", "v2-certification");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "lineage-check.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main();

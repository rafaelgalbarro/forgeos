/**
 * Deep lineage integrity (PROGRAM 6085).
 * Prefer structural checks on persisted snapshots; avoid brittle path APIs.
 */
import fs from "fs";
import path from "path";
import { loadFileStore } from "../src/core/composition/file-store";

const ROOT = path.resolve(__dirname, "..");
const store = loadFileStore();
const critical: string[] = [];

for (const [missionId, snapUnknown] of store.deliverySnapshots.entries()) {
  const snap = snapUnknown as {
    artifacts?: Array<{ artifactId: string }>;
    outputs?: Array<{ outputId: string; sourceArtifactIds?: string[] }>;
    codebases?: Array<{ codebaseId: string; outputId?: string }>;
    releases?: Array<{ releaseId: string }>;
    deployments?: Array<{ deploymentId: string; releaseId: string; dryRun?: boolean; status?: string }>;
  };
  if (!snap?.artifacts?.length) {
    critical.push(`${missionId}: no artifacts`);
    continue;
  }
  if (!store.lineage.get(missionId)) {
    critical.push(`${missionId}: lineage missing`);
  }
  for (const o of snap.outputs || []) {
    for (const aid of o.sourceArtifactIds || []) {
      if (!(snap.artifacts || []).some((a) => a.artifactId === aid)) {
        critical.push(`${missionId}: output ${o.outputId} refs missing artifact ${aid}`);
      }
    }
  }
  for (const c of snap.codebases || []) {
    if (c.outputId && !(snap.outputs || []).some((o) => o.outputId === c.outputId)) {
      critical.push(`${missionId}: codebase ${c.codebaseId} without output`);
    }
  }
  for (const d of snap.deployments || []) {
    if (!(snap.releases || []).some((r) => r.releaseId === d.releaseId)) {
      critical.push(`${missionId}: deployment without release`);
    }
    if (d.status === "DEPLOYED" && d.dryRun) {
      critical.push(`${missionId}: DEPLOYED on dryRun`);
    }
  }
}

const result = { ok: critical.length === 0, critical };
fs.mkdirSync(path.join(ROOT, "artifacts", "v2-certification"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "artifacts", "v2-certification", "lineage-deep.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

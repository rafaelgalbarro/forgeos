/**
 * PROGRAM 6050 — Version Graph / Lineage
 * Answers: which artifacts → outputs → codebases → builds → previews → releases → deployments
 */

import type {
  CanonicalArtifact,
  CanonicalOutput,
  CanonicalCodebase,
  CanonicalBuild,
  CanonicalPreview,
  CanonicalRelease,
  CanonicalDeployment,
  VersionLineage,
  LineageNode,
} from "../types";

export interface LineageStores {
  artifacts: CanonicalArtifact[];
  outputs: CanonicalOutput[];
  codebases: CanonicalCodebase[];
  builds: CanonicalBuild[];
  previews: CanonicalPreview[];
  releases: CanonicalRelease[];
  deployments: CanonicalDeployment[];
}

export function buildVersionLineage(missionId: string, stores: LineageStores): VersionLineage {
  const artifacts: LineageNode[] = stores.artifacts.map((a) => ({
    stage: "Artifact",
    id: a.artifactId,
    version: a.version,
    label: a.title,
    status: a.status,
  }));
  const outputs: LineageNode[] = stores.outputs.map((o) => ({
    stage: "Output",
    id: o.outputId,
    version: o.version,
    label: o.title,
    status: o.status,
  }));
  const codebases: LineageNode[] = stores.codebases.map((c) => ({
    stage: "Codebase",
    id: c.codebaseId,
    version: c.version,
    label: c.name,
    status: c.status,
  }));
  const builds: LineageNode[] = stores.builds.map((b) => ({
    stage: "Build",
    id: b.buildId,
    version: b.codebaseVersion,
    label: `${b.environment}:${b.result}`,
    status: b.result,
  }));
  const previews: LineageNode[] = stores.previews.map((p) => ({
    stage: "Preview",
    id: p.previewId,
    label: p.type,
    status: p.status,
  }));
  const releases: LineageNode[] = stores.releases.map((r) => ({
    stage: "Release",
    id: r.releaseId,
    version: r.version,
    status: r.status,
  }));
  const deployments: LineageNode[] = stores.deployments.map((d) => ({
    stage: "Deployment",
    id: d.deploymentId,
    label: d.environment,
    status: d.status,
  }));

  const edges: VersionLineage["edges"] = [];

  for (const o of stores.outputs) {
    for (const artId of o.sourceArtifactIds) {
      edges.push({ from: artId, to: o.outputId, relation: "artifact→output" });
    }
  }
  for (const c of stores.codebases) {
    if (c.outputId) {
      edges.push({ from: c.outputId, to: c.codebaseId, relation: "output→codebase" });
    }
    for (const artId of c.sourceArtifactIds) {
      edges.push({ from: artId, to: c.codebaseId, relation: "artifact→codebase" });
    }
  }
  for (const b of stores.builds) {
    edges.push({ from: b.codebaseId, to: b.buildId, relation: "codebase→build" });
  }
  for (const p of stores.previews) {
    if (p.buildId) {
      edges.push({ from: p.buildId, to: p.previewId, relation: "build→preview" });
    }
  }
  for (const r of stores.releases) {
    for (const bid of r.buildIds) {
      edges.push({ from: bid, to: r.releaseId, relation: "build→release" });
    }
    for (const oid of r.outputIds) {
      edges.push({ from: oid, to: r.releaseId, relation: "output→release" });
    }
  }
  for (const d of stores.deployments) {
    edges.push({ from: d.releaseId, to: d.deploymentId, relation: "release→deployment" });
  }

  return {
    missionId,
    artifacts,
    outputs,
    codebases,
    builds,
    previews,
    releases,
    deployments,
    edges,
  };
}

export function answerLineageQuestions(lineage: VersionLineage): {
  artifactsForOutputs: string;
  codebaseChanges: string;
  buildsCompiled: string;
  activePreviews: string;
  releasesContaining: string;
  deploymentsWhere: string;
} {
  return {
    artifactsForOutputs: lineage.artifacts.map((a) => `${a.id}@${a.version}`).join(", ") || "(none)",
    codebaseChanges: lineage.codebases.map((c) => `${c.id}@${c.version}`).join(", ") || "(none)",
    buildsCompiled: lineage.builds.map((b) => `${b.id}:${b.status}`).join(", ") || "(none)",
    activePreviews: lineage.previews
      .filter((p) => p.status === "READY")
      .map((p) => p.id)
      .join(", ") || "(none)",
    releasesContaining: lineage.releases.map((r) => `${r.id}@${r.version}`).join(", ") || "(none)",
    deploymentsWhere:
      lineage.deployments.map((d) => `${d.id}:${d.label}:${d.status}`).join(", ") || "(none)",
  };
}

export function findPath(
  lineage: VersionLineage,
  fromId: string,
  toId: string
): string[] | undefined {
  const adj = new Map<string, string[]>();
  for (const e of lineage.edges) {
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }
  const queue: string[][] = [[fromId]];
  const seen = new Set<string>([fromId]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === toId) return path;
    for (const next of adj.get(last) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return undefined;
}

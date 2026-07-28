/** PROGRAM 5350 — Version management for creation outputs. */

import type { CreationOutput, VersionComparison, CreationOutputType } from "./types";
import { getOutputRepository } from "./output-repository";
import { registerOutput } from "./output-registry";

function generateId(): string {
  return `cmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split(".").map((p) => parseInt(p, 10) || 0);
  return { major: parts[0] ?? 1, minor: parts[1] ?? 0, patch: parts[2] ?? 0 };
}

export function bumpVersion(version: string, kind: "minor" | "patch" = "minor"): string {
  const v = parseVersion(version);
  if (kind === "patch") return `${v.major}.${v.minor}.${v.patch + 1}`;
  return `${v.major}.${v.minor + 1}.0`;
}

export function createNewVersion(
  previous: CreationOutput,
  overrides: Partial<CreationOutput>
): CreationOutput {
  const now = new Date().toISOString();
  const newVersion = bumpVersion(previous.version);
  const newOutput: CreationOutput = {
    ...previous,
    ...overrides,
    outputId: overrides.outputId ?? `out-${previous.type.toLowerCase().replace("_output", "")}-${Date.now().toString(36)}`,
    version: newVersion,
    status: overrides.status ?? "DRAFT",
    previousVersionId: previous.outputId,
    createdAt: now,
    updatedAt: now,
    approvals: overrides.approvals ?? [],
  };
  registerOutput(newOutput);
  return newOutput;
}

export function compareVersions(
  versionA: CreationOutput,
  versionB: CreationOutput
): VersionComparison {
  const scoreBefore = versionA.validation?.score ?? 0;
  const scoreAfter = versionB.validation?.score ?? 0;

  const visualChanges: string[] = [];
  const functionalChanges: string[] = [];
  const affectedFiles: string[] = [];
  const affectedArtifacts: string[] = [];
  const risks: string[] = [];

  if (versionA.title !== versionB.title) visualChanges.push(`Título: "${versionA.title}" → "${versionB.title}"`);
  if (versionA.routes.length !== versionB.routes.length) {
    functionalChanges.push(`Rutas: ${versionA.routes.length} → ${versionB.routes.length}`);
  }

  const filesA = new Set(versionA.files.map((f) => f.path));
  const filesB = new Set(versionB.files.map((f) => f.path));
  for (const f of filesB) if (!filesA.has(f)) affectedFiles.push(`+ ${f}`);
  for (const f of filesA) if (!filesB.has(f)) affectedFiles.push(`- ${f}`);

  for (const a of versionB.sourceArtifacts) {
    if (!versionA.sourceArtifacts.some((x) => x.artifactId === a.artifactId)) {
      affectedArtifacts.push(a.label);
    }
  }

  if (scoreAfter < scoreBefore) risks.push("Puntuación de validación disminuyó");
  if (versionB.warnings.length > versionA.warnings.length) {
    risks.push(`${versionB.warnings.length - versionA.warnings.length} advertencias nuevas`);
  }
  if (versionB.status === "FAILED") risks.push("Nueva versión en estado FAILED");

  const comparison: VersionComparison = {
    id: generateId(),
    missionId: versionA.missionId,
    outputType: versionA.type,
    versionAId: versionA.outputId,
    versionBId: versionB.outputId,
    versionALabel: versionA.version,
    versionBLabel: versionB.version,
    visualChanges,
    functionalChanges,
    affectedFiles,
    affectedArtifacts,
    risks,
    scoreBefore,
    scoreAfter,
    createdAt: new Date().toISOString(),
  };

  getOutputRepository().saveComparison(comparison);
  return comparison;
}

export function getVersionHistory(missionId: string, type: CreationOutputType): CreationOutput[] {
  return getOutputRepository()
    .findByMissionAndType(missionId, type)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
}

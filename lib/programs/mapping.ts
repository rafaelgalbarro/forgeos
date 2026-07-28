/** ForgeOS Master Program 2030 — pillar and module mappings (reference paths only). */

import type { PillarId } from "@/lib/platform/shared/types";
import type { ProgramId } from "./types";

export const programToPillars: Record<ProgramId, PillarId[]> = {
  "venture-core": ["strategy", "product", "studio"],
  "venture-execution": ["build"],
  "venture-intelligence": ["intelligence", "ceo"],
  "venture-platform": ["studio", "launch", "growth"],
  "venture-ecosystem": ["capital"],
};

const pillarToProgramMap = new Map<PillarId, ProgramId[]>();

for (const [programId, pillarIds] of Object.entries(programToPillars) as [
  ProgramId,
  PillarId[],
][]) {
  for (const pillarId of pillarIds) {
    const existing = pillarToProgramMap.get(pillarId) ?? [];
    existing.push(programId);
    pillarToProgramMap.set(pillarId, existing);
  }
}

/** Resolve program IDs for a platform pillar (may return multiple). */
export function pillarToProgram(pillarId: PillarId): ProgramId[] {
  return pillarToProgramMap.get(pillarId) ?? [];
}

/** Resolve platform pillars for a program. */
export function getPillarsForProgram(programId: ProgramId): PillarId[] {
  return programToPillars[programId] ?? [];
}

/** Map existing lib module paths to owning program. */
export const moduleToProgram: Record<string, ProgramId> = {
  "lib/discovery": "venture-core",
  "lib/portfolio": "venture-core",
  "lib/intelligence": "venture-core",
  "lib/venture-simulator": "venture-core",
  "lib/build-plan": "venture-core",
  "lib/export": "venture-core",
  "lib/design-system": "venture-core",
  "lib/knowledge": "venture-core",
  "lib/build-engine": "venture-execution",
  "lib/platform/build/connectors": "venture-execution",
  "lib/intelligence-layer": "venture-intelligence",
  "lib/ceo": "venture-intelligence",
  "lib/board": "venture-intelligence",
  "lib/fos": "venture-intelligence",
  "lib/platform/launch": "venture-platform",
  "lib/platform/growth": "venture-platform",
  "lib/notifications": "venture-platform",
  "lib/headquarters": "venture-platform",
  "lib/platform/capital": "venture-ecosystem",
};

/** Resolve program for a lib module path (exact or prefix match). */
export function resolveModuleProgram(modulePath: string): ProgramId | undefined {
  if (moduleToProgram[modulePath]) {
    return moduleToProgram[modulePath];
  }
  const normalized = modulePath.replace(/^@\/lib\//, "lib/").replace(/\/$/, "");
  if (moduleToProgram[normalized]) {
    return moduleToProgram[normalized];
  }
  for (const [prefix, programId] of Object.entries(moduleToProgram)) {
    if (normalized.startsWith(prefix)) {
      return programId;
    }
  }
  return undefined;
}

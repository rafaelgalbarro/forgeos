/**
 * ForgeOS 2030.1 — roadmap and scaffold connection policy.
 */

import {
  PROGRAM_IDS,
  PROGRAM_NAMES,
  PROGRAM_OBJECTIVES,
  PROGRAM_STATUSES,
  PROGRAM_VERSION,
} from "@/lib/programs/constants";
import { programToPillars } from "@/lib/programs/mapping";
import type { ProgramId } from "@/lib/programs/types";
import { VENTURE_CORE_MODULES } from "@/lib/programs/venture-core/modules";
import { VENTURE_EXECUTION_MODULES } from "@/lib/programs/venture-execution/modules";
import { VENTURE_INTELLIGENCE_MODULES } from "@/lib/programs/venture-intelligence/modules";
import { VENTURE_PLATFORM_MODULES } from "@/lib/programs/venture-platform/modules";
import { VENTURE_ECOSYSTEM_MODULES } from "@/lib/programs/venture-ecosystem/modules";
import type {
  RoadmapStatus,
  ScaffoldConnectionPolicy,
  ScaffoldModuleRef,
} from "./types";

const MODULES_BY_PROGRAM: Record<ProgramId, ScaffoldModuleRef[]> = {
  "venture-core": VENTURE_CORE_MODULES.map((module) => ({
    ...module,
    programId: "venture-core" as const,
  })),
  "venture-execution": VENTURE_EXECUTION_MODULES.map((module) => ({
    ...module,
    programId: "venture-execution" as const,
  })),
  "venture-intelligence": VENTURE_INTELLIGENCE_MODULES.map((module) => ({
    ...module,
    programId: "venture-intelligence" as const,
  })),
  "venture-platform": VENTURE_PLATFORM_MODULES.map((module) => ({
    ...module,
    programId: "venture-platform" as const,
  })),
  "venture-ecosystem": VENTURE_ECOSYSTEM_MODULES.map((module) => ({
    ...module,
    programId: "venture-ecosystem" as const,
  })),
};

function buildPillarStatus(): RoadmapStatus["pillars"] {
  const pillarMap = new Map<string, ProgramId[]>();

  for (const [programId, pillarIds] of Object.entries(programToPillars) as [
    ProgramId,
    (typeof programToPillars)[ProgramId],
  ][]) {
    for (const pillarId of pillarIds) {
      const existing = pillarMap.get(pillarId) ?? [];
      existing.push(programId);
      pillarMap.set(pillarId, existing);
    }
  }

  return Array.from(pillarMap.entries()).map(([pillarId, programIds]) => ({
    pillarId,
    programIds,
  }));
}

export function getRoadmapStatus(): RoadmapStatus {
  return {
    version: PROGRAM_VERSION,
    programs: PROGRAM_IDS.map((programId) => ({
      programId,
      name: PROGRAM_NAMES[programId],
      status: PROGRAM_STATUSES[programId],
      objective: PROGRAM_OBJECTIVES[programId],
    })),
    pillars: buildPillarStatus(),
    updatedAt: new Date().toISOString(),
  };
}

export function getScaffoldModules(): ScaffoldModuleRef[] {
  const all: ScaffoldModuleRef[] = [];
  for (const programId of PROGRAM_IDS) {
    all.push(...MODULES_BY_PROGRAM[programId]);
  }
  return all;
}

export function getDisconnectedModules(): ScaffoldModuleRef[] {
  return getScaffoldModules().filter((module) => !module.connected);
}

function normalizeModulePath(modulePath: string): string {
  return modulePath.replace(/^@\/lib\//, "lib/").replace(/\/$/, "");
}

function findModuleRef(modulePath: string): ScaffoldModuleRef | undefined {
  const normalized = normalizeModulePath(modulePath);
  return getScaffoldModules().find(
    (module) =>
      normalized === module.path || normalized.startsWith(`${module.path}/`),
  );
}

/**
 * Policy: scaffold modules (connected: false) cannot connect to production
 * without an documented epic + release in the operational registry.
 */
export function canConnectModule(
  modulePath: string,
  options?: { epicRegistered?: boolean; releaseRegistered?: boolean },
): boolean {
  const ref = findModuleRef(modulePath);
  if (!ref) {
    return true;
  }
  if (ref.connected) {
    return true;
  }

  const epicOk = options?.epicRegistered === true;
  const releaseOk = options?.releaseRegistered === true;
  return epicOk && releaseOk;
}

export function getScaffoldConnectionPolicy(
  modulePath: string,
  connected: boolean,
  options?: { epicRegistered?: boolean; releaseRegistered?: boolean },
): ScaffoldConnectionPolicy {
  const ref = findModuleRef(modulePath);
  const programId = ref?.programId ?? "venture-core";
  const allowConnection = canConnectModule(modulePath, options);

  let reason: string;
  if (!ref) {
    reason = "Módulo no listado en program modules — revisar mapping manualmente.";
  } else if (ref.connected) {
    reason = `${ref.path} ya está conectado en el registry del programa.`;
  } else if (allowConnection) {
    reason = "Épica y release registrados — conexión permitida.";
  } else {
    reason =
      `${ref.path} es scaffold (connected: false). ` +
      "Registrar épica y release en lib/delivery antes de conectar a app/.";
  }

  return {
    modulePath: ref?.path ?? normalizeModulePath(modulePath),
    connected,
    programId,
    allowConnection,
    reason,
  };
}

/**
 * ForgeOS Master Program 2030 — root export.
 * Governance & program architecture layer.
 * NOT wired into app routes — isolated lib module.
 */

export {
  PROGRAM_VERSION,
  PROGRAM_NAME,
  PROGRAM_NAMES,
  PROGRAM_OBJECTIVES,
  PROGRAM_STATUSES,
  PROGRAM_PRINCIPLES,
  PROGRAM_IDS,
} from "./constants";

export type { ProgramPrinciple } from "./constants";

export type {
  ProgramId,
  ProgramStatus,
  EpicStatus,
  FeatureStatus,
  ReleaseStatus,
  ProgramModuleRef,
  ProgramCapability,
  Epic,
  Feature,
  Release,
  EpicRegistry,
  ProgramDescriptor,
  DeliveryReport,
  ProgramEngine,
} from "./types";

export {
  registerProgram,
  getProgram,
  listPrograms,
  clearProgramRegistry,
} from "./registry";

export {
  programToPillars,
  pillarToProgram,
  getPillarsForProgram,
  moduleToProgram,
  resolveModuleProgram,
} from "./mapping";

export {
  METHODOLOGY_HIERARCHY,
  createEmptyEpicRegistry,
  createEpic,
  createFeature,
  createRelease,
  getEpicsForProgram,
  getFeaturesForEpic,
  getReleasesForProgram,
  describeHierarchy,
} from "./methodology";

export type { MethodologyLevel } from "./methodology";

import { bootstrapPlatformRegistry } from "@/lib/platform";
import type { ProgramDescriptor } from "./types";
import { registerProgram } from "./registry";
import { VentureCoreProgram } from "./venture-core/program";
import { VentureExecutionProgram } from "./venture-execution/program";
import { VentureIntelligenceProgram } from "./venture-intelligence/program";
import { VenturePlatformProgram } from "./venture-platform/program";
import { VentureEcosystemProgram } from "./venture-ecosystem/program";

const PROGRAM_ENGINES = [
  VentureCoreProgram,
  VentureExecutionProgram,
  VentureIntelligenceProgram,
  VenturePlatformProgram,
  VentureEcosystemProgram,
] as const;

/**
 * Register all program descriptors and bootstrap platform pillars.
 * Idempotent — safe to call multiple times.
 */
export function bootstrapProgramsRegistry(): ProgramDescriptor[] {
  bootstrapPlatformRegistry();

  const descriptors: ProgramDescriptor[] = PROGRAM_ENGINES.map((engine) => {
    const descriptor = engine.getDescriptor();
    registerProgram(descriptor);
    return descriptor;
  });

  return descriptors;
}

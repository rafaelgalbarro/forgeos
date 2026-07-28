/**
 * ForgeOS 2030.1 — Program Governance & Delivery System types.
 * Full DeliveryReport lives here; lib/programs/types.ts keeps a partial contract.
 */

import type {
  EpicStatus,
  ProgramId,
  ReleaseStatus,
} from "@/lib/programs/types";

export type QualityGateId =
  | "build"
  | "reset-dev"
  | "critical-routes"
  | "forbidden-imports"
  | "no-heavy-barrels"
  | "no-logic-in-components"
  | "fhis-new-ui"
  | "scaffold-connection";

export interface QualityGateResult {
  id: QualityGateId;
  passed: boolean;
  message: string;
}

export interface QualityGate {
  id: QualityGateId;
  title: string;
  description: string;
  mandatory: boolean;
  /** Documented command or check — executed externally in CI/scripts. */
  command?: string;
}

export interface DeliveryReport {
  programa: string;
  epica: string;
  release: string;
  objetivo: string;
  alcance: string[];
  fueraDeAlcance: string[];
  archivosCreados: string[];
  archivosModificados: string[];
  riesgos: string[];
  qualityGates: QualityGateResult[];
  resultadoBuild: string;
  rutasVerificadas: string[];
  rollbackPlan: string;
  proximoPaso: string[];
  arquitecturaAfectada: string[];
  compatibilidad: string;
  fecha?: string;
  autor?: string;
}

/** Operational epic record — separate from program descriptor epic scaffold. */
export interface EpicRecord {
  id: string;
  programId: ProgramId;
  title: string;
  objective: string;
  status: EpicStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

/** Operational release record linked to an epic. */
export interface ReleaseRecord {
  id: string;
  epicId: string;
  programId: ProgramId;
  version: string;
  title: string;
  status: ReleaseStatus;
  featureIds: string[];
  targetDate?: string;
  releasedAt?: string;
}

export interface RoadmapProgramStatus {
  programId: ProgramId;
  name: string;
  status: "active" | "scaffold";
  objective: string;
}

export interface RoadmapPillarStatus {
  pillarId: string;
  programIds: ProgramId[];
}

export interface RoadmapStatus {
  version: string;
  programs: RoadmapProgramStatus[];
  pillars: RoadmapPillarStatus[];
  updatedAt: string;
}

export interface ScaffoldModuleRef {
  path: string;
  label: string;
  programId: ProgramId;
  connected: boolean;
  notes?: string;
}

export interface ScaffoldConnectionPolicy {
  modulePath: string;
  connected: boolean;
  programId: ProgramId;
  allowConnection: boolean;
  reason: string;
}

export interface ForbiddenImportRule {
  id: string;
  /** Pattern tested against import lines in source content. */
  pattern: RegExp;
  scope: string;
  reason: string;
}

export interface ReleaseSpec {
  id: string;
  version: string;
  title: string;
  featureIds?: string[];
  targetDate?: string;
}

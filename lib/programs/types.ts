/** ForgeOS Master Program 2030 — shared type contracts. */

import type { PillarId } from "@/lib/platform/shared/types";

export type ProgramId =
  | "venture-core"
  | "venture-execution"
  | "venture-intelligence"
  | "venture-platform"
  | "venture-ecosystem";

export type ProgramStatus = "active" | "scaffold";

export type EpicStatus = "draft" | "planned" | "in_progress" | "done" | "archived";
export type FeatureStatus = "draft" | "planned" | "in_progress" | "shipped" | "deferred";
export type ReleaseStatus = "planned" | "in_progress" | "released" | "cancelled";

export interface ProgramModuleRef {
  /** Reference path only — no runtime import. */
  path: string;
  label: string;
  connected: boolean;
  notes?: string;
}

export interface ProgramCapability {
  id: string;
  label: string;
  description: string;
  status: ProgramStatus;
}

export interface Epic {
  id: string;
  programId: ProgramId;
  title: string;
  objective: string;
  status: EpicStatus;
  pillarIds: PillarId[];
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  epicId: string;
  programId: ProgramId;
  title: string;
  description: string;
  status: FeatureStatus;
  releaseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  programId: ProgramId;
  version: string;
  title: string;
  status: ReleaseStatus;
  featureIds: string[];
  targetDate?: string;
  releasedAt?: string;
}

export interface EpicRegistry {
  epics: Epic[];
  features: Feature[];
  releases: Release[];
}

export interface ProgramDescriptor {
  id: ProgramId;
  name: string;
  version: string;
  objective: string;
  status: ProgramStatus;
  linkedPillarIds: PillarId[];
  existingModules: ProgramModuleRef[];
  epicRegistry: EpicRegistry;
  capabilities: ProgramCapability[];
}

export interface DeliveryReport {
  programa: string;
  epica: string;
  objetivo: string;
  archivosCreados: string[];
  archivosModificados: string[];
  arquitecturaAfectada: string[];
  riesgos: string[];
  compatibilidad: string;
  build: string;
  proximosPasos: string[];
  fecha?: string;
  autor?: string;
}

export interface ProgramEngine {
  readonly id: ProgramId;
  readonly name: string;
  readonly objective: string;
  readonly status: ProgramStatus;
  readonly linkedPillarIds: PillarId[];
  readonly existingModules: ProgramModuleRef[];
  readonly epicRegistry: EpicRegistry;
  getCapabilities(): ProgramCapability[];
  getDescriptor(): ProgramDescriptor;
}

/** ForgeOS Platform — shared type contracts (v1.0 scaffold). */

export type PlatformId = `platform_${string}`;
export type VentureId = string;
export type ModuleId = string;

export type PillarId =
  | "strategy"
  | "product"
  | "build"
  | "launch"
  | "growth"
  | "ceo"
  | "studio"
  | "intelligence"
  | "capital";

export type PillarStatus = "scaffold" | "ready";

export interface PlatformContext {
  platformId: PlatformId;
  ventureId: VentureId;
  createdAt: string;
  updatedAt: string;
}

export interface PillarHealthCheck {
  ok: boolean;
  message?: string;
  checkedAt: string;
}

export interface PillarEngine {
  readonly id: PillarId;
  readonly status: PillarStatus;
  initialize(ventureId: VentureId): Promise<void>;
  getCapabilities(): ModuleId[];
  healthCheck(): Promise<PillarHealthCheck>;
}

export interface PillarCapability {
  id: ModuleId;
  label: string;
  description: string;
  status: PillarStatus;
}

export interface PillarDescriptor {
  id: PillarId;
  name: string;
  version: string;
  description: string;
  status: PillarStatus;
  capabilities: PillarCapability[];
}

export interface AdapterDescriptor {
  readonly: boolean;
  module: string;
  pillarId: PillarId;
}

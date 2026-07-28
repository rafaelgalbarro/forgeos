/** PROGRAM 6010 — Capability contracts (stub-aligned for 6030). */

export type CapabilityName =
  | "GenerateMarketResearch"
  | "GenerateBrand"
  | "GenerateWebsite"
  | "GenerateWebApplication"
  | "GenerateMobileApplication"
  | "GenerateBackend"
  | "GenerateCodebase"
  | "BuildCodebase"
  | "CreatePreview"
  | "DeployRelease";

export interface CapabilityRequest {
  capability: CapabilityName;
  missionId: string;
  nodeId: string;
  inputs: Record<string, unknown>;
  dryRun?: boolean;
}

export interface CapabilityResult {
  capability: CapabilityName;
  ok: boolean;
  artifactRefs: string[];
  outputs: Record<string, unknown>;
  warnings: string[];
  error?: string;
  usedFixture: boolean;
}

/** ForgeOS AI Runtime RC6 — model registry types. */

import type { RuntimeProviderId } from "../types";

export interface ModelCapabilities {
  tools: boolean;
  vision: boolean;
  images: boolean;
  audio: boolean;
  reasoning: boolean;
  json: boolean;
  streaming: boolean;
}

export interface RegisteredModel {
  id: string;
  provider: RuntimeProviderId;
  model: string;
  version: string;
  label: string;
  capabilities: ModelCapabilities;
  pricing: { inputPer1k: number; outputPer1k: number };
  latencyMs: number;
  contextWindow: number;
  priority: number;
  health: "healthy" | "degraded" | "unknown";
  specialty: string[];
}

export interface ModelRegistrySnapshot {
  models: RegisteredModel[];
  totalCount: number;
  healthyCount: number;
  providers: RuntimeProviderId[];
}

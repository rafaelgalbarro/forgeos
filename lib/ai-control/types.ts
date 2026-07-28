/** Program 3000 Sprint 4 — AI Control Center types. */

import type { RuntimeProviderId } from "@/lib/ai-runtime/types";

export type AiActivationMode = "mock" | "real";

export interface RealAiActivationStatus {
  flagEnabled: boolean;
  designPartner: boolean;
  hasProviderKeys: boolean;
  active: boolean;
  mode: AiActivationMode;
  blockReason?: string;
}

export interface ProviderHealthSnapshot {
  id: RuntimeProviderId;
  label: string;
  configured: boolean;
  healthy: boolean;
  latencyMs: number;
  message?: string;
  models: string[];
  estimatedCostPer1k: number;
  estimatedLatencyMs: number;
  streamingSupported: boolean;
  telemetry: {
    requests: number;
    errors: number;
    fallbacks: number;
    totalCost: number;
    avgLatencyMs: number;
  };
}

export interface FallbackChainSnapshot {
  task: string;
  chain: RuntimeProviderId[];
  selectedProvider: RuntimeProviderId;
  selectedModel: string;
  rationale: string;
}

export interface AiControlPanelSnapshot {
  activation: RealAiActivationStatus;
  streamingEnabled: boolean;
  multiProviderRouting: boolean;
  costOptimizer: boolean;
  monthlyBudgetUsd: number;
  mockModeWarning: string | null;
  providers: ProviderHealthSnapshot[];
  fallbackChains: FallbackChainSnapshot[];
  telemetry: {
    requestCount: number;
    totalCost: number;
    totalTokens: number;
    fallbacks: number;
    errors: number;
    avgLatencyMs: number;
    cacheHits: number;
  };
  recentFallbackEvents: Array<{
    id: string;
    timestamp: string;
    task: string;
    provider: RuntimeProviderId;
    model: string;
    latencyMs: number;
  }>;
}

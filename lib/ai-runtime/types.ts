/** ForgeOS AI Runtime — shared types (RC3). */

import type { AITask, AIProviderId } from "@/lib/ai-gateway/types";

/** Extended provider IDs — all decoupled adapters. */
export type RuntimeProviderId =
  | AIProviderId
  | "openrouter"
  | "deepseek"
  | "azure-openai"
  | "aws-bedrock"
  | "vertex-ai"
  | "cohere"
  | "xai"
  | "ollama"
  | "lmstudio"
  | "llama"
  | "mcp";

export type OptimizerMode = "cost" | "latency" | "quality" | "balanced";

export type ContextSource =
  | "research"
  | "product"
  | "memory"
  | "knowledge"
  | "decision-graph"
  | "build-context"
  | "build-dna"
  | "timeline"
  | "founder"
  | "ceo"
  | "workers"
  | "portfolio"
  | "runtime-history";

export interface AIRuntimeContextInput {
  ventureId?: string;
  ventureName?: string;
  sources?: ContextSource[];
  knowledgeRefs?: { id: string; title?: string }[];
  researchSummary?: string;
  productSummary?: string;
  buildContextSummary?: string;
  buildDnaSummary?: string;
  metadata?: Record<string, unknown>;
}

export interface AIRuntimeRequest {
  task: AITask;
  userInput: string;
  systemPrompt?: string;
  context?: AIRuntimeContextInput;
  providerOverride?: RuntimeProviderId;
  optimizer?: OptimizerMode;
  writeMemory?: boolean;
  writeDecision?: boolean;
}

export interface RoutingDecision {
  task: AITask;
  optimizer: OptimizerMode;
  selectedProvider: RuntimeProviderId;
  selectedModel: string;
  providerChain: RuntimeProviderId[];
  estimatedCostPer1k: number;
  estimatedLatencyMs: number;
  specialty: string;
  rationale: string;
}

export interface CompiledPrompt {
  system: string;
  user: string;
  inputTokensEstimate: number;
  sourcesUsed: ContextSource[];
}

export interface AIRuntimeTelemetryRecord {
  id: string;
  timestamp: string;
  task: AITask;
  provider: RuntimeProviderId;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  fallbackUsed: boolean;
  error?: string;
  qualityScore: number;
  confidence: number;
  ventureId?: string;
  decisionId?: string;
  routingRationale: string;
}

export interface AIRuntimeResponse {
  output: string;
  provider: RuntimeProviderId;
  model: string;
  fallbackUsed: boolean;
  costEstimate: number;
  latencyMs: number;
  warnings: string[];
  routing: RoutingDecision;
  telemetryId: string;
  memoryId?: string;
  decisionId?: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface ProviderAdapterMeta {
  id: RuntimeProviderId;
  label: string;
  specialty: string;
  estimatedCostPer1k: number;
  estimatedLatencyMs: number;
  qualityTier: 1 | 2 | 3 | 4 | 5;
  openAiCompatible: boolean;
  status: "live" | "configured" | "stub" | "mcp-pending";
}

/** ForgeOS AI Runtime — provider adapter metadata & routing scores. */

import type { AITask } from "@/lib/ai-gateway/types";
import type { OptimizerMode, ProviderAdapterMeta, RuntimeProviderId } from "../types";

export const PROVIDER_CATALOG: ProviderAdapterMeta[] = [
  { id: "anthropic", label: "Anthropic Claude", specialty: "reasoning, json, executive", estimatedCostPer1k: 0.015, estimatedLatencyMs: 2200, qualityTier: 5, openAiCompatible: false, status: "live" },
  { id: "openai", label: "OpenAI", specialty: "general, code, product", estimatedCostPer1k: 0.012, estimatedLatencyMs: 1800, qualityTier: 5, openAiCompatible: true, status: "live" },
  { id: "google", label: "Google Gemini", specialty: "research, multimodal", estimatedCostPer1k: 0.008, estimatedLatencyMs: 1600, qualityTier: 4, openAiCompatible: false, status: "live" },
  { id: "openrouter", label: "OpenRouter", specialty: "multi-model routing", estimatedCostPer1k: 0.01, estimatedLatencyMs: 2000, qualityTier: 4, openAiCompatible: true, status: "configured" },
  { id: "deepseek", label: "DeepSeek", specialty: "code, cost-efficient", estimatedCostPer1k: 0.003, estimatedLatencyMs: 1400, qualityTier: 4, openAiCompatible: true, status: "configured" },
  { id: "mistral", label: "Mistral", specialty: "classification, eu", estimatedCostPer1k: 0.006, estimatedLatencyMs: 1200, qualityTier: 4, openAiCompatible: true, status: "live" },
  { id: "groq", label: "Groq / Llama", specialty: "low-latency inference", estimatedCostPer1k: 0.002, estimatedLatencyMs: 400, qualityTier: 3, openAiCompatible: true, status: "live" },
  { id: "llama", label: "Meta Llama", specialty: "open weights", estimatedCostPer1k: 0.004, estimatedLatencyMs: 900, qualityTier: 3, openAiCompatible: true, status: "configured" },
  { id: "azure-openai", label: "Azure OpenAI", specialty: "enterprise openai", estimatedCostPer1k: 0.014, estimatedLatencyMs: 2000, qualityTier: 5, openAiCompatible: true, status: "configured" },
  { id: "aws-bedrock", label: "AWS Bedrock", specialty: "enterprise multi-model", estimatedCostPer1k: 0.013, estimatedLatencyMs: 2400, qualityTier: 4, openAiCompatible: false, status: "stub" },
  { id: "vertex-ai", label: "Vertex AI", specialty: "google cloud", estimatedCostPer1k: 0.009, estimatedLatencyMs: 1900, qualityTier: 4, openAiCompatible: false, status: "configured" },
  { id: "cohere", label: "Cohere", specialty: "rag, embeddings", estimatedCostPer1k: 0.007, estimatedLatencyMs: 1500, qualityTier: 4, openAiCompatible: false, status: "configured" },
  { id: "xai", label: "xAI Grok", specialty: "real-time reasoning", estimatedCostPer1k: 0.011, estimatedLatencyMs: 1700, qualityTier: 4, openAiCompatible: true, status: "configured" },
  { id: "ollama", label: "Ollama", specialty: "local models", estimatedCostPer1k: 0, estimatedLatencyMs: 3000, qualityTier: 3, openAiCompatible: true, status: "configured" },
  { id: "lmstudio", label: "LM Studio", specialty: "local desktop", estimatedCostPer1k: 0, estimatedLatencyMs: 3500, qualityTier: 3, openAiCompatible: true, status: "configured" },
  { id: "local", label: "Local OpenAI-compatible", specialty: "self-hosted", estimatedCostPer1k: 0, estimatedLatencyMs: 2500, qualityTier: 3, openAiCompatible: true, status: "live" },
  { id: "mcp", label: "MCP (Model Context Protocol)", specialty: "context protocol", estimatedCostPer1k: 0, estimatedLatencyMs: 0, qualityTier: 3, openAiCompatible: false, status: "mcp-pending" },
  { id: "mock", label: "Mock", specialty: "offline fallback", estimatedCostPer1k: 0, estimatedLatencyMs: 50, qualityTier: 1, openAiCompatible: false, status: "live" },
];

const TASK_SPECIALTY: Partial<Record<AITask, RuntimeProviderId[]>> = {
  research: ["anthropic", "google", "openrouter", "deepseek"],
  product: ["anthropic", "openai", "openrouter"],
  code: ["deepseek", "openai", "anthropic", "groq"],
  classification: ["groq", "mistral", "deepseek"],
  marketing: ["openai", "google", "cohere"],
  legal: ["anthropic", "openai", "azure-openai"],
  "ceo-brief": ["anthropic", "openai", "azure-openai"],
  "board-debate": ["anthropic", "openai"],
  "build-architecture": ["anthropic", "openai", "deepseek"],
};

export function getProviderMeta(id: RuntimeProviderId): ProviderAdapterMeta {
  return PROVIDER_CATALOG.find((p) => p.id === id) ?? PROVIDER_CATALOG[PROVIDER_CATALOG.length - 1]!;
}

export function scoreProvider(
  id: RuntimeProviderId,
  task: AITask,
  optimizer: OptimizerMode,
  configured: boolean
): number {
  if (!configured && id !== "mock") return -1;
  const meta = getProviderMeta(id);
  const specialty = TASK_SPECIALTY[task]?.includes(id) ? 1.2 : 1;
  const costScore = 1 / (meta.estimatedCostPer1k + 0.001);
  const latencyScore = 1 / (meta.estimatedLatencyMs + 100);
  const qualityScore = meta.qualityTier / 5;

  switch (optimizer) {
    case "cost":
      return costScore * specialty * 10;
    case "latency":
      return latencyScore * specialty * 10;
    case "quality":
      return qualityScore * specialty * 10;
    default:
      return (costScore * 0.3 + latencyScore * 0.3 + qualityScore * 0.4) * specialty * 10;
  }
}

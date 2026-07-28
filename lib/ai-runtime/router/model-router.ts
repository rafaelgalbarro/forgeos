/** ForgeOS AI Runtime — automatic model router (RC3). */

import { resolveProviderChain, getPolicyForTask, getModelForProvider } from "@/lib/ai-gateway/model-policy";
import type { AITask, AIProviderId } from "@/lib/ai-gateway/types";
import { getConfiguredRuntimeProviders } from "../providers/registry";
import type { OptimizerMode, RoutingDecision, RuntimeProviderId } from "../types";
import { getOptimizerWeights } from "./optimizers";
import { getProviderMeta, scoreProvider } from "./provider-catalog";

const GATEWAY_IDS = new Set<RuntimeProviderId>([
  "openai", "anthropic", "google", "mistral", "groq", "local", "mock",
]);

function isGatewayProvider(id: RuntimeProviderId): id is AIProviderId {
  return GATEWAY_IDS.has(id);
}

function buildExtendedChain(task: AITask): RuntimeProviderId[] {
  const policy = getPolicyForTask(task);
  const base = [...policy.preferredProviders, ...policy.fallbackProviders] as RuntimeProviderId[];
  const extended: RuntimeProviderId[] = [
    "openrouter",
    "deepseek",
    "azure-openai",
    "vertex-ai",
    "xai",
    "ollama",
    "lmstudio",
    "llama",
    "cohere",
    "aws-bedrock",
    "mcp",
    "mock",
  ];
  return [...new Set([...base, ...extended])];
}

export function routeModel(params: {
  task: AITask;
  optimizer?: OptimizerMode;
  providerOverride?: RuntimeProviderId;
  budgetUsd?: number;
}): RoutingDecision {
  const optimizer = params.optimizer ?? "balanced";
  const configured = new Set(getConfiguredRuntimeProviders());
  const chain = params.providerOverride
    ? [params.providerOverride, ...buildExtendedChain(params.task)]
    : buildExtendedChain(params.task);

  const uniqueChain = [...new Set(chain)];
  const weights = getOptimizerWeights(optimizer);

  const scored = uniqueChain
    .map((id) => ({
      id,
      score: scoreProvider(id, params.task, optimizer, configured.has(id)),
      meta: getProviderMeta(id),
    }))
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score);

  const selected = scored[0]?.id ?? "mock";
  const meta = getProviderMeta(selected);
  const model = isGatewayProvider(selected)
    ? getModelForProvider(selected)
    : resolveRuntimeModel(selected);

  const policy = getPolicyForTask(params.task);
  const gatewayChain = resolveProviderChain(params.task);

  const rationale = [
    `Optimizer: ${optimizer} (cost ${weights.cost}, latency ${weights.latency}, quality ${weights.quality})`,
    `Selected ${meta.label} for ${params.task} — ${meta.specialty}`,
    `Chain length: ${uniqueChain.length}, gateway fallback: ${gatewayChain.join(" → ")}`,
  ].join(". ");

  return {
    task: params.task,
    optimizer,
    selectedProvider: selected,
    selectedModel: model,
    providerChain: uniqueChain,
    estimatedCostPer1k: meta.estimatedCostPer1k,
    estimatedLatencyMs: meta.estimatedLatencyMs,
    specialty: meta.specialty,
    rationale,
  };
}

export function resolveRuntimeModel(provider: RuntimeProviderId): string {
  const envMap: Partial<Record<RuntimeProviderId, [string, string]>> = {
    openrouter: ["OPENROUTER_MODEL", "openai/gpt-4o"],
    deepseek: ["DEEPSEEK_MODEL", "deepseek-chat"],
    "azure-openai": ["AZURE_OPENAI_MODEL", "gpt-4o"],
    "aws-bedrock": ["AWS_BEDROCK_MODEL", "anthropic.claude-3-sonnet"],
    "vertex-ai": ["VERTEX_AI_MODEL", "gemini-1.5-pro"],
    cohere: ["COHERE_MODEL", "command-r-plus"],
    xai: ["XAI_MODEL", "grok-beta"],
    ollama: ["OLLAMA_MODEL", "llama3.2"],
    lmstudio: ["LMSTUDIO_MODEL", "local-model"],
    llama: ["LLAMA_MODEL", "llama-3.3-70b"],
    mcp: ["MCP_MODEL", "mcp-pending"],
  };
  const entry = envMap[provider];
  if (!entry) return getProviderMeta(provider).label;
  const [key, fallback] = entry;
  return process.env[key]?.trim() || fallback;
}

export function toGatewayProvider(id: RuntimeProviderId): AIProviderId | null {
  if (isGatewayProvider(id)) return id;
  return null;
}

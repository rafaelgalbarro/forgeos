/** ForgeOS AI Runtime RC6 — Model Router v2. */

import { getPolicyForTask } from "@/lib/ai-gateway/model-policy";
import type { AITask } from "@/lib/ai-gateway/types";
import { isCostOptimizerEnabled, isMultiProviderRoutingEnabled, isStreamingEnabled } from "../config";
import { getBestModelForTask } from "../model-registry";
import { getConfiguredProviders as getConfiguredProviderAdapters } from "../providers/provider-factory";
import type { OptimizerMode, RoutingDecision, RuntimeProviderId } from "../types";
import { routeModel as routeModelV1 } from "./model-router";
import { getProviderMeta, scoreProvider } from "./provider-catalog";
import { getOptimizerWeights, estimateBudgetRemaining } from "./optimizers";

export interface RoutingV2Options {
  task: AITask;
  optimizer?: OptimizerMode;
  providerOverride?: RuntimeProviderId;
  budgetUsd?: number;
  requireStreaming?: boolean;
  requireTools?: boolean;
  requireVision?: boolean;
  department?: string;
}

export interface RoutingV2Decision extends RoutingDecision {
  streaming: boolean;
  toolCalling: boolean;
  budgetRemaining: number;
  fallbackChain: RuntimeProviderId[];
  modelCapabilities: string[];
}

export function routeModelV2(options: RoutingV2Options): RoutingV2Decision {
  if (!isMultiProviderRoutingEnabled()) {
    const base = routeModelV1(options);
    return {
      ...base,
      streaming: isStreamingEnabled(),
      toolCalling: false,
      budgetRemaining: estimateBudgetRemaining(),
      fallbackChain: base.providerChain,
      modelCapabilities: [],
    };
  }

  const optimizer = options.optimizer ?? "balanced";
  const configured = new Set([
    ...getConfiguredProviderAdapters(),
    ...(["mock"] as RuntimeProviderId[]),
  ]);
  const weights = getOptimizerWeights(optimizer);
  const budgetRemaining = options.budgetUsd ?? estimateBudgetRemaining();

  const bestModel = getBestModelForTask(options.task, {
    budget: optimizer === "cost" || isCostOptimizerEnabled(),
    latency: optimizer === "latency",
    quality: optimizer === "quality",
  });

  const baseChain = options.providerOverride
    ? [options.providerOverride]
    : bestModel
      ? [bestModel.provider]
      : [];

  const policy = getPolicyForTask(options.task);
  const extended: RuntimeProviderId[] = [
    ...baseChain,
    ...(policy.preferredProviders as RuntimeProviderId[]),
    ...(policy.fallbackProviders as RuntimeProviderId[]),
    "openrouter",
    "deepseek",
    "azure-openai",
    "vertex-ai",
    "ollama",
    "lmstudio",
    "llama",
    "mock",
  ];

  const uniqueChain = [...new Set(extended)].filter(
    (id) => configured.has(id) || id === "mock"
  );

  const scored = uniqueChain
    .map((id) => ({
      id,
      score: scoreProvider(id, options.task, optimizer, configured.has(id)),
      meta: getProviderMeta(id),
    }))
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score);

  const selected = scored[0]?.id ?? "mock";
  const meta = getProviderMeta(selected);
  const model = bestModel?.model ?? (selected === "mock" ? "mock" : meta.label);

  const capabilities: string[] = [];
  if (bestModel?.capabilities.streaming && isStreamingEnabled()) capabilities.push("streaming");
  if (bestModel?.capabilities.tools) capabilities.push("tools");
  if (bestModel?.capabilities.vision) capabilities.push("vision");
  if (bestModel?.capabilities.reasoning) capabilities.push("reasoning");

  const rationale = [
    `RC6 Router — optimizer: ${optimizer}`,
    `Department: ${options.department ?? "executive"}`,
    `Selected ${meta.label} / ${model} for ${options.task}`,
    `Budget remaining: $${budgetRemaining.toFixed(2)}`,
    `Weights: cost=${weights.cost}, latency=${weights.latency}, quality=${weights.quality}`,
  ].join(". ");

  return {
    task: options.task,
    optimizer,
    selectedProvider: selected,
    selectedModel: model,
    providerChain: uniqueChain,
    estimatedCostPer1k: meta.estimatedCostPer1k,
    estimatedLatencyMs: meta.estimatedLatencyMs,
    specialty: meta.specialty,
    rationale,
    streaming: isStreamingEnabled() && (options.requireStreaming ?? false),
    toolCalling: options.requireTools ?? false,
    budgetRemaining,
    fallbackChain: uniqueChain.slice(1),
    modelCapabilities: capabilities,
  };
}

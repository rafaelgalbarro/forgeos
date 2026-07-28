/** ForgeOS AI Runtime RC6 — model registry. */

import type { AITask } from "@/lib/ai-gateway/types";
import { getConfiguredProviders } from "../providers/provider-factory";
import type { RuntimeProviderId } from "../types";
import { SEED_MODELS } from "./models/seed";
import type { ModelRegistrySnapshot, RegisteredModel } from "./types";

export function getAllModels(): RegisteredModel[] {
  const configured = new Set(getConfiguredProviders());
  return SEED_MODELS.map((m) => ({
    ...m,
    health: configured.has(m.provider) ? "healthy" : m.health,
  }));
}

export function getModelById(id: string): RegisteredModel | undefined {
  return getAllModels().find((m) => m.id === id);
}

export function getModelsForProvider(provider: RuntimeProviderId): RegisteredModel[] {
  return getAllModels().filter((m) => m.provider === provider);
}

export function getBestModelForTask(
  task: AITask,
  options?: { budget?: boolean; latency?: boolean; quality?: boolean }
): RegisteredModel | undefined {
  const configured = new Set(getConfiguredProviders());
  const taskSpecialtyMap: Partial<Record<AITask, string[]>> = {
    research: ["research", "multimodal"],
    product: ["product", "general"],
    code: ["code", "cost-efficient"],
    classification: ["classification", "eu"],
    marketing: ["marketing"],
    legal: ["executive", "compliance"],
    "ceo-brief": ["executive", "reasoning"],
    "board-debate": ["reasoning", "executive"],
    "build-architecture": ["code", "enterprise"],
  };

  const specialties = taskSpecialtyMap[task] ?? ["general"];
  const candidates = getAllModels()
    .filter((m) => configured.has(m.provider))
    .filter((m) => m.specialty.some((s) => specialties.includes(s)) || m.priority >= 80);

  if (candidates.length === 0) {
    return getAllModels().find((m) => m.provider === "mock") ?? getAllModels()[0];
  }

  const scored = candidates.map((m) => {
    const costScore = 1 / (m.pricing.inputPer1k + m.pricing.outputPer1k + 0.001);
    const latencyScore = 1 / (m.latencyMs + 100);
    const qualityScore = m.priority / 100;
    let score: number;
    if (options?.budget) score = costScore * 10;
    else if (options?.latency) score = latencyScore * 10;
    else if (options?.quality) score = qualityScore * 10;
    else score = costScore * 0.3 + latencyScore * 0.3 + qualityScore * 0.4;
    return { m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.m;
}

export function buildModelRegistrySnapshot(): ModelRegistrySnapshot {
  const models = getAllModels();
  return {
    models,
    totalCount: models.length,
    healthyCount: models.filter((m) => m.health === "healthy").length,
    providers: [...new Set(models.map((m) => m.provider))],
  };
}

/** ForgeOS AI Gateway — per-task model routing policies. */

import type { AITask, AIProviderId, ModelPolicy } from "./types";

const CEO_ORCH_POLICY: Omit<ModelPolicy, "task"> = {
  preferredProviders: ["anthropic", "openai"],
  fallbackProviders: ["mock"],
  temperature: 0.4,
  maxTokens: 2048,
  expectedFormat: "json",
  estimatedCostPer1kTokens: 0.012,
  requiresJson: true,
  allowsMock: true,
};

const BOARD_ORCH_POLICY: Omit<ModelPolicy, "task"> = {
  preferredProviders: ["anthropic"],
  fallbackProviders: ["google", "openai", "mock"],
  temperature: 0.5,
  maxTokens: 3072,
  expectedFormat: "json",
  estimatedCostPer1kTokens: 0.014,
  requiresJson: true,
  allowsMock: true,
};

const BUILD_ORCH_POLICY: Omit<ModelPolicy, "task"> = {
  preferredProviders: ["anthropic", "openai"],
  fallbackProviders: ["mock"],
  temperature: 0.2,
  maxTokens: 4096,
  expectedFormat: "json",
  estimatedCostPer1kTokens: 0.016,
  requiresJson: true,
  allowsMock: true,
};

const ORCH_TASK_IDS: AITask[] = [
  "ceo-brief",
  "ceo-review",
  "ceo-priority",
  "ceo-risk",
  "board-debate",
  "board-vote",
  "board-consensus",
  "build-architecture",
  "build-backend",
  "build-frontend",
  "build-database",
  "build-deploy",
  "build-qa",
];

function buildOrchPolicies(): Record<string, ModelPolicy> {
  const out: Record<string, ModelPolicy> = {};
  for (const id of ORCH_TASK_IDS) {
    const base = id.startsWith("ceo-")
      ? CEO_ORCH_POLICY
      : id.startsWith("board-")
        ? BOARD_ORCH_POLICY
        : BUILD_ORCH_POLICY;
    out[id] = { task: id, ...base };
  }
  return out;
}

const BASE_TASK_POLICIES = {
  research: {
    task: "research" as const,
    preferredProviders: ["anthropic", "openai"] as AIProviderId[],
    fallbackProviders: ["google", "mock"] as AIProviderId[],
    temperature: 0.4,
    maxTokens: 4096,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.015,
    requiresJson: true,
    allowsMock: true,
  },
  product: {
    task: "product" as const,
    preferredProviders: ["anthropic"] as AIProviderId[],
    fallbackProviders: ["openai", "mock"] as AIProviderId[],
    temperature: 0.35,
    maxTokens: 4096,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.018,
    requiresJson: true,
    allowsMock: true,
  },
  ceo: {
    task: "ceo" as const,
    preferredProviders: ["anthropic", "openai"] as AIProviderId[],
    fallbackProviders: ["mock"] as AIProviderId[],
    temperature: 0.4,
    maxTokens: 2048,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.012,
    requiresJson: true,
    allowsMock: true,
  },
  board: {
    task: "board" as const,
    preferredProviders: ["anthropic"] as AIProviderId[],
    fallbackProviders: ["google", "openai", "mock"] as AIProviderId[],
    temperature: 0.5,
    maxTokens: 3072,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.014,
    requiresJson: true,
    allowsMock: true,
  },
  strategy: {
    task: "strategy" as const,
    preferredProviders: ["anthropic", "openai"] as AIProviderId[],
    fallbackProviders: ["google", "mock"] as AIProviderId[],
    temperature: 0.4,
    maxTokens: 3072,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.013,
    requiresJson: true,
    allowsMock: true,
  },
  "build-plan": {
    task: "build-plan" as const,
    preferredProviders: ["anthropic", "openai"] as AIProviderId[],
    fallbackProviders: ["mock"] as AIProviderId[],
    temperature: 0.2,
    maxTokens: 4096,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.016,
    requiresJson: true,
    allowsMock: true,
  },
  legal: {
    task: "legal" as const,
    preferredProviders: ["anthropic"] as AIProviderId[],
    fallbackProviders: ["openai", "mock"] as AIProviderId[],
    temperature: 0.2,
    maxTokens: 3072,
    expectedFormat: "text" as const,
    estimatedCostPer1kTokens: 0.014,
    requiresJson: false,
    allowsMock: true,
  },
  marketing: {
    task: "marketing" as const,
    preferredProviders: ["openai", "google"] as AIProviderId[],
    fallbackProviders: ["anthropic", "mock"] as AIProviderId[],
    temperature: 0.6,
    maxTokens: 2048,
    expectedFormat: "text" as const,
    estimatedCostPer1kTokens: 0.01,
    requiresJson: false,
    allowsMock: true,
  },
  code: {
    task: "code" as const,
    preferredProviders: ["anthropic", "openai"] as AIProviderId[],
    fallbackProviders: ["groq", "mock"] as AIProviderId[],
    temperature: 0.2,
    maxTokens: 8192,
    expectedFormat: "text" as const,
    estimatedCostPer1kTokens: 0.02,
    requiresJson: false,
    allowsMock: true,
  },
  classification: {
    task: "classification" as const,
    preferredProviders: ["groq", "mistral"] as AIProviderId[],
    fallbackProviders: ["mock"] as AIProviderId[],
    temperature: 0.1,
    maxTokens: 512,
    expectedFormat: "json" as const,
    estimatedCostPer1kTokens: 0.002,
    requiresJson: true,
    allowsMock: true,
  },
};

export const TASK_POLICIES: Record<AITask, ModelPolicy> = {
  ...BASE_TASK_POLICIES,
  ...(buildOrchPolicies() as Record<AITask, ModelPolicy>),
};

export function getPolicyForTask(task: AITask): ModelPolicy {
  return TASK_POLICIES[task];
}

export function resolveProviderChain(
  task: AITask,
  override?: AIProviderId
): AIProviderId[] {
  const policy = getPolicyForTask(task);
  if (override) {
    const chain = [override, ...policy.preferredProviders, ...policy.fallbackProviders];
    return [...new Set(chain)];
  }

  const defaultProvider = process.env.AI_DEFAULT_PROVIDER?.trim() as AIProviderId | undefined;
  const envFallback = process.env.AI_FALLBACK_PROVIDER?.trim() as AIProviderId | undefined;

  const chain: AIProviderId[] = [];
  if (defaultProvider) chain.push(defaultProvider);
  chain.push(...policy.preferredProviders);
  if (envFallback) chain.push(envFallback);
  chain.push(...policy.fallbackProviders);

  if (process.env.AI_ENABLE_MOCK_FALLBACK !== "false") {
    chain.push("mock");
  }

  return [...new Set(chain)];
}

export function getModelForProvider(provider: AIProviderId): string {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
    case "openai":
      return process.env.OPENAI_MODEL ?? "gpt-4o";
    case "google":
      return process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-pro";
    case "mistral":
      return process.env.MISTRAL_MODEL ?? "mistral-large-latest";
    case "groq":
      return process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    case "local":
      return process.env.LOCAL_AI_MODEL ?? "local";
    case "mock":
      return "mock";
    default:
      return "unknown";
  }
}

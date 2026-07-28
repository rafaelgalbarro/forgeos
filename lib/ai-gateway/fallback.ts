/** ForgeOS AI Gateway — fallback chain execution. */

import { withConcurrencyLimit } from "./cost-guard";
import { AllProvidersFailedError } from "./errors";
import { getModelForProvider, getPolicyForTask, resolveProviderChain } from "./model-policy";
import { getProvider } from "./registry";
import { estimateCost } from "./response-parser";
import type {
  AIGatewayResponse,
  AITask,
  AIProviderId,
  CompletionResult,
} from "./types";

export interface CompleteTaskParams {
  task: AITask;
  system: string;
  user: string;
  providerOverride?: AIProviderId;
  warnings?: string[];
}

export async function completeWithFallback(
  params: CompleteTaskParams
): Promise<AIGatewayResponse & { raw: CompletionResult }> {
  const policy = getPolicyForTask(params.task);
  const chain = resolveProviderChain(params.task, params.providerOverride);
  const warnings = [...(params.warnings ?? [])];
  const errors: string[] = [];

  let lastResult: CompletionResult | null = null;
  let fallbackUsed = false;
  let usedProvider: AIProviderId | null = null;

  for (let i = 0; i < chain.length; i++) {
    const providerId = chain[i];
    const provider = getProvider(providerId);

    if (!provider.isConfigured()) {
      errors.push(`${providerId}: not configured`);
      continue;
    }

    if (providerId === "mock" && !policy.allowsMock) {
      errors.push("mock: not allowed for this task");
      continue;
    }

    try {
      const result = await withConcurrencyLimit(() =>
        provider.complete({
          system: params.system,
          user: params.user,
          model: getModelForProvider(providerId),
          temperature: policy.temperature,
          maxTokens: policy.maxTokens,
          requiresJson: policy.requiresJson,
        })
      );

      lastResult = result;
      usedProvider = providerId;
      fallbackUsed = i > 0;
      break;
    } catch (err) {
      errors.push(`${providerId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!lastResult || !usedProvider) {
    throw new AllProvidersFailedError(params.task, errors);
  }

  const costEstimate = estimateCost(
    lastResult.inputTokensEstimate,
    lastResult.outputTokensEstimate,
    policy.estimatedCostPer1kTokens
  );

  return {
    output: lastResult.text,
    provider: usedProvider,
    model: lastResult.model,
    fallbackUsed,
    costEstimate,
    warnings,
    metadata: {
      task: params.task,
      inputTokensEstimate: lastResult.inputTokensEstimate,
      outputTokensEstimate: lastResult.outputTokensEstimate,
      providerChain: chain,
      errorsAttempted: errors,
    },
    raw: lastResult,
  };
}

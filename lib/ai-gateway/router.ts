/** ForgeOS AI Gateway — task router. */

import { guardInput } from "./cost-guard";
import { completeWithFallback } from "./fallback";
import { getPolicyForTask, resolveProviderChain } from "./model-policy";
import type { AIGatewayRequest, AIGatewayResponse, AITask, AIProviderId } from "./types";

export function routeTask(
  task: AITask,
  providerOverride?: AIProviderId
): { task: AITask; providers: AIProviderId[]; policy: ReturnType<typeof getPolicyForTask> } {
  return {
    task,
    providers: resolveProviderChain(task, providerOverride),
    policy: getPolicyForTask(task),
  };
}

export async function runAITask(request: AIGatewayRequest): Promise<AIGatewayResponse> {
  const system = request.context?.system ?? "You are ForgeOS, an AI venture studio assistant.";
  const guarded = guardInput(system, request.input);

  const result = await completeWithFallback({
    task: request.task,
    system: guarded.system,
    user: guarded.user,
    providerOverride: request.provider,
    warnings: guarded.warnings,
  });

  const { raw: _raw, ...response } = result;
  return {
    ...response,
    metadata: {
      ...response.metadata,
      truncated: guarded.truncated,
      ...(request.context?.metadata ?? {}),
    },
  };
}

/** Convenience for modules that already build system/user prompts. */
export async function completeAITask(params: {
  task: AITask;
  system: string;
  user: string;
  provider?: AIProviderId;
}): Promise<AIGatewayResponse> {
  return runAITask({
    task: params.task,
    input: params.user,
    context: { system: params.system },
    provider: params.provider,
  });
}

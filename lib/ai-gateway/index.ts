/** ForgeOS AI Gateway — public API. */

export type {
  AIProviderId,
  AITask,
  AIGatewayRequest,
  AIGatewayResponse,
  ModelPolicy,
} from "./types";

export { AIGatewayError, AllProvidersFailedError, ProviderNotConfiguredError } from "./errors";
export { extractJSON, parseJSONResponse, estimateCost } from "./response-parser";
export { TASK_POLICIES, getPolicyForTask, resolveProviderChain, getModelForProvider } from "./model-policy";
export { guardInput, withConcurrencyLimit } from "./cost-guard";
export { createProvider, getConfiguredProviders, listProviderIds } from "./provider";
export { getProvider, listConfiguredProviders } from "./registry";
export { completeWithFallback } from "./fallback";
export { routeTask, runAITask, completeAITask } from "./router";
export { buildSystemPrompt } from "./prompts";

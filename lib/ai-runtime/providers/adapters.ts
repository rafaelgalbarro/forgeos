/** ForgeOS AI Runtime — extended provider adapter execution (RC6). */

import { completeAITask } from "@/lib/ai-gateway/router";
import { getPolicyForTask } from "@/lib/ai-gateway/model-policy";
import { getConfiguredProviders } from "@/lib/ai-gateway/provider";
import type { AITask, AIProviderId } from "@/lib/ai-gateway/types";
import { isRealAiEnabled, env } from "../config";
import { resolveRuntimeModel, toGatewayProvider } from "../router/model-router";
import type { RuntimeProviderId } from "../types";
import { callCohere, callOpenAICompatible } from "./openai-compatible";
import { getProvider } from "./provider-factory";

export interface AdapterExecuteParams {
  provider: RuntimeProviderId;
  task: AITask;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  requiresJson?: boolean;
}

export interface AdapterExecuteResult {
  output: string;
  provider: RuntimeProviderId;
  model: string;
  fallbackUsed: boolean;
  costEstimate: number;
  inputTokens: number;
  outputTokens: number;
}

export function isRuntimeProviderConfigured(id: RuntimeProviderId): boolean {
  const adapter = getProvider(id);
  if (adapter?.isConfigured()) return true;

  const gateway = toGatewayProvider(id);
  if (gateway) {
    return getConfiguredProviders().includes(gateway);
  }

  switch (id) {
    case "openrouter":
      return Boolean(env("OPENROUTER_API_KEY"));
    case "deepseek":
      return Boolean(env("DEEPSEEK_API_KEY"));
    case "azure-openai":
      return Boolean((env("AZURE_OPENAI_KEY") || env("AZURE_OPENAI_API_KEY")) && env("AZURE_OPENAI_ENDPOINT"));
    case "aws-bedrock":
      return Boolean(env("AWS_BEDROCK_REGION"));
    case "vertex-ai":
      return Boolean(env("VERTEX_AI_API_KEY") || env("GOOGLE_AI_API_KEY"));
    case "cohere":
      return Boolean(env("COHERE_API_KEY"));
    case "xai":
      return Boolean(env("XAI_API_KEY"));
    case "ollama":
      return Boolean(env("OLLAMA_BASE_URL") ?? "http://localhost:11434");
    case "lmstudio":
      return Boolean(env("LM_STUDIO_BASE_URL") || env("LMSTUDIO_BASE_URL") || "http://localhost:1234");
    case "llama":
      return Boolean(env("LLAMA_API_KEY") || env("GROQ_API_KEY"));
    case "mcp":
      return false;
    case "mock":
      return true;
    default:
      return false;
  }
}

/** RC6 — execute via provider adapter interface when real AI enabled. */
export async function executeWithProviderAdapter(
  params: AdapterExecuteParams
): Promise<AdapterExecuteResult> {
  const policy = getPolicyForTask(params.task);
  const adapter = getProvider(params.provider);

  if (adapter?.isConfigured()) {
    const model = resolveRuntimeModel(params.provider);
    const result = await adapter.execute({
      model,
      system: params.system,
      user: params.user,
      temperature: params.temperature ?? policy.temperature,
      maxTokens: params.maxTokens ?? policy.maxTokens,
      requiresJson: params.requiresJson ?? policy.requiresJson,
    });

    return {
      output: result.output,
      provider: params.provider,
      model: result.model,
      fallbackUsed: false,
      costEstimate: result.costEstimate,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  }

  return executeWithRuntimeAdapter(params);
}

export async function executeWithRuntimeAdapter(
  params: AdapterExecuteParams
): Promise<AdapterExecuteResult> {
  if (isRealAiEnabled()) {
    const adapter = getProvider(params.provider);
    if (adapter?.isConfigured()) {
      return executeWithProviderAdapter(params);
    }
  }

  const policy = getPolicyForTask(params.task);
  const gatewayId = toGatewayProvider(params.provider);

  if (gatewayId) {
    const res = await completeAITask({
      task: params.task,
      system: params.system,
      user: params.user,
      provider: gatewayId as AIProviderId,
    });
    return {
      output: res.output,
      provider: params.provider,
      model: res.model,
      fallbackUsed: res.fallbackUsed,
      costEstimate: res.costEstimate,
      inputTokens: Math.ceil((params.system.length + params.user.length) / 4),
      outputTokens: Math.ceil(res.output.length / 4),
    };
  }

  const model = resolveRuntimeModel(params.provider);

  if (params.provider === "mcp") {
    throw new Error("MCP adapter pending — Model Context Protocol not yet stable");
  }

  if (params.provider === "aws-bedrock") {
    throw new Error("AWS Bedrock adapter stub — configure AWS_BEDROCK_REGION for future release");
  }

  if (params.provider === "cohere" && env("COHERE_API_KEY")) {
    const result = await callCohere({
      apiKey: env("COHERE_API_KEY")!,
      model,
      system: params.system,
      user: params.user,
      temperature: policy.temperature,
      maxTokens: policy.maxTokens,
    });
    const cost = (result.inputTokensEstimate + result.outputTokensEstimate) * 0.000007;
    return {
      output: result.text,
      provider: "cohere",
      model,
      fallbackUsed: false,
      costEstimate: cost,
      inputTokens: result.inputTokensEstimate,
      outputTokens: result.outputTokensEstimate,
    };
  }

  const openAiConfigs: Partial<Record<RuntimeProviderId, { baseUrl: string; apiKey: string }>> = {
    openrouter: {
      baseUrl: env("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1",
      apiKey: env("OPENROUTER_API_KEY") ?? "",
    },
    deepseek: {
      baseUrl: env("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1",
      apiKey: env("DEEPSEEK_API_KEY") ?? "",
    },
    "azure-openai": {
      baseUrl: `${env("AZURE_OPENAI_ENDPOINT")?.replace(/\/$/, "")}/openai/deployments/${model}`,
      apiKey: env("AZURE_OPENAI_KEY") ?? env("AZURE_OPENAI_API_KEY") ?? "",
    },
    xai: {
      baseUrl: env("XAI_BASE_URL") ?? "https://api.x.ai/v1",
      apiKey: env("XAI_API_KEY") ?? "",
    },
    ollama: {
      baseUrl: `${env("OLLAMA_BASE_URL") ?? "http://localhost:11434"}/v1`,
      apiKey: "ollama",
    },
    lmstudio: {
      baseUrl: `${(env("LM_STUDIO_BASE_URL") ?? env("LMSTUDIO_BASE_URL") ?? "http://localhost:1234")}/v1`,
      apiKey: "lmstudio",
    },
    llama: {
      baseUrl: env("LLAMA_BASE_URL") ?? env("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1",
      apiKey: env("LLAMA_API_KEY") ?? env("GROQ_API_KEY") ?? "",
    },
    "vertex-ai": {
      baseUrl: env("VERTEX_AI_BASE_URL") ?? "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: env("VERTEX_AI_API_KEY") ?? env("GOOGLE_AI_API_KEY") ?? "",
    },
  };

  const cfg = openAiConfigs[params.provider];
  if (!cfg?.apiKey) {
    throw new Error(`Provider ${params.provider} is not configured`);
  }

  const result = await callOpenAICompatible({
    ...cfg,
    model,
    system: params.system,
    user: params.user,
    temperature: policy.temperature,
    maxTokens: policy.maxTokens,
    requiresJson: policy.requiresJson,
    provider: params.provider,
  });

  const cost =
    ((result.inputTokensEstimate + result.outputTokensEstimate) / 1000) *
    policy.estimatedCostPer1kTokens;

  return {
    output: result.text,
    provider: params.provider,
    model,
    fallbackUsed: false,
    costEstimate: cost,
    inputTokens: result.inputTokensEstimate,
    outputTokens: result.outputTokensEstimate,
  };
}

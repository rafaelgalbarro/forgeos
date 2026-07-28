/** ForgeOS AI Runtime RC6 — shared OpenAI-compatible provider base. */

import { estimateTokens } from "@/lib/ai-gateway/response-parser";
import { env } from "../config";
import type { RuntimeProviderId } from "../types";
import {
  AbstractProviderAdapter,
  type ProviderExecuteParams,
  type ProviderExecuteResult,
  type ProviderHealthResult,
} from "./provider-interface";

export interface OpenAiCompatibleConfig {
  id: RuntimeProviderId;
  label: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  costPer1k: number;
  latencyMs: number;
  models?: string[];
  extraHeaders?: Record<string, string>;
}

export class OpenAiCompatibleProvider extends AbstractProviderAdapter {
  readonly id: RuntimeProviderId;
  readonly label: string;
  private readonly cfg: OpenAiCompatibleConfig;

  constructor(cfg: OpenAiCompatibleConfig) {
    super();
    this.id = cfg.id;
    this.label = cfg.label;
    this.cfg = cfg;
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.apiKey);
  }

  async models(): Promise<string[]> {
    return this.cfg.models ?? [this.cfg.defaultModel];
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return ((inputTokens + outputTokens) / 1000) * this.cfg.costPer1k;
  }

  estimateLatency(): number {
    return this.cfg.latencyMs;
  }

  async health(): Promise<ProviderHealthResult> {
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, message: "API key missing" };
    }
    const started = Date.now();
    try {
      const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/models`, {
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
          ...this.cfg.extraHeaders,
        },
        signal: AbortSignal.timeout(5000),
      });
      return {
        ok: res.ok || res.status === 404,
        latencyMs: Date.now() - started,
        message: res.ok ? "Healthy" : `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : "Health check failed",
      };
    }
  }

  protected async doExecute(params: ProviderExecuteParams): Promise<ProviderExecuteResult> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body: Record<string, unknown> = {
      model: params.model || this.cfg.defaultModel,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    };
    if (params.requiresJson) body.response_format = { type: "json_object" };
    if (params.stream) body.stream = true;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
        ...this.cfg.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`${this.label} API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${this.label} returned no content`);

    const inputTokens = json.usage?.prompt_tokens ?? estimateTokens(params.system + params.user);
    const outputTokens = json.usage?.completion_tokens ?? estimateTokens(content as string);

    return {
      output: content as string,
      model: (json.model as string) ?? params.model,
      inputTokens,
      outputTokens,
      costEstimate: this.estimateCost(inputTokens, outputTokens),
      latencyMs: 0,
    };
  }
}

export function buildOpenAiProvider(): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKey: env("OPENAI_API_KEY") ?? "",
    defaultModel: env("OPENAI_MODEL") ?? "gpt-4o",
    costPer1k: 0.012,
    latencyMs: 1800,
    models: ["gpt-4o", "gpt-4o-mini", "o1-mini"],
  });
}

export function buildOpenRouterProvider(): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: env("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1",
    apiKey: env("OPENROUTER_API_KEY") ?? "",
    defaultModel: env("OPENROUTER_MODEL") ?? "openai/gpt-4o",
    costPer1k: 0.01,
    latencyMs: 2000,
    extraHeaders: { "HTTP-Referer": "https://forgeos.app", "X-Title": "ForgeOS" },
  });
}

export function buildDeepSeekProvider(): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: env("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1",
    apiKey: env("DEEPSEEK_API_KEY") ?? "",
    defaultModel: env("DEEPSEEK_MODEL") ?? "deepseek-chat",
    costPer1k: 0.003,
    latencyMs: 1400,
  });
}

export function buildMistralProvider(): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: "mistral",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKey: env("MISTRAL_API_KEY") ?? "",
    defaultModel: env("MISTRAL_MODEL") ?? "mistral-large-latest",
    costPer1k: 0.006,
    latencyMs: 1200,
  });
}

export function buildOllamaProvider(): OpenAiCompatibleProvider {
  const base = env("OLLAMA_BASE_URL") ?? "http://localhost:11434";
  return new OpenAiCompatibleProvider({
    id: "ollama",
    label: "Ollama",
    baseUrl: `${base}/v1`,
    apiKey: "ollama",
    defaultModel: env("OLLAMA_MODEL") ?? "llama3.2",
    costPer1k: 0,
    latencyMs: 3000,
  });
}

export function buildLmStudioProvider(): OpenAiCompatibleProvider {
  const base = env("LM_STUDIO_BASE_URL") ?? env("LMSTUDIO_BASE_URL") ?? "http://localhost:1234";
  return new OpenAiCompatibleProvider({
    id: "lmstudio",
    label: "LM Studio",
    baseUrl: `${base}/v1`,
    apiKey: "lmstudio",
    defaultModel: env("LMSTUDIO_MODEL") ?? "local-model",
    costPer1k: 0,
    latencyMs: 3500,
  });
}

export function buildLlamaProvider(): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: "llama",
    label: "Meta Llama",
    baseUrl: env("LLAMA_BASE_URL") ?? env("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1",
    apiKey: env("LLAMA_API_KEY") ?? env("GROQ_API_KEY") ?? "",
    defaultModel: env("LLAMA_MODEL") ?? env("GROQ_MODEL") ?? "llama-3.3-70b-versatile",
    costPer1k: 0.004,
    latencyMs: 900,
  });
}

export function buildAzureOpenAiProvider(): OpenAiCompatibleProvider {
  const endpoint = env("AZURE_OPENAI_ENDPOINT");
  const model = env("AZURE_OPENAI_MODEL") ?? "gpt-4o";
  const key = env("AZURE_OPENAI_KEY") ?? env("AZURE_OPENAI_API_KEY") ?? "";
  return new OpenAiCompatibleProvider({
    id: "azure-openai",
    label: "Azure OpenAI",
    baseUrl: endpoint ? `${endpoint.replace(/\/$/, "")}/openai/deployments/${model}` : "",
    apiKey: key,
    defaultModel: model,
    costPer1k: 0.014,
    latencyMs: 2000,
    extraHeaders: { "api-key": key },
  });
}

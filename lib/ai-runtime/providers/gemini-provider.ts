/** ForgeOS AI Runtime RC6 — Google Gemini adapter. */

import { estimateTokens } from "@/lib/ai-gateway/response-parser";
import { env } from "../config";
import type { RuntimeProviderId } from "../types";
import {
  AbstractProviderAdapter,
  type ProviderExecuteParams,
  type ProviderExecuteResult,
  type ProviderHealthResult,
} from "./provider-interface";

export class GeminiProvider extends AbstractProviderAdapter {
  readonly id: RuntimeProviderId = "google";
  readonly label = "Google Gemini";

  private get apiKey(): string {
    return env("GEMINI_API_KEY") ?? env("GOOGLE_AI_API_KEY") ?? "";
  }

  private get defaultModel(): string {
    return env("GOOGLE_AI_MODEL") ?? "gemini-1.5-pro";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async models(): Promise<string[]> {
    return [this.defaultModel, "gemini-1.5-flash", "gemini-2.0-flash"];
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return ((inputTokens + outputTokens) / 1000) * 0.008;
  }

  estimateLatency(): number {
    return 1600;
  }

  async health(): Promise<ProviderHealthResult> {
    if (!this.isConfigured()) return { ok: false, latencyMs: 0, message: "API key missing" };
    const started = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      return {
        ok: res.ok,
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
    const model = params.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.system }] },
        contents: [{ role: "user", parts: [{ text: params.user }] }],
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens ?? 4096,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content");

    const inputTokens = json.usageMetadata?.promptTokenCount ?? estimateTokens(params.system + params.user);
    const outputTokens = json.usageMetadata?.candidatesTokenCount ?? estimateTokens(text);

    return {
      output: text as string,
      model,
      inputTokens,
      outputTokens,
      costEstimate: this.estimateCost(inputTokens, outputTokens),
      latencyMs: 0,
    };
  }
}

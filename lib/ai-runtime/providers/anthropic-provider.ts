/** ForgeOS AI Runtime RC6 — Anthropic Claude adapter. */

import { estimateTokens } from "@/lib/ai-gateway/response-parser";
import { env } from "../config";
import type { RuntimeProviderId } from "../types";
import {
  AbstractProviderAdapter,
  type ProviderExecuteParams,
  type ProviderExecuteResult,
  type ProviderHealthResult,
} from "./provider-interface";

export class AnthropicProvider extends AbstractProviderAdapter {
  readonly id: RuntimeProviderId = "anthropic";
  readonly label = "Anthropic Claude";

  private get apiKey(): string {
    return env("ANTHROPIC_API_KEY") ?? "";
  }

  private get defaultModel(): string {
    return env("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async models(): Promise<string[]> {
    return [this.defaultModel, "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"];
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return ((inputTokens + outputTokens) / 1000) * 0.015;
  }

  estimateLatency(): number {
    return 2200;
  }

  async health(): Promise<ProviderHealthResult> {
    if (!this.isConfigured()) return { ok: false, latencyMs: 0, message: "API key missing" };
    return { ok: true, latencyMs: 50, message: "Configured" };
  }

  protected async doExecute(params: ProviderExecuteParams): Promise<ProviderExecuteResult> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        system: params.system,
        messages: [{ role: "user", content: params.user }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const block = json.content?.find((b: { type: string }) => b.type === "text");
    if (!block?.text) throw new Error("Anthropic returned no text");

    const inputTokens = json.usage?.input_tokens ?? estimateTokens(params.system + params.user);
    const outputTokens = json.usage?.output_tokens ?? estimateTokens(block.text);

    return {
      output: block.text as string,
      model: (json.model as string) ?? params.model,
      inputTokens,
      outputTokens,
      costEstimate: this.estimateCost(inputTokens, outputTokens),
      latencyMs: 0,
    };
  }
}

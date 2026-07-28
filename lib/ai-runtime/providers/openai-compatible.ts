/** ForgeOS AI Runtime — OpenAI-compatible provider calls. */

import { estimateTokens } from "@/lib/ai-gateway/response-parser";
import type { RuntimeProviderId } from "../types";

export interface CompatibleCallParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
  requiresJson?: boolean;
  provider: RuntimeProviderId;
}

export interface CompatibleCallResult {
  text: string;
  provider: RuntimeProviderId;
  model: string;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
}

export async function callOpenAICompatible(
  params: CompatibleCallParams
): Promise<CompatibleCallResult> {
  const url = `${params.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body: Record<string, unknown> = {
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  };
  if (params.requiresJson) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`${params.provider} API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${params.provider} returned no content`);

  return {
    text: content as string,
    provider: params.provider,
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(content as string),
  };
}

export async function callCohere(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}): Promise<CompatibleCallResult> {
  const res = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    }),
  });

  if (!res.ok) {
    throw new Error(`Cohere API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const text = json.message?.content?.[0]?.text ?? json.text;
  if (!text) throw new Error("Cohere returned no content");

  return {
    text: text as string,
    provider: "cohere",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(text as string),
  };
}

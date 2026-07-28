/** ForgeOS AI Gateway — provider implementations. */

import type { AIProvider, AIProviderId, CompletionParams, CompletionResult } from "./types";
import { ProviderNotConfiguredError } from "./errors";
import { estimateTokens } from "./response-parser";

async function callAnthropic(params: CompletionParams): Promise<CompletionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ProviderNotConfiguredError("anthropic");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const block = json.content?.find((b: { type: string }) => b.type === "text");
  if (!block?.text) throw new Error("Anthropic returned no text content");
  const text = block.text as string;

  return {
    text,
    provider: "anthropic",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(text),
  };
}

async function callOpenAI(params: CompletionParams): Promise<CompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ProviderNotConfiguredError("openai");

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

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");

  return {
    text: content as string,
    provider: "openai",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(content as string),
  };
}

async function callGoogle(params: CompletionParams): Promise<CompletionResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) throw new ProviderNotConfiguredError("google");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.system }] },
      contents: [{ role: "user", parts: [{ text: params.user }] }],
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Google AI error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Google AI returned no content");

  return {
    text: text as string,
    provider: "google",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(text as string),
  };
}

async function callMistral(params: CompletionParams): Promise<CompletionResult> {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) throw new ProviderNotConfiguredError("mistral");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Mistral API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Mistral returned no content");

  return {
    text: content as string,
    provider: "mistral",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(content as string),
  };
}

async function callGroq(params: CompletionParams): Promise<CompletionResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new ProviderNotConfiguredError("groq");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no content");

  return {
    text: content as string,
    provider: "groq",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(content as string),
  };
}

async function callLocal(params: CompletionParams): Promise<CompletionResult> {
  const baseUrl = process.env.LOCAL_AI_BASE_URL?.trim();
  if (!baseUrl) throw new ProviderNotConfiguredError("local");

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Local AI error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Local AI returned no content");

  return {
    text: content as string,
    provider: "local",
    model: params.model,
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(content as string),
  };
}

async function callMock(params: CompletionParams): Promise<CompletionResult> {
  const payload = {
    mock: true,
    message: "Mock response — configure API keys for live AI.",
    taskHint: params.user.slice(0, 200),
  };
  const text = params.requiresJson ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);

  return {
    text,
    provider: "mock",
    model: "mock",
    inputTokensEstimate: estimateTokens(params.system + params.user),
    outputTokensEstimate: estimateTokens(text),
  };
}

const COMPLETE_FNS: Record<AIProviderId, (p: CompletionParams) => Promise<CompletionResult>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  google: callGoogle,
  mistral: callMistral,
  groq: callGroq,
  local: callLocal,
  mock: callMock,
};

function isProviderConfigured(id: AIProviderId): boolean {
  switch (id) {
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY?.trim());
    case "google":
      return Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
    case "mistral":
      return Boolean(process.env.MISTRAL_API_KEY?.trim());
    case "groq":
      return Boolean(process.env.GROQ_API_KEY?.trim());
    case "local":
      return Boolean(process.env.LOCAL_AI_BASE_URL?.trim());
    case "mock":
      return process.env.AI_ENABLE_MOCK_FALLBACK !== "false";
    default:
      return false;
  }
}

export function createProvider(id: AIProviderId): AIProvider {
  return {
    id,
    isConfigured: () => isProviderConfigured(id),
    complete: (params) => COMPLETE_FNS[id](params),
  };
}

export function listProviderIds(): AIProviderId[] {
  return ["openai", "anthropic", "google", "mistral", "groq", "local", "mock"];
}

export function getConfiguredProviders(): AIProviderId[] {
  return listProviderIds().filter((id) => isProviderConfigured(id));
}

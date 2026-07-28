/** ForgeOS AI Runtime RC6 — Vertex AI adapter. */

import { env } from "../config";
import { OpenAiCompatibleProvider } from "./openai-compatible-base";

export function buildVertexAiProvider(): OpenAiCompatibleProvider {
  const apiKey = env("VERTEX_AI_API_KEY") ?? env("GOOGLE_AI_API_KEY") ?? "";
  const baseUrl =
    env("VERTEX_AI_BASE_URL") ??
    "https://generativelanguage.googleapis.com/v1beta/openai";
  return new OpenAiCompatibleProvider({
    id: "vertex-ai",
    label: "Vertex AI",
    baseUrl,
    apiKey,
    defaultModel: env("VERTEX_AI_MODEL") ?? "gemini-1.5-pro",
    costPer1k: 0.009,
    latencyMs: 1900,
  });
}

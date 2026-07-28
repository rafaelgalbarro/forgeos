import type { AppDraft } from "@/lib/types/app";

export type AIProviderName = "stub" | "openai" | "anthropic";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  provider: AIProviderName;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PRDGenerationRequest {
  app: Pick<AppDraft, "name" | "description" | "category" | "targetAudience">;
}

export interface PRDGenerationResponse {
  prd: string;
  model: string;
  provider: AIProviderName;
}

export interface AIProvider {
  readonly name: AIProviderName;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  generatePRD(request: PRDGenerationRequest): Promise<PRDGenerationResponse>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor(provider: AIProviderName) {
    super(`AI provider "${provider}" is not configured. Check your environment variables.`);
    this.name = "AIProviderNotConfiguredError";
  }
}

export interface AIConfig {
  provider: AIProviderName;
  openai: { apiKey: string; model: string };
  anthropic: { apiKey: string; model: string };
}

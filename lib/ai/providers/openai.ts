import { aiConfig, isProviderConfigured } from "@/lib/ai/config";
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  PRDGenerationRequest,
  PRDGenerationResponse
} from "@/lib/ai/types";
import { AIProviderNotConfiguredError } from "@/lib/ai/types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  private assertConfigured(): void {
    if (!isProviderConfigured("openai")) {
      throw new AIProviderNotConfiguredError("openai");
    }
  }

  async complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    this.assertConfigured();
    // Integration point: call OpenAI Chat Completions API here.
    throw new Error("OpenAI integration not implemented yet.");
  }

  async generatePRD(_request: PRDGenerationRequest): Promise<PRDGenerationResponse> {
    this.assertConfigured();
    throw new Error("OpenAI PRD generation not implemented yet.");
  }

  get defaultModel(): string {
    return aiConfig.openai.model;
  }
}

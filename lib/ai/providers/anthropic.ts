import { aiConfig, isProviderConfigured } from "@/lib/ai/config";
import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  PRDGenerationRequest,
  PRDGenerationResponse
} from "@/lib/ai/types";
import { AIProviderNotConfiguredError } from "@/lib/ai/types";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;

  private assertConfigured(): void {
    if (!isProviderConfigured("anthropic")) {
      throw new AIProviderNotConfiguredError("anthropic");
    }
  }

  async complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    this.assertConfigured();
    // Integration point: call Anthropic Messages API here.
    throw new Error("Anthropic integration not implemented yet.");
  }

  async generatePRD(_request: PRDGenerationRequest): Promise<PRDGenerationResponse> {
    this.assertConfigured();
    throw new Error("Anthropic PRD generation not implemented yet.");
  }

  get defaultModel(): string {
    return aiConfig.anthropic.model;
  }
}

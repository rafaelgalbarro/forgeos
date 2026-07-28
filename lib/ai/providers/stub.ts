import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  PRDGenerationRequest,
  PRDGenerationResponse
} from "@/lib/ai/types";

export class StubAIProvider implements AIProvider {
  readonly name = "stub" as const;

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    return {
      content: `[Stub] Respuesta simulada para: "${lastUser?.content.slice(0, 80) ?? "sin mensaje"}..."`,
      model: "stub-v0",
      provider: this.name
    };
  }

  async generatePRD(request: PRDGenerationRequest): Promise<PRDGenerationResponse> {
    const { app } = request;
    const prd = `# PRD (borrador simulado): ${app.name}

## Resumen
${app.description}

## Categoría
${app.category}

## Público objetivo
${app.targetAudience || "Por definir"}

## Próximos pasos
Conecta un proveedor de IA real (OpenAI o Anthropic) para generar el PRD completo con agentes.`;

    return {
      prd,
      model: "stub-v0",
      provider: this.name
    };
  }
}

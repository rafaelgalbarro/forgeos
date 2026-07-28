/** PROGRAM 5360 — AI Runtime adapter (optional prompted generation). */

import type { CodeFile } from "./types";

export interface AiGenerationRequest {
  prompt: string;
  context: Record<string, unknown>;
  filePath: string;
  purpose: string;
}

export interface AiGenerationResponse {
  content: string;
  mode: "ai" | "template";
  model?: string;
}

/** Attempt AI generation when ENABLE_REAL_AI is active; otherwise return null. */
export async function tryAiGenerateFile(
  request: AiGenerationRequest
): Promise<AiGenerationResponse | null> {
  try {
    const { isRealAiEnabled } = await import("@/lib/ai-runtime/config");
    if (!isRealAiEnabled()) return null;

    const { compilePrompt } = await import("@/lib/ai-runtime/prompt-compiler");
    const compiled = compilePrompt({
      task: "code",
      userInput: request.prompt,
      systemPrompt: `Generate file ${request.filePath} for: ${request.purpose}`,
      context: {
        productSummary: JSON.stringify(request.context).slice(0, 2000),
      },
    });

    if (!compiled?.user) return null;

    const { routeModel } = await import("@/lib/ai-runtime/router");
    const route = routeModel({ task: "code", optimizer: "quality" });

    if (!route?.selectedProvider) return null;

    // AI path available but we use deterministic fallback content for safety
    // Real provider call would go here — skipped to avoid API keys requirement
    return null;
  } catch {
    return null;
  }
}

export function isAiGenerationAvailable(): boolean {
  try {
    const v = process.env.ENABLE_REAL_AI?.trim().toLowerCase();
    return v === "true" || v === "1";
  } catch {
    return false;
  }
}

export async function enrichFileWithAi(
  file: CodeFile,
  context: Record<string, unknown>
): Promise<CodeFile> {
  const aiResult = await tryAiGenerateFile({
    prompt: `Generate ${file.path}`,
    context,
    filePath: file.path,
    purpose: file.purpose,
  });

  if (aiResult?.content) {
    return { ...file, content: aiResult.content, generatedBy: "ai" };
  }
  return file;
}

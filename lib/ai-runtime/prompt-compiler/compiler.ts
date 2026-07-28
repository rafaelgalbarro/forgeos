/** ForgeOS AI Runtime — Prompt Compiler (RC3). */

import { estimateTokens } from "@/lib/ai-gateway/response-parser";
import type { AITask } from "@/lib/ai-gateway/types";
import { buildAIContext, contextBlocksToPromptSection } from "../context-engine";
import type { AIRuntimeContextInput, CompiledPrompt, ContextSource } from "../types";

export function compilePrompt(params: {
  task: AITask;
  userInput: string;
  systemPrompt?: string;
  context?: AIRuntimeContextInput;
}): CompiledPrompt {
  const built = buildAIContext(params.context);
  const contextSection = contextBlocksToPromptSection(built.blocks);

  const baseSystem =
    params.systemPrompt ??
    `You are ForgeOS AI Operating System. Task: ${params.task}. Respond with high-quality structured output.`;

  const system = contextSection
    ? `${baseSystem}\n\n# ForgeOS Context\n${contextSection}`
    : baseSystem;

  const user = params.userInput.trim();
  const sourcesUsed = built.blocks.map((b) => b.source as ContextSource);

  return {
    system,
    user,
    inputTokensEstimate: estimateTokens(system + user),
    sourcesUsed,
  };
}

/** Thin adapter — AI Runtime prompt compiler (public exports only). */

import type { MissionContext } from "../types";

export async function compileCeoPrompt(ctx: MissionContext, instruction: string): Promise<string | null> {
  try {
    const { isRealAiEnabled } = await import("@/lib/ai-runtime/config");
    if (!isRealAiEnabled()) return null;
    const { compilePrompt } = await import("@/lib/ai-runtime/prompt-compiler");
    const compiled = compilePrompt({
      task: "ceo",
      userInput: instruction,
      systemPrompt: `Mission Control CEO co-founder. Mission: ${ctx.title}, Phase: ${ctx.phase}`,
      context: {
        ventureName: ctx.title,
        ventureId: ctx.missionId,
        productSummary: ctx.idea,
        buildContextSummary: `Phase: ${ctx.phase}, Intention: ${ctx.intention ?? "unset"}`,
      },
    });
    return `${compiled.system}\n\n${compiled.user}`;
  } catch {
    return null;
  }
}

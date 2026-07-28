/** Thin adapter — AI Runtime context engine (public exports only). */

import type { MissionContext } from "../types";

export async function buildMissionContextBlocks(ctx: MissionContext): Promise<string[]> {
  try {
    const { buildAIContext } = await import("@/lib/ai-runtime/context-engine");
    const built = buildAIContext({
      ventureName: ctx.title,
      ventureId: ctx.missionId,
      productSummary: ctx.idea,
      buildContextSummary: `Phase: ${ctx.phase}, Intention: ${ctx.intention ?? "unset"}`,
    });
    return built.blocks.map((b) => `[${b.source}] ${b.content}`);
  } catch {
    return [
      `Venture: ${ctx.title}`,
      ctx.idea ? `Idea: ${ctx.idea}` : "",
      `Phase: ${ctx.phase}`,
      `Intention: ${ctx.intention ?? "pending"}`,
    ].filter(Boolean);
  }
}

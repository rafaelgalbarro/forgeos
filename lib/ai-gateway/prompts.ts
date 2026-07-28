/** ForgeOS AI Gateway — shared prompt utilities. */

import type { AITask } from "./types";

export function buildSystemPrompt(task: AITask): string {
  const base =
    "You are ForgeOS, an AI venture studio assistant. Be precise, evidence-driven, and founder-centric.";

  const byTask: Partial<Record<AITask, string>> = {
    research: `${base} Produce structured market research as valid JSON.`,
    product: `${base} Produce a structured PRD as valid JSON.`,
    ceo: `${base} Provide executive-level strategic guidance.`,
    board: `${base} Simulate a board discussion with balanced perspectives.`,
    strategy: `${base} Validate venture strategy with clear decision gates.`,
    "build-plan": `${base} Outline a technical build plan as structured JSON.`,
    legal: `${base} Provide high-level legal considerations (not legal advice).`,
    marketing: `${base} Draft go-to-market and positioning guidance.`,
    code: `${base} Generate production-quality code with clear structure.`,
    classification: `${base} Classify input quickly as compact JSON.`,
  };

  return byTask[task] ?? base;
}

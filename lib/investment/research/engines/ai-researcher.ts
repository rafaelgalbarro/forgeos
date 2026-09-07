import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";
import type { EngineRunResult } from "../types";

/**
 * AI Researcher — composes an executive summary from other engine outputs.
 * Deterministic template (no LLM required); never invents market facts.
 */
export function buildExecutiveSummary(
  symbol: string,
  engines: readonly EngineRunResult[],
): string {
  const live = engines.filter((e) => e.status === "LIVE" || e.status === "PARTIAL");
  const stubs = engines.filter((e) => e.status === "STUB");
  const missing = engines.filter(
    (e) => e.status === "CONFIG_REQUIRED" || e.status === "NO_DATA",
  );

  const parts: string[] = [
    `Research brief for ${symbol} (ANALYSIS_ONLY).`,
  ];

  if (live.length) {
    parts.push(
      `Covered by ${live.length} live/partial engine(s): ${live.map((e) => e.engineId).join(", ")}.`,
    );
    for (const e of live.slice(0, 4)) {
      parts.push(`${e.title}: ${e.summary}`);
    }
  } else {
    parts.push("No LIVE engine coverage yet — configure MI providers or gather data.");
  }

  if (missing.length) {
    parts.push(
      `Unavailable (${missing.length}): ${missing.map((e) => `${e.engineId}=${e.status}`).join(", ")}.`,
    );
  }
  if (stubs.length) {
    parts.push(`Stub engines (not LIVE): ${stubs.map((e) => e.engineId).join(", ")}.`);
  }

  parts.push("No orders. No fabricated Reuters/Bloomberg content.");
  return parts.join(" ");
}

export const aiResearcherEngine: ResearchEngine = {
  id: "ai-researcher",
  title: "AI Researcher",
  description: "Auto executive summary from available engine outputs (deterministic, no invented facts).",
  resolveWiring(ctx) {
    return ctx.providersConfigured > 0 ? "LIVE" : "CONFIG_REQUIRED";
  },
  run(ctx: ResearchEngineContext) {
    // Orchestrator replaces this with a full multi-engine summary; standalone run is a placeholder.
    return baseResult(
      "ai-researcher",
      "AI Researcher",
      {
        status: ctx.providersConfigured > 0 ? "PARTIAL" : "CONFIG_REQUIRED",
        summary:
          "AI Researcher runs after peer engines in the orchestrator to compose the dossier brief.",
        lines: ["Composed in orchestrator from peer engine outputs"],
        itemCount: 0,
        providers: [],
        evidence: [],
        signal: null,
      },
      ctx.generatedAt,
    );
  },
};

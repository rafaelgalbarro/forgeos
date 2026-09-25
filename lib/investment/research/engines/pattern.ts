import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

/**
 * Pattern detection — STUB wired for future signal/opportunity logic.
 * Surfaces honest STUB status; does not invent chart patterns.
 */
export const patternEngine: ResearchEngine = {
  id: "pattern",
  title: "Pattern Engine",
  description: "Pattern detection stub — hooks future/existing signal logic; no invented patterns.",
  resolveWiring() {
    return "STUB";
  },
  run(ctx: ResearchEngineContext) {
    const hasBars =
      (ctx.mi?.marketSnapshots.find((s) => s.symbol.toUpperCase() === ctx.symbol.toUpperCase())
        ?.timeSeries?.points.length ?? 0) >= 20;

    return baseResult(
      "pattern",
      "Pattern Engine",
      {
        status: "STUB",
        summary: hasBars
          ? "STUB — bars present; pattern classifiers not yet wired to production signal engine."
          : "STUB — awaiting bars + pattern classifiers (no fabricated breakouts).",
        lines: [
          "STUB — not LIVE",
          hasBars ? "History available for future pattern pass" : "History: NO_DATA",
          "Integration target: opportunity detection-rules / continuous-analysis signals",
        ],
        itemCount: 0,
        providers: [],
        evidence: [],
        signal: null,
      },
      ctx.generatedAt,
    );
  },
};

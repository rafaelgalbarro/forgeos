import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

/** Sentiment from configured MI sentiment providers. */
export const sentimentEngine: ResearchEngine = {
  id: "sentiment",
  title: "Sentiment Engine",
  description: "Sentiment signals from configured providers (Finnhub, Alpha Vantage, etc.).",
  resolveWiring(ctx) {
    if (ctx.sentimentProviders.length === 0) return "CONFIG_REQUIRED";
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.sentimentProviders.length === 0) {
      return baseResult(
        "sentiment",
        "Sentiment Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "No sentiment providers configured.",
          lines: ["CONFIG_REQUIRED"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const all = ctx.mi?.sentiment ?? [];
    const signals = all.filter(
      (s) =>
        s.target.toUpperCase() === ctx.symbol.toUpperCase() ||
        s.target.toUpperCase() === "MARKET" ||
        s.target === "*",
    );
    const use = signals.length ? signals : all;

    if (!use.length) {
      return baseResult(
        "sentiment",
        "Sentiment Engine",
        {
          status: "NO_DATA",
          summary: "Sentiment providers configured but no signals returned.",
          lines: [`Providers: ${ctx.sentimentProviders.join(", ")}`],
          itemCount: 0,
          providers: ctx.sentimentProviders,
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const avg =
      use.reduce((a, s) => a + s.score, 0) / use.length;
    const conf =
      use.reduce((a, s) => a + s.confidence, 0) / use.length;

    return baseResult(
      "sentiment",
      "Sentiment Engine",
      {
        status: "LIVE",
        summary: `${use.length} sentiment signal(s); avg score ${avg.toFixed(2)}.`,
        lines: use.slice(0, 6).map(
          (s) =>
            `${s.target}: score=${s.score.toFixed(2)} conf=${s.confidence.toFixed(2)} (${s.providerId})`,
        ),
        itemCount: use.length,
        providers: [...new Set(use.map((s) => s.providerId))],
        evidence: use.slice(0, 3).map((s) => s.signalId),
        signal: Math.max(0, Math.min(100, ((avg + 1) / 2) * 100 * conf)),
      },
      ctx.generatedAt,
    );
  },
};

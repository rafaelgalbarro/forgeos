import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

/**
 * Company fundamentals/ratios from available market snapshots.
 * Full fundamental ratios require provider fields — placeholders marked NO_DATA when absent.
 */
export const companyEngine: ResearchEngine = {
  id: "company",
  title: "Company Engine",
  description: "Fundamentals/ratios from MI market snapshots and screener gather — no invented ratios.",
  resolveWiring(ctx) {
    if (ctx.marketProviders.length === 0) return "CONFIG_REQUIRED";
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.marketProviders.length === 0) {
      return baseResult(
        "company",
        "Company Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "No market providers for fundamentals gather.",
          lines: ["CONFIG_REQUIRED — set market provider API keys"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const snap = ctx.mi?.marketSnapshots.find(
      (s) => s.symbol.toUpperCase() === ctx.symbol.toUpperCase(),
    );

    if (!snap?.quote) {
      return baseResult(
        "company",
        "Company Engine",
        {
          status: "NO_DATA",
          summary: `No quote/snapshot for ${ctx.symbol}. PE/ROE ratios: NO_DATA until provider returns them.`,
          lines: [
            "Quote: NO_DATA",
            "PE / PB / ROE: NO_DATA (not fabricated)",
            `Providers: ${ctx.marketProviders.join(", ") || "none"}`,
          ],
          itemCount: 0,
          providers: ctx.marketProviders,
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const lines = [
      `Price: ${snap.quote.price} ${snap.quote.currency}`,
      `Provider: ${snap.quote.providerId}`,
      `Asset class: ${snap.assetClass ?? "NO_DATA"}`,
      "PE / PB / ROE: NO_DATA — ratio fields not on MarketSnapshot (wire screener when available)",
    ];

    return baseResult(
      "company",
      "Company Engine",
      {
        status: "PARTIAL",
        summary: `Quote live for ${ctx.symbol}; fundamental ratios not yet on snapshot schema.`,
        lines,
        itemCount: 1,
        providers: [snap.providerId],
        evidence: [`quote:${snap.quote.price}`],
        signal: 45,
      },
      ctx.generatedAt,
    );
  },
};

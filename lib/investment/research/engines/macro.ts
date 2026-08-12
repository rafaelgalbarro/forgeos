import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

/** Macro / economic via FRED, ECB, WorldBank, Alpha Vantage economic adapters. */
export const macroEngine: ResearchEngine = {
  id: "macro",
  title: "Macro Engine",
  description: "Economic indicators from configured FRED/ECB/WorldBank/etc. providers.",
  resolveWiring(ctx) {
    if (ctx.economicProviders.length === 0) return "CONFIG_REQUIRED";
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.economicProviders.length === 0) {
      return baseResult(
        "macro",
        "Macro Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "No economic providers — configure FRED_API_KEY / ECB_ENABLED / WORLDBANK_ENABLED.",
          lines: ["CONFIG_REQUIRED"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const indicators = ctx.mi?.economicIndicators ?? [];
    if (!indicators.length) {
      return baseResult(
        "macro",
        "Macro Engine",
        {
          status: "NO_DATA",
          summary: "Economic providers configured but no indicators in this gather.",
          lines: [`Providers: ${ctx.economicProviders.join(", ")}`],
          itemCount: 0,
          providers: ctx.economicProviders,
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    return baseResult(
      "macro",
      "Macro Engine",
      {
        status: "LIVE",
        summary: `${indicators.length} economic indicator(s).`,
        lines: indicators.slice(0, 8).map(
          (i) => `${i.label}: ${i.value}${i.unit ? ` ${i.unit}` : ""} (${i.period})`,
        ),
        itemCount: indicators.length,
        providers: [...new Set(indicators.map((i) => i.providerId))],
        evidence: indicators.slice(0, 4).map((i) => i.key),
        signal: Math.min(100, 40 + indicators.length * 8),
      },
      ctx.generatedAt,
    );
  },
};

import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";

/** Continuous news from configured MI news providers (NEWSAPI, RSS, Yahoo, etc.). */
export const newsEngine: ResearchEngine = {
  id: "news",
  title: "News Engine",
  description: "Configured news/RSS/official releases via Market Intelligence — no fabricated headlines.",
  resolveWiring(ctx) {
    if (ctx.newsProviders.length === 0) return "CONFIG_REQUIRED";
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.newsProviders.length === 0) {
      return baseResult(
        "news",
        "News Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "No news providers configured — set NEWSAPI_KEY / RSS_FEED_URLS / Finnhub / FMP / etc.",
          lines: ["CONFIG_REQUIRED — never invents Reuters/Bloomberg content"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const news = ctx.mi?.news ?? [];
    const forSymbol = news.filter(
      (n) =>
        !n.symbols?.length ||
        n.symbols.some((s) => s.toUpperCase() === ctx.symbol.toUpperCase()),
    );
    const items = forSymbol.length ? forSymbol : news.slice(0, 8);

    if (!items.length) {
      return baseResult(
        "news",
        "News Engine",
        {
          status: "NO_DATA",
          summary: "Providers configured but no news items returned for this gather.",
          lines: [`Providers: ${ctx.newsProviders.join(", ")}`, "NO_DATA — empty gather"],
          itemCount: 0,
          providers: ctx.newsProviders,
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    return baseResult(
      "news",
      "News Engine",
      {
        status: "LIVE",
        summary: `${items.length} headline(s) from configured providers.`,
        lines: items.slice(0, 6).map((n) => `${n.source}: ${n.title}`),
        itemCount: items.length,
        providers: [...new Set(items.map((n) => n.providerId))],
        evidence: items.slice(0, 3).map((n) => n.id),
        signal: Math.min(100, items.length * 12),
      },
      ctx.generatedAt,
    );
  },
};

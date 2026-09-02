import type { ResearchEngine, ResearchEngineContext } from "./contract";
import { baseResult } from "./contract";
import type { ResearchEvent } from "../types";

const EARNINGS_RE = /\b(earnings|EPS|results|quarterly|guidance)\b/i;
const DIVIDEND_RE = /\b(dividend|ex-div|payout|yield)\b/i;
const MACRO_RE = /\b(FOMC|CPI|NFP|GDP|rate decision|ECB|Fed|inflation)\b/i;

/** Detect earnings/dividends/macro calendar hints from MI news + economic labels. */
export const eventsEngine: ResearchEngine = {
  id: "events",
  title: "Events Engine",
  description: "Earnings/dividend/macro event detection from MI news and economic releases.",
  resolveWiring(ctx) {
    if (ctx.newsProviders.length + ctx.economicProviders.length === 0) {
      return "CONFIG_REQUIRED";
    }
    return "LIVE";
  },
  run(ctx: ResearchEngineContext) {
    if (ctx.newsProviders.length + ctx.economicProviders.length === 0) {
      return baseResult(
        "events",
        "Events Engine",
        {
          status: "CONFIG_REQUIRED",
          summary: "Need news or economic providers for event detection.",
          lines: ["CONFIG_REQUIRED"],
          itemCount: 0,
          providers: [],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    const events: ResearchEvent[] = [];
    for (const n of ctx.mi?.news ?? []) {
      const text = `${n.title} ${n.summary ?? ""}`;
      let kind: ResearchEvent["kind"] = "other";
      if (EARNINGS_RE.test(text)) kind = "earnings";
      else if (DIVIDEND_RE.test(text)) kind = "dividend";
      else if (MACRO_RE.test(text)) kind = "macro";
      else continue;
      events.push({
        id: `evt-news-${n.id}`,
        kind,
        title: n.title,
        when: n.publishedAt || null,
        symbol: n.symbols?.[0],
        source: n.providerId,
      });
    }
    for (const ind of ctx.mi?.economicIndicators ?? []) {
      if (MACRO_RE.test(`${ind.key} ${ind.label}`)) {
        events.push({
          id: `evt-macro-${ind.key}-${ind.period}`,
          kind: "macro",
          title: `${ind.label}: ${ind.value}`,
          when: ind.period,
          source: ind.providerId,
        });
      }
    }

    if (!events.length) {
      return baseResult(
        "events",
        "Events Engine",
        {
          status: "NO_DATA",
          summary: "No earnings/dividend/macro events detected in current gather.",
          lines: ["NO_DATA — no calendar matches in news/economic items"],
          itemCount: 0,
          providers: [...ctx.newsProviders, ...ctx.economicProviders],
          evidence: [],
          signal: null,
        },
        ctx.generatedAt,
      );
    }

    return baseResult(
      "events",
      "Events Engine",
      {
        status: "LIVE",
        summary: `${events.length} event(s) detected from MI.`,
        lines: events.slice(0, 8).map((e) => `[${e.kind}] ${e.title}`),
        itemCount: events.length,
        providers: [...new Set(events.map((e) => e.source))],
        evidence: events.slice(0, 4).map((e) => e.id),
        signal: Math.min(100, 30 + events.length * 10),
      },
      ctx.generatedAt,
    );
  },
};

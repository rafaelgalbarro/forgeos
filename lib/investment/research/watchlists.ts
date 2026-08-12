import type { WatchlistBucket } from "./types";
import type { EngineRunResult } from "./types";
import type { ResearchScores } from "./types";

/**
 * Intelligent watchlists — bucket symbols by available criteria.
 * Uses only real symbols from the research run; never invents tickers.
 */
export function buildIntelligentWatchlists(input: {
  readonly symbols: readonly string[];
  readonly dossiers: readonly {
    readonly symbol: string;
    readonly scores: ResearchScores;
    readonly engines: readonly EngineRunResult[];
  }[];
}): readonly WatchlistBucket[] {
  const symbols = [...new Set(input.symbols.map((s) => s.toUpperCase()))];
  const bySymbol = new Map(input.dossiers.map((d) => [d.symbol.toUpperCase(), d]));

  const opportunity: string[] = [];
  const highVol: string[] = [];
  const sentimentPositive: string[] = [];
  const needsConfig: string[] = [];

  for (const sym of symbols) {
    const d = bySymbol.get(sym);
    if (!d) {
      needsConfig.push(sym);
      continue;
    }
    const overall = d.scores.overall.value;
    if (overall != null && overall >= 60) opportunity.push(sym);

    const quant = d.engines.find((e) => e.engineId === "quant");
    if (quant?.lines.some((l) => /high-volatility/i.test(l))) highVol.push(sym);

    const sent = d.scores.scores.find((s) => s.kind === "sentiment");
    if (sent?.value != null && sent.value >= 55) sentimentPositive.push(sym);

    if (d.engines.every((e) => e.status === "CONFIG_REQUIRED" || e.status === "NO_DATA" || e.status === "STUB")) {
      needsConfig.push(sym);
    }
  }

  const buckets: WatchlistBucket[] = [
    {
      id: "wl-opportunity",
      label: "Opportunity (overall ≥ 60)",
      criterion: "opportunity",
      symbols: opportunity,
      note: opportunity.length ? "From composed research scores" : "NO_DATA — no symbols cleared threshold",
    },
    {
      id: "wl-volatility",
      label: "High volatility regime",
      criterion: "volatility",
      symbols: highVol,
      note: highVol.length ? "From Quant Engine regime tag" : "NO_DATA",
    },
    {
      id: "wl-sentiment",
      label: "Constructive sentiment",
      criterion: "strategy",
      symbols: sentimentPositive,
      note: sentimentPositive.length ? "Sentiment score ≥ 55" : "NO_DATA",
    },
    {
      id: "wl-universe",
      label: "Research universe",
      criterion: "sector",
      symbols,
      note: "Symbols in current research run (sector taxonomy: NO_DATA until classified)",
    },
  ];

  if (needsConfig.length) {
    buckets.push({
      id: "wl-config",
      label: "Awaiting data / config",
      criterion: "country",
      symbols: [...new Set(needsConfig)],
      note: "CONFIG_REQUIRED or NO_DATA across engines",
    });
  }

  return buckets;
}

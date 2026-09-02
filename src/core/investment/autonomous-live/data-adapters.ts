/**
 * Data source adapters for AUTONOMOUS_LIVE — wrap Market Intelligence / IBKR reads.
 * Every datum carries source, timestamp, freshness, quality, live_or_delayed, confidence.
 * Adapters never submit orders.
 */

import { buildDatumMeta, qualifyDatum, type QuoteSnapshot } from "./data-quality";
import type { QualifiedMarketDatum } from "./domain";

export type AutonomousDataFeed =
  | "ibkr_live_market"
  | "ibkr_bid_ask"
  | "ibkr_volume"
  | "ibkr_history"
  | "financial_news"
  | "earnings"
  | "economic_calendar"
  | "rates"
  | "inflation"
  | "employment"
  | "central_banks"
  | "fundamentals"
  | "sentiment"
  | "volatility"
  | "correlations"
  | "portfolio_exposure";

export interface AutonomousDataBundle {
  readonly quote: QuoteSnapshot;
  readonly news: QualifiedMarketDatum<readonly string[]>;
  readonly earnings: QualifiedMarketDatum<readonly string[]>;
  readonly economicCalendar: QualifiedMarketDatum<readonly string[]>;
  readonly rates: QualifiedMarketDatum<number | null>;
  readonly inflation: QualifiedMarketDatum<number | null>;
  readonly employment: QualifiedMarketDatum<number | null>;
  readonly centralBanks: QualifiedMarketDatum<readonly string[]>;
  readonly fundamentals: QualifiedMarketDatum<Readonly<Record<string, number>>>;
  readonly sentiment: QualifiedMarketDatum<number | null>;
  readonly volatility: QualifiedMarketDatum<number | null>;
  readonly correlations: QualifiedMarketDatum<Readonly<Record<string, number>>>;
  readonly portfolioExposure: QualifiedMarketDatum<number>;
  readonly history: QualifiedMarketDatum<readonly number[]>;
}

function emptyList(source: string, nowIso: string, liveOrDelayed: "live" | "delayed" | "unknown" = "unknown") {
  return qualifyDatum([] as string[], buildDatumMeta({ source, timestamp: nowIso, nowIso, liveOrDelayed, confidence: 0.3 }));
}

function emptyNum(source: string, nowIso: string) {
  return qualifyDatum(null as number | null, buildDatumMeta({
    source,
    timestamp: nowIso,
    nowIso,
    liveOrDelayed: "unknown",
    quality: "unusable",
    confidence: 0.2,
  }));
}

/**
 * Build a locked-mode data bundle. Prefer injecting live quote meta from IBKR read adapters.
 * Unsourced / delayed fields remain NO_TRADE for entry validation.
 */
export function buildAutonomousDataBundle(args: {
  readonly nowIso: string;
  readonly symbol: string;
  readonly quote?: QuoteSnapshot;
  readonly portfolioExposureEur?: number;
}): AutonomousDataBundle {
  const now = args.nowIso;
  const quote =
    args.quote ??
    ({
      bid: 0,
      ask: 0,
      last: 0,
      volume: 0,
      meta: buildDatumMeta({
        source: "unsourced",
        timestamp: now,
        nowIso: now,
        liveOrDelayed: "unknown",
        quality: "unusable",
        confidence: 0,
      }),
    } satisfies QuoteSnapshot);

  return {
    quote,
    news: emptyList("financial_news", now),
    earnings: emptyList("earnings", now),
    economicCalendar: emptyList("economic_calendar", now),
    rates: emptyNum("rates", now),
    inflation: emptyNum("inflation", now),
    employment: emptyNum("employment", now),
    centralBanks: emptyList("central_banks", now),
    fundamentals: qualifyDatum(
      {},
      buildDatumMeta({ source: "fundamentals", timestamp: now, nowIso: now, liveOrDelayed: "delayed", confidence: 0.4 }),
    ),
    sentiment: emptyNum("sentiment", now),
    volatility: emptyNum("volatility", now),
    correlations: qualifyDatum(
      {},
      buildDatumMeta({ source: "correlations", timestamp: now, nowIso: now, liveOrDelayed: "delayed", confidence: 0.4 }),
    ),
    portfolioExposure: qualifyDatum(
      args.portfolioExposureEur ?? 0,
      buildDatumMeta({
        source: "portfolio_exposure",
        timestamp: now,
        nowIso: now,
        liveOrDelayed: "live",
        quality: "medium",
        confidence: 0.7,
      }),
    ),
    history: qualifyDatum(
      [] as number[],
      buildDatumMeta({ source: "ibkr_history", timestamp: now, nowIso: now, liveOrDelayed: "delayed", confidence: 0.5 }),
    ),
  };
}

export function liveQuoteFromIbkr(args: {
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly volume: number;
  readonly timestamp: string;
  readonly nowIso: string;
}): QuoteSnapshot {
  return {
    bid: args.bid,
    ask: args.ask,
    last: args.last,
    volume: args.volume,
    meta: buildDatumMeta({
      source: "ibkr_live_market",
      timestamp: args.timestamp,
      nowIso: args.nowIso,
      liveOrDelayed: "live",
      quality: "high",
      confidence: 0.95,
    }),
  };
}

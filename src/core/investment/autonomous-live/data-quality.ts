/**
 * Market data quality gate — delayed/stale/unsourced → NO_TRADE.
 * Never confuse delayed with live.
 */

import type {
  DataLiveOrDelayed,
  DataQuality,
  EntryValidationFailure,
  MarketDatumMeta,
  QualifiedMarketDatum,
} from "./domain";

export function buildDatumMeta(args: {
  source: string;
  timestamp: string;
  nowIso: string;
  liveOrDelayed: DataLiveOrDelayed;
  quality?: DataQuality;
  confidence?: number;
}): MarketDatumMeta {
  const freshnessMs = Math.max(
    0,
    new Date(args.nowIso).getTime() - new Date(args.timestamp).getTime(),
  );
  const quality =
    args.quality ??
    (args.liveOrDelayed !== "live"
      ? "unusable"
      : freshnessMs > 3_000
        ? "low"
        : "high");
  return {
    source: args.source,
    timestamp: args.timestamp,
    freshnessMs: Number.isFinite(freshnessMs) ? freshnessMs : Number.POSITIVE_INFINITY,
    quality,
    liveOrDelayed: args.liveOrDelayed,
    confidence: args.confidence ?? (quality === "high" ? 0.9 : 0.2),
  };
}

export function qualifyDatum<T>(
  value: T,
  meta: MarketDatumMeta,
): QualifiedMarketDatum<T> {
  return { value, meta };
}

export function assertTradeableDatum(
  meta: MarketDatumMeta,
  opts: { maxAgeMs: number; liveDataRequired: boolean },
): EntryValidationFailure | null {
  if (!meta.source || meta.source === "unknown" || meta.source === "unsourced") {
    return { code: "UNSOURCED_DATA", message: "NO_TRADE: market datum has no source" };
  }
  if (opts.liveDataRequired && meta.liveOrDelayed !== "live") {
    return {
      code: "DELAYED_OR_UNKNOWN_DATA",
      message: `NO_TRADE: required LIVE data, got ${meta.liveOrDelayed}`,
    };
  }
  if (meta.liveOrDelayed === "delayed") {
    return { code: "DELAYED_DATA", message: "NO_TRADE: delayed data must never be treated as live" };
  }
  if (!Number.isFinite(meta.freshnessMs) || meta.freshnessMs > opts.maxAgeMs) {
    return {
      code: "STALE_QUOTE",
      message: `NO_TRADE: quote age ${meta.freshnessMs}ms exceeds ${opts.maxAgeMs}ms`,
    };
  }
  if (meta.quality === "unusable" || meta.quality === "low") {
    return { code: "LOW_QUALITY_DATA", message: `NO_TRADE: data quality=${meta.quality}` };
  }
  if (meta.confidence < 0.5) {
    return { code: "LOW_CONFIDENCE_DATA", message: "NO_TRADE: datum confidence below threshold" };
  }
  return null;
}

export interface QuoteSnapshot {
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly volume: number;
  readonly meta: MarketDatumMeta;
}

export function validateQuoteForEntry(
  quote: QuoteSnapshot,
  opts: { maxAgeMs: number; maxSpreadBps: number; minVolume: number; liveDataRequired: boolean },
): EntryValidationFailure[] {
  const failures: EntryValidationFailure[] = [];
  const metaFail = assertTradeableDatum(quote.meta, opts);
  if (metaFail) failures.push(metaFail);

  if (!(quote.bid > 0) || !(quote.ask > 0) || quote.ask < quote.bid) {
    failures.push({ code: "INVALID_BID_ASK", message: "NO_TRADE: invalid bid/ask" });
  } else {
    const mid = (quote.bid + quote.ask) / 2;
    const spreadBps = ((quote.ask - quote.bid) / mid) * 10_000;
    if (spreadBps > opts.maxSpreadBps) {
      failures.push({
        code: "SPREAD_TOO_WIDE",
        message: `NO_TRADE: spread ${spreadBps.toFixed(1)}bps > ${opts.maxSpreadBps}`,
      });
    }
  }

  if (quote.volume < opts.minVolume) {
    failures.push({
      code: "INSUFFICIENT_VOLUME",
      message: `NO_TRADE: volume ${quote.volume} < ${opts.minVolume}`,
    });
  }

  return failures;
}

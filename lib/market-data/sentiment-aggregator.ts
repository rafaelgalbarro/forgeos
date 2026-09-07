import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import type { SentimentLabel } from "@/lib/market-data/types";
import { getBatchPrices } from "@/lib/market-data/yahoo-finance";

const TICKER_CACHE_TTL_MS = 10 * 60 * 1000;
const MACRO_CACHE_TTL_MS = 15 * 60 * 1000;

const POSITIVE_WORDS = [
  "moon", "rocket", "bull", "buy", "calls", "breakout", "squeeze", "surge", "rally", "beat",
  "upgrade", "growth", "profit", "long", "undervalued", "dip", "yolo",
];
const NEGATIVE_WORDS = [
  "crash", "bear", "sell", "puts", "dump", "plunge", "miss", "downgrade", "loss", "short",
  "bankruptcy", "lawsuit", "overvalued", "bubble", "dead", "bag",
];

export type StockTwitsSentiment = {
  readonly bullishPct: number | null;
  readonly bearishPct: number | null;
  readonly messageCount24h: number;
  readonly trendingScore: number | null;
  readonly watchlistCount: number | null;
};

export type RedditSentiment = {
  readonly mentionCount24h: number;
  readonly wsbMentions: number;
  readonly stocksMentions: number;
  readonly overallSentiment: SentimentLabel;
  readonly mentionSpike: boolean;
  readonly avgSentimentScore: number;
};

export type MacroSentimentContext = {
  readonly fearGreedIndex: number | null;
  readonly fearGreedLabel: string | null;
  readonly vix: number | null;
  readonly vixChangePct: number | null;
  readonly extremeGreed: boolean;
  readonly extremeFear: boolean;
  readonly highVolatility: boolean;
};

export type SentimentAggregate = {
  readonly ticker: string;
  readonly stocktwits: StockTwitsSentiment | null;
  readonly reddit: RedditSentiment | null;
  readonly macro: MacroSentimentContext;
  readonly compositeScore: number;
  readonly signals: readonly string[];
  readonly sourcesUsed: readonly string[];
  readonly errors: readonly string[];
  readonly computedAt: string;
};

function envEnabled(name: string, defaultValue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export function isSentimentAggregatorEnabled(): boolean {
  return envEnabled("SENTIMENT_AGGREGATOR_ENABLED", true);
}

function hoursAgoMs(isoOrUnixSec: number, isUnix = false): number {
  const ms = isUnix ? isoOrUnixSec * 1000 : new Date(isoOrUnixSec).getTime();
  if (!Number.isFinite(ms)) return 999;
  return (Date.now() - ms) / 3_600_000;
}

function scoreTextSentiment(text: string): { sentiment: SentimentLabel; score: number } {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) pos += 1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) neg += 1;
  if (pos > neg) return { sentiment: "POSITIVE", score: Math.min(1, 0.5 + pos * 0.12) };
  if (neg > pos) return { sentiment: "NEGATIVE", score: Math.min(1, 0.5 + neg * 0.12) };
  return { sentiment: "NEUTRAL", score: 0.5 };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": "ForgeOS Investment Sentiment/1.0",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchStockTwits(ticker: string, errors: string[]): Promise<StockTwitsSentiment | null> {
  const url = `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(ticker)}.json`;
  const data = await fetchJson<{
    symbol?: { watchlist_count?: number; trending?: boolean; trending_score?: number };
    messages?: Array<{
      created_at?: string;
      entities?: { sentiment?: { basic?: string } };
    }>;
  }>(url);

  if (!data?.messages) {
    errors.push("StockTwits: sin datos");
    return null;
  }

  const recent = data.messages.filter((m) => {
    if (!m.created_at) return false;
    return hoursAgoMs(new Date(m.created_at).getTime()) <= 24;
  });

  let bullish = 0;
  let bearish = 0;
  let labeled = 0;
  for (const m of recent) {
    const basic = m.entities?.sentiment?.basic?.toLowerCase();
    if (basic === "bullish") {
      bullish += 1;
      labeled += 1;
    } else if (basic === "bearish") {
      bearish += 1;
      labeled += 1;
    }
  }

  const bullishPct = labeled > 0 ? Math.round((bullish / labeled) * 100) : null;
  const bearishPct = labeled > 0 ? Math.round((bearish / labeled) * 100) : null;

  return {
    bullishPct,
    bearishPct,
    messageCount24h: recent.length,
    trendingScore: data.symbol?.trending_score ?? (data.symbol?.trending ? 1 : null),
    watchlistCount: data.symbol?.watchlist_count ?? null,
  };
}

async function fetchRedditSubMentions(
  ticker: string,
  sub: "wallstreetbets" | "stocks",
): Promise<Array<{ title: string; hoursAgo: number }>> {
  const url =
    `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(ticker)}` +
    `&restrict_sr=1&sort=new&limit=10`;
  const data = await fetchJson<{
    data?: { children?: Array<{ data?: { title?: string; created_utc?: number } }> };
  }>(url);
  const out: Array<{ title: string; hoursAgo: number }> = [];
  for (const child of data?.data?.children ?? []) {
    const title = child.data?.title?.trim();
    const created = child.data?.created_utc ?? 0;
    if (!title) continue;
    const h = hoursAgoMs(created, true);
    if (h <= 24) out.push({ title, hoursAgo: h });
  }
  return out;
}

async function fetchReddit(ticker: string, errors: string[]): Promise<RedditSentiment | null> {
  const [wsb, stocks] = await Promise.all([
    fetchRedditSubMentions(ticker, "wallstreetbets"),
    fetchRedditSubMentions(ticker, "stocks"),
  ]);

  const all = [...wsb, ...stocks];
  if (all.length === 0) {
    errors.push("Reddit: sin menciones 24h");
    return null;
  }

  let pos = 0;
  let neg = 0;
  let scoreSum = 0;
  for (const m of all) {
    const s = scoreTextSentiment(m.title);
    scoreSum += s.score;
    if (s.sentiment === "POSITIVE") pos += 1;
    else if (s.sentiment === "NEGATIVE") neg += 1;
  }

  let overallSentiment: SentimentLabel = "NEUTRAL";
  if (pos > neg) overallSentiment = "POSITIVE";
  else if (neg > pos) overallSentiment = "NEGATIVE";

  const mentionCount24h = all.length;
  const mentionSpike = mentionCount24h >= 8 || wsb.length >= 5;

  return {
    mentionCount24h,
    wsbMentions: wsb.length,
    stocksMentions: stocks.length,
    overallSentiment,
    mentionSpike,
    avgSentimentScore: scoreSum / all.length,
  };
}

async function fetchFearGreed(): Promise<{ score: number; label: string } | null> {
  const cached = getCached<{ score: number; label: string }>(cacheKey("macro", "fear-greed"));
  if (cached) return cached;

  const data = await fetchJson<{
    fear_and_greed?: { score?: number; rating?: string };
    fear_and_greed_historical?: { data?: Array<{ x?: number; y?: number; rating?: string }> };
  }>("https://production.dataviz.cnn.io/index/fearandgreed/graphdata");

  let score = data?.fear_and_greed?.score;
  let label = data?.fear_and_greed?.rating;
  if (score == null) {
    const latest = data?.fear_and_greed_historical?.data?.at(-1);
    score = latest?.y;
    label = latest?.rating;
  }
  if (score == null || !Number.isFinite(score)) return null;

  const result = { score: Math.round(score), label: label ?? "Unknown" };
  setCached(cacheKey("macro", "fear-greed"), result, MACRO_CACHE_TTL_MS);
  return result;
}

async function fetchVix(): Promise<{ vix: number; changePct: number } | null> {
  const cached = getCached<{ vix: number; changePct: number }>(cacheKey("macro", "vix"));
  if (cached) return cached;

  const quotes = await getBatchPrices(["^VIX"]);
  const q = quotes.get("^VIX");
  if (!q) return null;

  const result = { vix: q.price, changePct: q.changePct };
  setCached(cacheKey("macro", "vix"), result, MACRO_CACHE_TTL_MS);
  return result;
}

/** Global macro sentiment — Fear & Greed + VIX (cached 15 min). */
export async function getMacroSentimentContext(): Promise<MacroSentimentContext> {
  const [fg, vixData] = await Promise.all([fetchFearGreed(), fetchVix()]);
  const fgScore = fg?.score ?? null;
  return {
    fearGreedIndex: fgScore,
    fearGreedLabel: fg?.label ?? null,
    vix: vixData?.vix ?? null,
    vixChangePct: vixData?.changePct ?? null,
    extremeGreed: fgScore != null && fgScore > 75,
    extremeFear: fgScore != null && fgScore < 25,
    highVolatility: vixData != null && vixData.vix > 25,
  };
}

function buildSignals(
  stocktwits: StockTwitsSentiment | null,
  reddit: RedditSentiment | null,
  macro: MacroSentimentContext,
): string[] {
  const signals: string[] = [];

  if (stocktwits) {
    if (stocktwits.bullishPct != null && stocktwits.bullishPct >= 65) {
      signals.push(`StockTwits alcista ${stocktwits.bullishPct}%`);
    }
    if (stocktwits.bearishPct != null && stocktwits.bearishPct >= 65) {
      signals.push(`StockTwits bajista ${stocktwits.bearishPct}%`);
    }
    if (stocktwits.messageCount24h >= 50) {
      signals.push(`StockTwits alto volumen (${stocktwits.messageCount24h} msg/24h)`);
    }
    if (stocktwits.trendingScore != null && stocktwits.trendingScore > 0) {
      signals.push("StockTwits trending");
    }
  }

  if (reddit) {
    if (reddit.mentionSpike) {
      signals.push(`Reddit pico menciones (${reddit.mentionCount24h} en 24h)`);
    }
    if (reddit.overallSentiment === "POSITIVE" && reddit.mentionCount24h >= 3) {
      signals.push("Reddit sentimiento positivo");
    }
    if (reddit.overallSentiment === "NEGATIVE" && reddit.mentionCount24h >= 3) {
      signals.push("Reddit sentimiento negativo");
    }
  }

  if (macro.extremeGreed) signals.push(`Codicia extrema F&G=${macro.fearGreedIndex}`);
  if (macro.extremeFear) signals.push(`Miedo extremo F&G=${macro.fearGreedIndex} — oportunidad contraria`);
  if (macro.highVolatility) signals.push(`VIX elevado ${macro.vix?.toFixed(1)}`);

  return signals;
}

function computeCompositeScore(
  stocktwits: StockTwitsSentiment | null,
  reddit: RedditSentiment | null,
  macro: MacroSentimentContext,
): number {
  let score = 0;

  if (stocktwits?.bullishPct != null) score += (stocktwits.bullishPct - 50) * 0.4;
  if (stocktwits?.messageCount24h != null && stocktwits.messageCount24h > 30) {
    score += Math.min(10, stocktwits.messageCount24h / 10);
  }

  if (reddit) {
    if (reddit.overallSentiment === "POSITIVE") score += 8;
    if (reddit.overallSentiment === "NEGATIVE") score -= 8;
    if (reddit.mentionSpike) score += 12;
  }

  if (macro.extremeFear) score += 15;
  if (macro.extremeGreed) score -= 12;
  if (macro.highVolatility) score -= 5;

  return Math.max(-100, Math.min(100, Math.round(score)));
}

/** Aggregates StockTwits, Reddit, Fear & Greed and VIX for one ticker. */
export async function aggregateSentiment(ticker: string): Promise<SentimentAggregate> {
  const symbol = ticker.trim().toUpperCase();
  if (!isSentimentAggregatorEnabled()) {
    const macro = await getMacroSentimentContext();
    return {
      ticker: symbol,
      stocktwits: null,
      reddit: null,
      macro,
      compositeScore: 0,
      signals: [],
      sourcesUsed: [],
      errors: ["Sentiment aggregator deshabilitado"],
      computedAt: new Date().toISOString(),
    };
  }

  const cacheId = cacheKey("sentiment", symbol);
  const cached = getCached<SentimentAggregate>(cacheId);
  if (cached) return cached;

  const errors: string[] = [];
  const sourcesUsed: string[] = [];

  const [stocktwits, reddit, macro] = await Promise.all([
    fetchStockTwits(symbol, errors),
    fetchReddit(symbol, errors),
    getMacroSentimentContext(),
  ]);

  if (stocktwits) sourcesUsed.push("StockTwits");
  if (reddit) sourcesUsed.push("Reddit");
  if (macro.fearGreedIndex != null) sourcesUsed.push("CNN Fear & Greed");
  if (macro.vix != null) sourcesUsed.push("VIX");

  const signals = buildSignals(stocktwits, reddit, macro);
  const compositeScore = computeCompositeScore(stocktwits, reddit, macro);

  const result: SentimentAggregate = {
    ticker: symbol,
    stocktwits,
    reddit,
    macro,
    compositeScore,
    signals,
    sourcesUsed,
    errors,
    computedAt: new Date().toISOString(),
  };

  setCached(cacheId, result, TICKER_CACHE_TTL_MS);
  console.log(
    `[Sentiment] ${symbol} score=${compositeScore} signals=${signals.length} sources=${sourcesUsed.join(",")}`,
  );
  return result;
}

/** Maps sentiment aggregate to TradingAgent context shape. */
export function sentimentToAgentContext(agg: SentimentAggregate) {
  return {
    compositeScore: agg.compositeScore,
    signals: [...agg.signals],
    stocktwits: agg.stocktwits
      ? {
          bullishPct: agg.stocktwits.bullishPct,
          bearishPct: agg.stocktwits.bearishPct,
          messageCount24h: agg.stocktwits.messageCount24h,
          trending: agg.stocktwits.trendingScore != null && agg.stocktwits.trendingScore > 0,
        }
      : null,
    reddit: agg.reddit
      ? {
          mentionCount24h: agg.reddit.mentionCount24h,
          wsbMentions: agg.reddit.wsbMentions,
          stocksMentions: agg.reddit.stocksMentions,
          overallSentiment: agg.reddit.overallSentiment,
          mentionSpike: agg.reddit.mentionSpike,
        }
      : null,
    macro: {
      fearGreedIndex: agg.macro.fearGreedIndex,
      fearGreedLabel: agg.macro.fearGreedLabel,
      vix: agg.macro.vix,
      vixChangePct: agg.macro.vixChangePct,
      extremeGreed: agg.macro.extremeGreed,
      extremeFear: agg.macro.extremeFear,
      highVolatility: agg.macro.highVolatility,
    },
  };
}

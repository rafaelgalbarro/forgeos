import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import { fetchHistoryBars } from "@/lib/market-data/history-bars";
import { aggregateNews } from "@/lib/market-data/news-aggregator";
import { recognizePatterns } from "@/lib/market-data/pattern-recognition";
import { computeTechnicalIndicators } from "@/lib/market-data/technical-indicators";
import type { FullMarketAnalysis } from "@/lib/market-data/types";

const ANALYSIS_CACHE_TTL_MS = 5 * 60 * 1000;

/** Full multi-source analysis: history + news + technicals + patterns. Cache 5 min. */
export async function getFullMarketAnalysis(ticker: string): Promise<FullMarketAnalysis> {
  const symbol = ticker.trim().toUpperCase();
  const cacheId = cacheKey("analysis", symbol);
  const cached = getCached<FullMarketAnalysis>(cacheId);
  if (cached) return cached;

  const [{ bars, errors: barErrors }, news] = await Promise.all([
    fetchHistoryBars(symbol, "3 M"),
    aggregateNews(symbol),
  ]);

  if (barErrors.length) {
    console.log(`[FullAnalysis] ${symbol} bar warnings: ${barErrors.join(" | ")}`);
  }

  const technicals = computeTechnicalIndicators(bars);
  const patterns = recognizePatterns(bars, technicals);

  const result: FullMarketAnalysis = {
    ticker: symbol,
    bars: bars.slice(-30),
    news,
    technicals,
    patterns,
    computedAt: new Date().toISOString(),
  };

  setCached(cacheId, result, ANALYSIS_CACHE_TTL_MS);
  return result;
}

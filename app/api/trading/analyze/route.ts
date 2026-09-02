/**
 * ForgeOS — API Route: /api/trading/analyze
 * On-demand TradingAgent analysis with multi-source context (ANALYSIS_ONLY).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFullMarketAnalysis } from "@/lib/market-data/full-analysis";
import { aggregateSentiment, sentimentToAgentContext } from "@/lib/market-data/sentiment-aggregator";
import { getMacroContext, macroToAgentContext } from "@/lib/market-data/macro-context";
import { analyzeTimeframes, mtfToAgentContext } from "@/lib/market-data/multi-timeframe";
import { TradingAgent } from "@/src/core/trading/ai/trading-agent";
import {
  IbkrServiceUnavailableError,
  ibkrServiceFetch,
} from "@/lib/ibkr/service-client";

type AccountTag = { value?: string; currency?: string };
type AccountMap = Record<string, Record<string, AccountTag>>;

function sumTag(account: AccountMap, tag: string): number {
  let total = 0;
  for (const tags of Object.values(account ?? {})) {
    const n = Number(tags?.[tag]?.value);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}

async function fetchPriceData(ticker: string) {
  const history = await ibkrServiceFetch<{
    bars?: Array<{ close?: number; high?: number; low?: number; volume?: number }>;
  }>(`/api/ibkr/history?symbol=${encodeURIComponent(ticker)}&duration=5%20D&barSize=1%20day`);
  const bars = Array.isArray(history.bars) ? history.bars : [];
  const last = bars[bars.length - 1] ?? {};
  const prev = bars[bars.length - 2] ?? last;
  const currentPrice = Number(last.close ?? 0);
  const previousClose = Number(prev.close ?? currentPrice);
  return {
    currentPrice,
    previousClose,
    bid: currentPrice,
    ask: currentPrice,
    change1d: currentPrice - previousClose,
    high52w: Math.max(...bars.map((b) => Number(b.high ?? 0)), currentPrice),
    low52w: Math.min(
      ...bars.map((b) => Number(b.low ?? (currentPrice || 0))).filter((n) => n > 0),
      currentPrice || 0,
    ),
    volume: Number(last.volume ?? 0),
  };
}

async function fetchAccountSnapshot() {
  const account = await ibkrServiceFetch<AccountMap>("/api/ibkr/account");
  return {
    navUSD: sumTag(account, "NetLiquidation"),
    cashUSD: sumTag(account, "TotalCashValue"),
    dailyPnlUSD: sumTag(account, "UnrealizedPnL") + sumTag(account, "RealizedPnL"),
  };
}

async function fetchPosition(ticker: string) {
  const positions = await ibkrServiceFetch<
    Array<{
      symbol?: string;
      position?: number;
      avgCost?: number;
      unrealizedPnl?: number;
    }>
  >("/api/ibkr/positions");
  const pos = positions.find((p) => (p.symbol ?? "").toUpperCase() === ticker.toUpperCase());
  if (!pos) return undefined;
  return {
    shares: Number(pos.position ?? 0),
    avgCost: Number(pos.avgCost ?? 0),
    unrealizedPnl: Number(pos.unrealizedPnl ?? 0),
  };
}

function toErrorResponse(err: unknown) {
  if (err instanceof IbkrServiceUnavailableError) {
    return NextResponse.json(
      { ...(err.payload ?? {}), error: err.message },
      { status: 503 },
    );
  }
  const message = err instanceof Error ? err.message : "Internal error";
  if (message.includes("ANTHROPIC_API_KEY")) {
    return NextResponse.json({ error: "TradingAgent no disponible — falta ANTHROPIC_API_KEY" }, { status: 503 });
  }
  console.error("[TradingAnalyze]", err);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    const [priceData, account, existingPosition, analysis, sentimentAgg, macroCtx, mtf] = await Promise.all([
      fetchPriceData(ticker),
      fetchAccountSnapshot().catch(() => ({ navUSD: 0, cashUSD: 0, dailyPnlUSD: 0 })),
      fetchPosition(ticker).catch(() => undefined),
      getFullMarketAnalysis(ticker).catch((err) => {
        console.warn("[TradingAnalyze] full analysis partial:", err);
        return null;
      }),
      aggregateSentiment(ticker).catch((err) => {
        console.warn("[TradingAnalyze] sentiment partial:", err);
        return null;
      }),
      getMacroContext().catch((err) => {
        console.warn("[TradingAnalyze] macro partial:", err);
        return null;
      }),
      analyzeTimeframes(ticker).catch((err) => {
        console.warn("[TradingAnalyze] multi-timeframe partial:", err);
        return null;
      }),
    ]);

    const quotePrice =
      Number.isFinite(priceData.currentPrice) && priceData.currentPrice > 0
        ? priceData.currentPrice
        : priceData.previousClose;

    if (!Number.isFinite(quotePrice) || quotePrice <= 0) {
      return NextResponse.json({ error: `Sin datos de precio para ${ticker}` }, { status: 404 });
    }

    const agent = new TradingAgent();
    const signal = await agent.analyzeAndSignal({
      ticker,
      currentPrice: quotePrice,
      change1d: priceData.change1d,
      high52w: priceData.high52w,
      low52w: priceData.low52w,
      volume: priceData.volume,
      bid: priceData.bid,
      ask: priceData.ask,
      news: analysis
        ? {
            items: analysis.news.items.map((n) => ({
              title: n.title,
              source: n.source,
              sentiment: n.sentiment,
              hoursAgo: n.hoursAgo,
            })),
            overallSentiment: analysis.news.overallSentiment,
            newsCount24h: analysis.news.newsCount24h,
          }
        : undefined,
      sentiment: sentimentAgg ? sentimentToAgentContext(sentimentAgg) : undefined,
      macro: macroCtx ? macroToAgentContext(macroCtx) : undefined,
      multiTimeframe: mtf ? mtfToAgentContext(mtf) : undefined,
      technicals: analysis
        ? {
            trend: {
              ema20: analysis.technicals.trend.ema20,
              ema50: analysis.technicals.trend.ema50,
              ema200: analysis.technicals.trend.ema200,
              macd: analysis.technicals.trend.macd,
              ichimoku: analysis.technicals.trend.ichimoku
                ? {
                    aboveCloud: analysis.technicals.trend.ichimoku.aboveCloud,
                    tenkan: analysis.technicals.trend.ichimoku.tenkan,
                    kijun: analysis.technicals.trend.ichimoku.kijun,
                  }
                : null,
              adx: analysis.technicals.trend.adx,
            },
            momentum: analysis.technicals.momentum,
            volatility: {
              bollingerBands: analysis.technicals.volatility.bollingerBands,
              atr: analysis.technicals.volatility.atr,
              squeeze: analysis.technicals.volatility.squeeze,
            },
            volume: {
              vwap: analysis.technicals.volume.vwap,
              obv: analysis.technicals.volume.obv,
              relativeVolume: analysis.technicals.volume.relativeVolume,
            },
            levels: {
              fibonacci: [...analysis.technicals.levels.fibonacci],
              support: [...analysis.technicals.levels.support],
              resistance: [...analysis.technicals.levels.resistance],
            },
          }
        : undefined,
      patterns: analysis
        ? {
            candlesticks: [...analysis.patterns.candlesticks],
            price: [...analysis.patterns.price],
            divergences: [...analysis.patterns.divergences],
            signals: [...analysis.patterns.signals],
          }
        : undefined,
      portfolioContext: {
        navUSD: account.navUSD,
        cashUSD: account.cashUSD,
        dailyPnlUSD: account.dailyPnlUSD,
        existingPosition,
      },
    });

    return NextResponse.json({
      ticker,
      signal,
      market: priceData,
      portfolio: {
        ...account,
        existingPosition,
      },
      analysis: analysis
        ? {
            news: analysis.news,
            technicals: analysis.technicals,
            patterns: analysis.patterns,
            bars: analysis.bars,
            computedAt: analysis.computedAt,
          }
        : null,
      sentiment: sentimentAgg ?? null,
      macro: macroCtx ?? null,
      multiTimeframe: mtf ?? null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Professional session-aware swing/momentum strategies.
 * Price + history: IBKR (multi-TF). News/sentiment: Finnhub.
 * Target: EV+ with ~45%+ win rate and ~1:3 R/R.
 */

import "server-only";

import {
  fetchCompanyNewsContext,
  fetchMarketIndicators,
  fetchNewsSentiment,
  type FinnhubProNewsContext,
  type FinnhubProSentiment,
} from "@/lib/market-data/finnhub-pro";
import { getIbkrPriceCached } from "@/lib/market-data/ibkr-prices";
import { ibkrBars5m, ibkrDailyBars } from "@/lib/market-data/ibkr-history";
import { recognizePatterns } from "@/lib/market-data/pattern-recognition";
import type { OhlcvBar } from "@/lib/market-data/types";
import {
  closes,
  computeTechnicalIndicators,
  ema,
  emaSeries,
  last,
  macd,
  relativeVolume,
  rsi,
  rsiSeries,
} from "@/lib/market-data/technical-indicators";
import { IBKR_CRYPTO_TICKERS, isIbkrCryptoTicker } from "@/src/core/trading/crypto-ibkr";
import { getAlpacaCryptoMetrics } from "@/lib/investment/alpaca/history";
import {
  ASIA_DIRECT_TICKERS,
  ASIA_ETF_TICKERS,
  EUROPE_DIRECT_TICKERS,
  EUROPE_ETF_TICKERS,
  getActiveTradingPhase,
  isAsiaFocusTicker,
  isAsiaOpen,
  isEuropeFocusTicker,
  isEuropeOpen,
  isUsaFirstHour,
  isUSAExtendedOpen,
  isUSAOpen,
  type ActiveTradingPhase,
} from "@/src/core/trading/market-session";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { isLossStreakBlacklisted } from "@/src/core/trading/strategies/strategy-blacklist";

export type ProStrategyId =
  | "ASIA_TREND_NOCTURNO"
  | "ASIA_GOLDEN_CROSS"
  | "EU_APERTURA_BREAKOUT"
  | "EU_EMA21_PULLBACK"
  | "USA_GAP_AND_GO"
  | "USA_MOMENTUM_PRIMERA_HORA"
  | "USA_VWAP_BOUNCE"
  | "USA_REVERSAL_OVERSOLD"
  | "USA_TREND_FOLLOWING"
  | "USA_INVERSE_HS"
  | "USA_DOUBLE_BOTTOM"
  | "USA_EARNINGS_MOMENTUM"
  | "USA_NEWS_CATALYST"
  | "USA_EODHD_MOMENTUM"
  | "USA_BB_OVERSOLD"
  | "USA_MACD_CROSS"
  | "AH_EARNINGS"
  | "CRYPTO_GOLDEN_CROSS"
  | "CRYPTO_RSI_OVERSOLD"
  | "CRYPTO_MOMENTUM"
  | "CRYPTO_SCALP";


export type ProStrategyHit = {
  id: ProStrategyId;
  name: string;
  baseConfidence: number;
  reason: string;
  stopLossPct: number;
  takeProfitPct: number;
  style: "scalping" | "swing" | "momentum";
  timeframeDays: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
};

export type ProStrategySignal = {
  direction: "BUY" | "HOLD";
  confidence: number;
  reasoning: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  strategyIds: ProStrategyId[];
  primaryStrategy: string;
  stopLossPct: number;
  takeProfitPct: number;
  stopLoss: number;
  takeProfit: number;
  rsi: number | null;
  /** Multiplier on cash allocation (VIX half-size etc.) */
  positionSizeFactor: number;
  /** Absolute cash fraction 0.15–0.30 from confidence tier */
  capitalPct: number;
  metrics: {
    change1d: number;
    relVolume: number;
    ema9: number | null;
    ema21: number | null;
    ema50: number | null;
    vwapApprox: number | null;
    dist52wHigh: number | null;
  };
};

export type ScreenerInputs = {
  price: number;
  change1dPct: number;
  volume: number;
  yearHigh?: number;
  yearLow?: number;
  priceAvg50?: number;
  priceAvg200?: number;
  bid?: number;
  ask?: number;
  premarketCandidate?: boolean;
  /** Ms since premarket gap first observed — GAP AND GO needs ≥5m. */
  gapHeldMs?: number;
  change1hPct?: number;
};

const CRYPTO_MIN_CONFIDENCE = 0.65;

const REVERSAL_ONLY_IDS: ProStrategyId[] = ["USA_REVERSAL_OVERSOLD", "CRYPTO_RSI_OVERSOLD"];

const BASE: Record<
  ProStrategyId,
  { name: string; base: number; sl: number; tp: number; style: ProStrategyHit["style"]; days: number }
> = {
  ASIA_TREND_NOCTURNO: {
    name: "ASIA-1 Trend Nocturno",
    base: 0.72,
    sl: 0.02,
    tp: 0.06,
    style: "swing",
    days: 3,
  },
  ASIA_GOLDEN_CROSS: {
    name: "ASIA-2 Golden Cross",
    base: 0.78,
    sl: 0.03,
    tp: 0.08,
    style: "swing",
    days: 7,
  },
  EU_APERTURA_BREAKOUT: {
    name: "EU-1 Apertura Breakout",
    base: 0.74,
    sl: 0.015,
    tp: 0.04,
    style: "momentum",
    days: 1,
  },
  EU_EMA21_PULLBACK: {
    name: "EU-2 Pullback EMA21",
    base: 0.7,
    sl: 0.02,
    tp: 0.05,
    style: "swing",
    days: 2,
  },
  USA_GAP_AND_GO: {
    name: "USA-1 Gap And Go",
    base: 0.8,
    sl: 0.015,
    tp: 0.05,
    style: "momentum",
    days: 1,
  },
  USA_MOMENTUM_PRIMERA_HORA: {
    name: "USA-2 Momentum Primera Hora",
    base: 0.76,
    sl: 0.015,
    tp: 0.03,
    style: "momentum",
    days: 1,
  },
  USA_VWAP_BOUNCE: {
    name: "USA-2b VWAP Bounce",
    base: 0.74,
    sl: 0.01,
    tp: 0.02,
    style: "scalping",
    days: 1,
  },
  USA_REVERSAL_OVERSOLD: {
    name: "USA-3 Reversal Oversold",
    base: 0.75,
    sl: 0.02,
    tp: 0.07,
    style: "swing",
    days: 2,
  },
  USA_TREND_FOLLOWING: {
    name: "USA-4 Trend Following",
    base: 0.72,
    sl: 0.02,
    tp: 0.08,
    style: "swing",
    days: 4,
  },
  USA_INVERSE_HS: {
    name: "USA-5 Inverse H&S",
    base: 0.8,
    sl: 0.03,
    tp: 0.08,
    style: "swing",
    days: 7,
  },
  USA_DOUBLE_BOTTOM: {
    name: "USA-6 Doble Suelo",
    base: 0.76,
    sl: 0.02,
    tp: 0.06,
    style: "swing",
    days: 5,
  },
  USA_EARNINGS_MOMENTUM: {
    name: "USA-7 Earnings Momentum",
    base: 0.78,
    sl: 0.03,
    tp: 0.08,
    style: "swing",
    days: 3,
  },
  USA_NEWS_CATALYST: {
    name: "USA-8 News Catalyst",
    base: 0.73,
    sl: 0.02,
    tp: 0.05,
    style: "momentum",
    days: 1,
  },
  USA_EODHD_MOMENTUM: {
    name: "USA EODHD Momentum",
    base: 0.68,
    sl: 0.02,
    tp: 0.05,
    style: "momentum",
    days: 2,
  },
  USA_BB_OVERSOLD: {
    name: "USA BB Oversold",
    base: 0.74,
    sl: 0.02,
    tp: 0.06,
    style: "swing",
    days: 2,
  },
  USA_MACD_CROSS: {
    name: "USA MACD Cross",
    base: 0.66,
    sl: 0.02,
    tp: 0.05,
    style: "momentum",
    days: 2,
  },
  AH_EARNINGS: {
    name: "AH-1 Earnings After-Hours",
    base: 0.75,
    sl: 0.03,
    tp: 0.08,
    style: "swing",
    days: 2,
  },
  CRYPTO_GOLDEN_CROSS: {
    name: "CRYPTO-1 Golden Cross",
    base: 0.82,
    sl: 0.04,
    tp: 0.15,
    style: "swing",
    days: 14,
  },
  CRYPTO_RSI_OVERSOLD: {
    name: "CRYPTO-2 RSI Oversold",
    base: 0.75,
    sl: 0.04,
    tp: 0.12,
    style: "swing",
    days: 5,
  },
  CRYPTO_MOMENTUM: {
    name: "CRYPTO-3 Momentum",
    base: 0.7,
    sl: 0.03,
    tp: 0.08,
    style: "momentum",
    days: 3,
  },
  CRYPTO_SCALP: {
    name: "CRYPTO-4 Scalp",
    base: 0.72,
    sl: 0.02,
    tp: 0.05,
    style: "scalping",
    days: 1,
  },
};

export const SECTOR_ETF_MAP: Record<string, string> = {
  technology: "XLK",
  "information technology": "XLK",
  financial: "XLF",
  "financial services": "XLF",
  energy: "XLE",
  healthcare: "XLV",
  "health care": "XLV",
  industrial: "XLI",
  industrials: "XLI",
  consumer: "XLY",
  "consumer cyclical": "XLY",
  "consumer defensive": "XLP",
  utilities: "XLU",
  materials: "XLB",
  "basic materials": "XLB",
  "real estate": "XLRE",
  communication: "XLC",
};

/** Capital % by confidence band (professional sizing). */
export function capitalPctFromConfidence(confidence: number): number {
  if (confidence >= 0.85) return 0.3;
  if (confidence >= 0.8) return 0.25;
  if (confidence >= 0.75) return 0.2;
  return 0.15;
}

function hit(id: ProStrategyId, reason: string, overrides?: Partial<ProStrategyHit>): ProStrategyHit {
  const b = BASE[id];
  return {
    id,
    name: b.name,
    baseConfidence: b.base,
    reason,
    stopLossPct: overrides?.stopLossPct ?? b.sl,
    takeProfitPct: overrides?.takeProfitPct ?? b.tp,
    style: overrides?.style ?? b.style,
    timeframeDays: overrides?.timeframeDays ?? b.days,
    stopLossPrice: overrides?.stopLossPrice,
    takeProfitPrice: overrides?.takeProfitPrice,
  };
}

async function loadDailyBars(symbol: string): Promise<OhlcvBar[]> {
  const timeoutMs = 8_000
  try {
    const bars = await Promise.race([
      ibkrDailyBars(symbol),
      new Promise<OhlcvBar[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ])
    return bars
  } catch {
    return []
  }
}

function minTradeConfidenceForPhase(phase: string, crypto: boolean): number {
  if (crypto) return CRYPTO_MIN_CONFIDENCE;
  if (phase === "USA_REGULAR") return 0.65;
  if (phase === "USA_AFTERHOURS") {
    return TRADING_CONFIG.ai.minConfidenceExtendedHours ?? 0.75;
  }
  return TRADING_CONFIG.ai.minConfidenceToTrade;
}

/**
 * Lightweight strategies when IBKR historical is unavailable (no FMP, no bars).
 * Uses live IBKR price + Finnhub news only.
 */
async function evaluateSimpleStrategies(
  symbol: string,
  price: number,
  change1d: number,
  inputs?: Partial<ScreenerInputs>,
  opts?: { crypto?: boolean; change1h?: number; rsi?: number | null },
): Promise<ProStrategySignal> {
  const hold = (reason: string): ProStrategySignal => ({
    direction: "HOLD",
    confidence: 0,
    reasoning: reason,
    urgency: "LOW",
    strategyIds: [],
    primaryStrategy: "none",
    stopLossPct: 0.02,
    takeProfitPct: 0.04,
    stopLoss: 0,
    takeProfit: 0,
    rsi: null,
    positionSizeFactor: 1,
    capitalPct: 0.15,
    metrics: {
      change1d,
      relVolume: 0,
      ema9: null,
      ema21: null,
      ema50: null,
      vwapApprox: null,
      dist52wHigh: null,
    },
  })

  const [newsCtx, sentiment] = await Promise.all([
    fetchCompanyNewsContext(symbol),
    fetchNewsSentiment(symbol),
  ])
  const sentScore = sentiment?.score ?? 0
  const news4h = newsPositiveHours(newsCtx, 4)
  const hits: ProStrategyHit[] = []
  const change1h = opts?.change1h ?? inputs?.change1hPct ?? 0
  const rsiVal = opts?.rsi ?? null

  if (opts?.crypto) {
    if ((rsiVal != null && rsiVal < 40) || change1h > 0.3) {
      hits.push(
        hit("CRYPTO_SCALP", `Scalp crypto RSI=${rsiVal?.toFixed(0) ?? "—"} Δ1h=${change1h.toFixed(2)}%`, {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.05,
        }),
      )
    }
  }

  if (change1d >= 2 && change1d <= 5) {
    hits.push(
      hit("USA_MOMENTUM_PRIMERA_HORA", `Simple momentum +${change1d.toFixed(1)}% (sin histórico)`, {
        stopLossPrice: price * 0.985,
        takeProfitPrice: price * 1.03,
      }),
    )
  }

  const gapHeldOk =
    inputs?.premarketCandidate === true &&
    (inputs.gapHeldMs == null || inputs.gapHeldMs >= 5 * 60_000)
  if (change1d >= 1.5 && change1d <= 6 && gapHeldOk) {
    const gapFloor = price * (1 - change1d / 100) * 0.995
    hits.push(
      hit("USA_GAP_AND_GO", `Simple gap +${change1d.toFixed(1)}% (sin histórico)`, {
        stopLossPrice: gapFloor,
        takeProfitPrice: price * 1.03,
      }),
    )
  }

  if (news4h && sentScore > 0.3 && change1d >= 1 && change1d <= 4) {
    hits.push(
      hit("USA_NEWS_CATALYST", `Simple news + sentiment ${sentScore.toFixed(2)}`, {
        stopLossPrice: price * 0.98,
        takeProfitPrice: price * 1.05,
      }),
    )
  }

  if (hits.length === 0) {
    console.log(`[ProStrategy] ${symbol}: modo simple sin señal (Δ${change1d.toFixed(1)}%)`)
    return hold(`Modo simple: sin señal (Δ${change1d.toFixed(1)}%)`)
  }

  hits.sort((a, b) => b.baseConfidence - a.baseConfidence)
  const primary = hits[0]!
  const scored = scoreFinal({
    primaryBase: primary.baseConfidence,
    hits: hits.length,
    relVol: 1,
    news4h,
    sentiment: sentScore,
    sectorPos: null,
    sectorNeg: null,
    rsiOk: false,
    firstHour: false,
    marketPos: change1d > 0,
    change1d,
  })

  const minConf = opts?.crypto ? CRYPTO_MIN_CONFIDENCE : 0.68
  if (scored.confidence < minConf) {
    console.log(
      `[ProStrategy] ${symbol}: modo simple conf ${(scored.confidence * 100).toFixed(0)}% < ${(minConf * 100).toFixed(0)}%`,
    )
    return hold(`Modo simple: confianza ${(scored.confidence * 100).toFixed(0)}% < ${(minConf * 100).toFixed(0)}%`)
  }

  const stopLoss = primary.stopLossPrice ?? price * (1 - primary.stopLossPct)
  const takeProfit = primary.takeProfitPrice ?? price * (1 + primary.takeProfitPct)

  console.log(
    `[ProStrategy] ${symbol}: MODO SIMPLE BUY ${primary.id} conf=${(scored.confidence * 100).toFixed(0)}% Δ${change1d.toFixed(1)}%`,
  )

  return {
    direction: "BUY",
    confidence: scored.confidence,
    reasoning: `${primary.reason} [modo simple sin histórico]`,
    urgency: scored.confidence >= 0.75 ? "MEDIUM" : "LOW",
    strategyIds: hits.map((h) => h.id),
    primaryStrategy: primary.name,
    stopLossPct: primary.stopLossPct,
    takeProfitPct: primary.takeProfitPct,
    stopLoss: Number(stopLoss.toFixed(4)),
    takeProfit: Number(takeProfit.toFixed(4)),
    rsi: null,
    positionSizeFactor: 1,
    capitalPct: capitalPctFromConfidence(scored.confidence),
    metrics: {
      change1d,
      relVolume: 0,
      ema9: null,
      ema21: null,
      ema50: null,
      vwapApprox: null,
      dist52wHigh: null,
    },
  }
}

async function loadLivePrice(
  symbol: string,
  inputs?: Partial<ScreenerInputs>,
): Promise<{ price: number; change1d: number; change1h: number; volume: number; yearHigh: number; dayHigh: number; dayLow: number }> {
  const ibkr = await getIbkrPriceCached(symbol).catch(() => null);
  let change1d = inputs?.change1dPct ?? 0;
  let change1h = inputs?.change1hPct ?? 0;

  if (isIbkrCryptoTicker(symbol)) {
    const metrics = await getAlpacaCryptoMetrics(symbol).catch(() => null);
    if (metrics) {
      if (!inputs?.change1dPct) change1d = metrics.change1dPct;
      if (!inputs?.change1hPct) change1h = metrics.change1hPct;
    }
  }

  if (ibkr && ibkr.price > 0) {
    return {
      price: ibkr.price,
      change1d,
      change1h,
      volume: inputs?.volume ?? ibkr.volume ?? 0,
      yearHigh: inputs?.yearHigh ?? 0,
      dayHigh: ibkr.ask ?? ibkr.price,
      dayLow: ibkr.bid ?? ibkr.price,
    };
  }
  if (inputs?.price != null && inputs.price > 0) {
    return {
      price: inputs.price,
      change1d,
      change1h,
      volume: inputs.volume ?? 0,
      yearHigh: inputs.yearHigh ?? 0,
      dayHigh: inputs.price,
      dayLow: inputs.price,
    };
  }
  return {
    price: 0,
    change1d,
    change1h,
    volume: inputs?.volume ?? 0,
    yearHigh: inputs?.yearHigh ?? 0,
    dayHigh: 0,
    dayLow: 0,
  };
}

function appendLiveBar(
  bars: OhlcvBar[],
  price: number,
  volume: number,
  high: number,
  low: number,
): OhlcvBar[] {
  if (bars.length === 0) {
    return [{ open: price, high, low, close: price, volume, date: new Date().toISOString().slice(0, 10) }];
  }
  const lastBar = bars.at(-1)!;
  const today = new Date().toISOString().slice(0, 10);
  if (lastBar.date === today) {
    return [
      ...bars.slice(0, -1),
      {
        ...lastBar,
        high: Math.max(lastBar.high, high, price),
        low: Math.min(lastBar.low, low, price),
        close: price,
        volume: Math.max(lastBar.volume, volume),
      },
    ];
  }
  return [
    ...bars,
    {
      open: lastBar.close,
      high: Math.max(high, price, lastBar.close),
      low: Math.min(low, price, lastBar.close),
      close: price,
      volume,
      date: today,
    },
  ];
}

function nearLevel(price: number, level: number, pct = 0.02): boolean {
  if (!(level > 0)) return false;
  return Math.abs(price - level) / level <= pct;
}

function nearestSupport(price: number, supports: readonly number[]): number | null {
  const below = supports.filter((s) => s <= price * 1.01).sort((a, b) => b - a);
  return below[0] ?? null;
}

function nearestResistance(price: number, resistances: readonly number[]): number | null {
  const above = resistances.filter((r) => r >= price * 0.99).sort((a, b) => a - b);
  return above[0] ?? null;
}

function macdCrossUp(c: readonly number[]): boolean {
  if (c.length < 35) return false;
  const prev = macd(c.slice(0, -1));
  const cur = macd(c);
  return Boolean(prev && cur && prev.line <= prev.signal && cur.line > cur.signal);
}

function rsiRising(c: readonly number[]): boolean {
  const series = rsiSeries(c, 14);
  if (series.length < 3) return false;
  return last(series)! > series.at(-3)!;
}

function goldenCrossRecent(c: readonly number[], lookback = 5): boolean {
  const e50 = emaSeries(c, 50);
  const e200 = emaSeries(c, 200);
  if (e50.length < lookback + 1 || e200.length < lookback + 1) return false;
  const off = e50.length - e200.length;
  for (let i = e50.length - lookback; i < e50.length; i += 1) {
    const j = i + off;
    const jPrev = j - 1;
    if (jPrev < 0 || j >= e200.length) continue;
    if (e50[i - 1]! <= e200[jPrev]! && e50[i]! > e200[j]!) return true;
  }
  return false;
}

function hasBullishReversalCandle(names: readonly string[]): boolean {
  const bullish = ["Hammer", "Inverted Hammer", "Bullish Engulfing", "Morning Star"];
  return names.some((n) => bullish.some((b) => n.includes(b)));
}

function newsPositiveHours(news: FinnhubProNewsContext, hours: number): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  const items = news.items24h.filter((n) => nowSec - n.datetime <= hours * 3600);
  return items.some((n) => {
    const t = `${n.headline} ${n.summary ?? ""}`.toLowerCase();
    return (
      t.includes("beat") ||
      t.includes("upgrade") ||
      t.includes("surge") ||
      t.includes("record") ||
      t.includes("approval") ||
      t.includes("growth")
    );
  });
}

function earningsBeatRecent(news: FinnhubProNewsContext): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  return news.items24h.some((n) => {
    if (nowSec - n.datetime > 48 * 3600) return false;
    const t = `${n.headline} ${n.summary ?? ""}`.toLowerCase();
    return t.includes("earnings") && (t.includes("beat") || t.includes("tops estimates"));
  });
}

function vol10(bars: readonly OhlcvBar[]): number {
  const slice = bars.slice(-10);
  if (!slice.length) return 0;
  return slice.reduce((s, b) => s + b.volume, 0) / slice.length;
}

function scoreFinal(args: {
  primaryBase: number;
  hits: number;
  relVol: number;
  news4h: boolean;
  sentiment: number;
  sectorPos: boolean | null;
  sectorNeg: boolean | null;
  rsiOk: boolean;
  firstHour: boolean;
  marketPos: boolean;
  change1d: number;
}): { confidence: number; breakdown: string } {
  let conf = args.primaryBase;
  const parts: string[] = [`${(args.primaryBase * 100).toFixed(0)}% base`];
  if (args.hits >= 2) {
    conf += 0.08;
    parts.push("+8% multi-estrategia");
  }
  if (args.relVol > 1.5) {
    conf += 0.04;
    parts.push("+4% vol>1.5x (confirmación)");
  }
  if (args.relVol > 2) {
    conf += 0.05;
    parts.push("+5% vol>2x");
  }
  if (args.news4h) {
    conf += 0.05;
    parts.push("+5% noticia");
  }
  if (args.sentiment > 0.3) {
    conf += 0.05;
    parts.push("+5% sentiment");
  }
  if (args.sectorPos === true) {
    conf += 0.03;
    parts.push("+3% sector");
  }
  if (args.rsiOk) {
    conf += 0.03;
    parts.push("+3% RSI");
  }
  if (args.firstHour) {
    conf += 0.05;
    parts.push("+5% 1ª hora");
  }
  if (args.marketPos) {
    conf += 0.05;
    parts.push("+5% mercado");
  }
  if (args.change1d > 5) {
    conf -= 0.15;
    parts.push("-15% ya>+5%");
  }
  if (args.sectorNeg === true) {
    conf -= 0.1;
    parts.push("-10% sector−");
  }
  conf = Math.max(0, Math.min(0.95, conf));
  return { confidence: Number(conf.toFixed(3)), breakdown: parts.join(" ") };
}

/** Evaluate session-gated professional strategies. */
export async function evaluateProStrategies(
  symbol: string,
  inputs?: Partial<ScreenerInputs>,
): Promise<ProStrategySignal> {
  const live = await loadLivePrice(symbol, inputs);
  const price = live.price;
  const change1d = live.change1d;
  const change1h = live.change1h;
  const volume = live.volume;
  const yearHigh = live.yearHigh;
  const dayHigh = live.dayHigh;
  const dayLow = live.dayLow;
  const bid = inputs?.bid;
  const ask = inputs?.ask;
  const crypto = isIbkrCryptoTicker(symbol);

  const hold = (reason: string, rsiVal: number | null = null): ProStrategySignal => ({
    direction: "HOLD",
    confidence: 0,
    reasoning: reason,
    urgency: "LOW",
    strategyIds: [],
    primaryStrategy: "none",
    stopLossPct: 0.02,
    takeProfitPct: 0.04,
    stopLoss: 0,
    takeProfit: 0,
    rsi: rsiVal,
    positionSizeFactor: 1,
    capitalPct: 0.15,
    metrics: {
      change1d,
      relVolume: 0,
      ema9: null,
      ema21: null,
      ema50: null,
      vwapApprox: null,
      dist52wHigh: yearHigh > 0 && price > 0 ? price / yearHigh : null,
    },
  });

  if (!(price > 0.75)) return hold("Precio bajo mínimo $0.75");
  if (price > 500 && !crypto) return hold("Precio sobre máximo $500");

  if (isLossStreakBlacklisted(symbol)) {
    console.log(`[ProStrategy] ${symbol}: skip (blacklist —50%)`);
    return hold("Blacklist: 3 pérdidas consecutivas");
  }

  // Hard skip if already ran >5% unless reversal path allowed later
  if (change1d > 5) {
    console.log(`[ProStrategy] ${symbol}: skip (ya subió ${change1d.toFixed(1)}% > 5%)`);
    return hold(`Ya subió ${change1d.toFixed(1)}% — no comprar en pico`);
  }

  if (change1d < -3 && change1d > -5) {
    /* allow mild dips; deep downs handled as reversal-only */
  }

  const history = await loadDailyBars(symbol);
  const bars = appendLiveBar(history, price, volume, dayHigh, dayLow);
  if (bars.length < 20) {
    console.log(
      `[ProStrategy] ${symbol}: histórico EODHD insuficiente (${bars.length} velas) → modo simple`,
    );
    return evaluateSimpleStrategies(symbol, price, change1d, inputs, {
      crypto,
      change1h,
      rsi: null,
    });
  }

  const vol20 = bars.slice(-20).reduce((s, b) => s + b.volume, 0) / 20;
  if (vol20 < 300_000 && !crypto) return hold("Volumen medio 20d insuficiente");

  const deepDown = change1d < -3;

  const spreadEst =
    bid != null && ask != null && ask > bid && price > 0
      ? (ask - bid) / price
      : (dayHigh - dayLow) / price / 2;
  if (spreadEst > 0.03 && !crypto) return hold("Spread estimado > 3%");

  const technicals = computeTechnicalIndicators(bars);
  const patterns = recognizePatterns(bars, technicals);
  const c = closes(bars);
  const rsiVal = rsi(c);
  const relVol = relativeVolume(bars) ?? (vol20 > 0 ? volume / vol20 : 0);
  const ema9 = ema(c, 9);
  const ema21 = ema(c, 21);
  const ema50 = ema(c, 50);
  const ema200 = ema(c, 200);
  const macdCur = macd(c);
  const ich = technicals.trend.ichimoku;
  const bb = technicals.volatility.bollingerBands;
  const support = nearestSupport(price, technicals.levels.support);
  const resistance = nearestResistance(price, technicals.levels.resistance);
  const v10 = vol10(bars);

  // 5-min IBKR bars for VWAP / intraday momentum (USA sessions)
  const phaseEarly = getActiveTradingPhase();
  const needIntraday =
    phaseEarly === "USA_OPEN" || phaseEarly === "USA_REGULAR" || phaseEarly === "USA_PREMARKET";
  const bars5m = needIntraday ? await ibkrBars5m(symbol).catch(() => [] as OhlcvBar[]) : [];
  const intradayTech = bars5m.length >= 20 ? computeTechnicalIndicators(bars5m) : null;
  const vwap5m = intradayTech?.volume.vwap ?? technicals.volume.vwap;
  const c5 = bars5m.length >= 20 ? closes(bars5m) : [];
  const ema9_5m = c5.length >= 20 ? ema(c5, 9) : null;
  const ema21_5m = c5.length >= 20 ? ema(c5, 21) : null;
  const rsi5m = c5.length >= 20 ? rsi(c5) : null;

  const [newsCtx, sentiment, marketQuotes] = await Promise.all([
    fetchCompanyNewsContext(symbol),
    fetchNewsSentiment(symbol),
    fetchMarketIndicators(["SPY", "VIX", "BTCUSD", "BTC"]),
  ]);

  const spy = marketQuotes.get("SPY");
  const vix = marketQuotes.get("VIX");
  const spyChange = spy?.changePct ?? 0;
  const vixLevel = vix?.price ?? 0;
  const defensiveMarket = spyChange <= -1.5;
  let positionSizeFactor = vixLevel > 30 ? 0.5 : 1;
  if (vixLevel > 30) {
    console.log(`[ProStrategy] ${symbol}: VIX ${vixLevel.toFixed(1)} — tamaño ×50%`);
  }

  if (support != null && price > 0 && (price - support) / price > 0.05 && !crypto) {
    return hold("Soporte >5% lejos — skip");
  }

  const phase = getActiveTradingPhase();
  const firstHour = phase === "USA_OPEN" || phase === "EUROPE_OPEN";
  const news4h = newsPositiveHours(newsCtx, 4);
  const news8h = newsPositiveHours(newsCtx, 8);
  const sentScore = sentiment?.score ?? 0;
  const hits: ProStrategyHit[] = [];
  const reversalCandles = patterns.candlesticks
    .filter((p) => p.type === "BULLISH")
    .map((p) => p.name);

  // ─── ASIA ─────────────────────────────────────────────────────
  if (phase === "ASIA" || (isAsiaOpen() && isAsiaFocusTicker(symbol))) {
    if (
      ema9 != null &&
      ema21 != null &&
      ema50 != null &&
      ema9 > ema21 &&
      ema21 > ema50 &&
      rsiVal != null &&
      rsiVal >= 45 &&
      rsiVal <= 65 &&
      ich?.aboveCloud &&
      volume > v10 &&
      news8h
    ) {
      hits.push(
        hit("ASIA_TREND_NOCTURNO", "EMA stack + RSI + Ichimoku + vol Asia + news 8h", {
          stopLossPrice: ema21 * 0.995,
          takeProfitPrice: price * 1.06,
        }),
      );
    }
    if (
      goldenCrossRecent(c) &&
      ema50 != null &&
      price > ema50 &&
      rsiVal != null &&
      rsiVal > 50 &&
      rsiRising(c) &&
      relVol > 1.1
    ) {
      hits.push(
        hit("ASIA_GOLDEN_CROSS", "EMA50×EMA200 Asia + RSI>50 + vol", {
          stopLossPrice: ema50,
          takeProfitPrice: price * 1.08,
        }),
      );
    }
  }

  // ─── EUROPE ───────────────────────────────────────────────────
  if (phase === "EUROPE_OPEN" || phase === "EUROPE" || (isEuropeOpen() && isEuropeFocusTicker(symbol))) {
    if (
      phase === "EUROPE_OPEN" &&
      change1d >= 0.5 &&
      relVol >= 1.5 &&
      ema9 != null &&
      ema21 != null &&
      ema9 > ema21 &&
      resistance != null &&
      price > resistance
    ) {
      hits.push(
        hit("EU_APERTURA_BREAKOUT", `Gap/breakout EU +${change1d.toFixed(1)}% vs USA`, {
          stopLossPrice: dayLow > 0 ? dayLow : price * 0.985,
          takeProfitPrice: price * 1.04,
        }),
      );
    }
    if (
      (phase === "EUROPE" || phase === "EUROPE_OPEN") &&
      ema9 != null &&
      ema21 != null &&
      ema50 != null &&
      ema9 > ema21 &&
      ema21 > ema50 &&
      nearLevel(price, ema21, 0.01) &&
      rsiVal != null &&
      rsiVal >= 40 &&
      rsiVal <= 55 &&
      hasBullishReversalCandle(reversalCandles)
    ) {
      hits.push(
        hit("EU_EMA21_PULLBACK", `Pullback EMA21 + vela reversión RSI=${rsiVal.toFixed(0)}`, {
          stopLossPrice: ema50,
          takeProfitPrice: price * 1.05,
        }),
      );
    }
  }

  // ─── USA OPEN (14:30–15:30) ───────────────────────────────────
  if (phase === "USA_OPEN") {
    const gapHeldOk =
      inputs?.premarketCandidate === true &&
      (inputs.gapHeldMs == null || inputs.gapHeldMs >= 5 * 60_000);
    if (
      change1d >= 1.5 &&
      change1d <= 6 &&
      relVol >= 1.5 &&
      ema9 != null &&
      ema21 != null &&
      ema9 > ema21 &&
      gapHeldOk
    ) {
      const gapFloor = price * (1 - change1d / 100) * 0.995;
      const heldMin = Math.round((inputs?.gapHeldMs ?? 0) / 60_000);
      hits.push(
        hit(
          "USA_GAP_AND_GO",
          `Gap +${change1d.toFixed(1)}% mantenido ${heldMin}m (≥5m) + vol ${relVol.toFixed(1)}x`,
          {
            stopLossPrice: gapFloor,
            takeProfitPrice: price * 1.03,
          },
        ),
      );
    }
    if (
      change1d >= 1 &&
      change1d <= 4 &&
      relVol >= 2 &&
      rsiVal != null &&
      rsiVal >= 50 &&
      rsiVal <= 65 &&
      ema9 != null &&
      ema21 != null &&
      ema50 != null &&
      ema9 > ema21 &&
      ema21 > ema50
    ) {
      hits.push(
        hit("USA_MOMENTUM_PRIMERA_HORA", `Momentum +${change1d.toFixed(1)}% RSI=${rsiVal.toFixed(0)} vol ${relVol.toFixed(1)}x`, {
          stopLossPrice: price * 0.985,
          takeProfitPrice: price * 1.03,
        }),
      );
    }
    if (
      vwap5m != null &&
      vwap5m > 0 &&
      nearLevel(price, vwap5m, 0.004) &&
      price >= vwap5m * 0.998 &&
      relVol >= 1.2 &&
      (ema9_5m == null || ema21_5m == null || ema9_5m >= ema21_5m) &&
      (rsi5m == null || rsi5m >= 45)
    ) {
      hits.push(
        hit("USA_VWAP_BOUNCE", `Rebote VWAP $${vwap5m.toFixed(2)} + vol`, {
          stopLossPrice: price * 0.99,
          takeProfitPrice: price * 1.02,
        }),
      );
    }
    if (
      change1d <= -5 &&
      rsiVal != null &&
      rsiVal < 30 &&
      bb != null &&
      price <= bb.lower * 1.01 &&
      hasBullishReversalCandle(reversalCandles) &&
      relVol > 1.3
    ) {
      hits.push(
        hit("USA_REVERSAL_OVERSOLD", `Oversold apertura RSI=${rsiVal.toFixed(0)} + BB`, {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.06,
        }),
      );
    }
  }

  // ─── USA REGULAR ──────────────────────────────────────────────
  if (phase === "USA_REGULAR" || (phase === "USA_OPEN" && hits.length === 0)) {
    if (
      bars.length >= 200 &&
      change1d >= 1 &&
      change1d <= 5 &&
      rsiVal != null &&
      rsiVal >= 40 &&
      rsiVal <= 65
    ) {
      hits.push(
        hit("USA_EODHD_MOMENTUM", `EODHD momentum +${change1d.toFixed(1)}% RSI=${rsiVal.toFixed(0)} (${bars.length} barras)`, {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.05,
        }),
      );
    }
    if (bb != null && price < bb.lower && rsiVal != null && rsiVal >= 35) {
      hits.push(
        hit("USA_BB_OVERSOLD", `Precio bajo banda Bollinger inferior RSI=${rsiVal.toFixed(0)}`, {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.06,
        }),
      );
    }
    if (macdCrossUp(c) && rsiVal != null && rsiVal >= 40 && rsiVal <= 70) {
      hits.push(
        hit("USA_MACD_CROSS", "MACD cruce alcista confirmado", {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.05,
        }),
      );
    }
    if (
      ema9 != null &&
      ema21 != null &&
      ema50 != null &&
      ema200 != null &&
      ema9 > ema21 &&
      ema21 > ema50 &&
      ema50 > ema200 &&
      rsiVal != null &&
      rsiVal >= 50 &&
      rsiVal <= 65 &&
      ich?.aboveCloud &&
      relVol > 1 &&
      spyChange >= 0
    ) {
      hits.push(
        hit("USA_TREND_FOLLOWING", "EMA 9>21>50>200 + Ichimoku + SPY+", {
          stopLossPrice: ema21,
          takeProfitPrice: resistance ?? price * 1.08,
        }),
      );
    }
    const ihs = patterns.price.find((p) => p.name === "Inverse Head and Shoulders");
    if (ihs && relVol > 1.5 && rsiVal != null && rsiVal > 50 && macdCrossUp(c)) {
      hits.push(
        hit("USA_INVERSE_HS", "IH&S + neckline + MACD", {
          takeProfitPrice: ihs.targetPrice ?? price * 1.08,
          stopLossPct: 0.03,
        }),
      );
    }
    const db = patterns.price.find((p) => p.name === "Double Bottom" && p.type === "BULLISH");
    const rsiDiv = patterns.divergences.some((d) => d.indicator === "RSI" && d.type === "BULLISH");
    if (db && relVol > 1.5 && rsiDiv && macdCrossUp(c)) {
      hits.push(
        hit("USA_DOUBLE_BOTTOM", "Doble suelo + RSI div + MACD", {
          takeProfitPrice: db.targetPrice ?? price * 1.06,
          stopLossPrice: price * 0.98,
        }),
      );
    }
    if (
      earningsBeatRecent(newsCtx) &&
      change1d > 3 &&
      change1d < 10 &&
      relVol > 3 &&
      rsiVal != null &&
      rsiVal < 65 &&
      ema9 != null &&
      ema21 != null &&
      ema9 > ema21
    ) {
      hits.push(
        hit("USA_EARNINGS_MOMENTUM", `Earnings beat + Δ${change1d.toFixed(1)}% vol ${relVol.toFixed(1)}x`, {
          stopLossPrice: price * 0.97,
          takeProfitPrice: price * 1.08,
        }),
      );
    }
    if (
      news4h &&
      sentScore > 0.3 &&
      change1d >= 1 &&
      change1d <= 4 &&
      relVol > 1.2 &&
      ema9 != null &&
      ema21 != null &&
      ema9 > ema21
    ) {
      hits.push(
        hit("USA_NEWS_CATALYST", `News 4h + sentiment ${sentScore.toFixed(2)}`, {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.05,
        }),
      );
    }
  }

  // ─── AFTER-HOURS ──────────────────────────────────────────────
  if (phase === "USA_AFTERHOURS") {
    if (earningsBeatRecent(newsCtx) && change1d > 3 && relVol > 1.5) {
      hits.push(
        hit("AH_EARNINGS", `Earnings AH +${change1d.toFixed(1)}%`, {
          stopLossPrice: price * 0.97,
          takeProfitPrice: price * 1.08,
        }),
      );
    }
  }

  // ─── CRYPTO 24h ───────────────────────────────────────────────
  if (crypto) {
    const btcMove = marketQuotes.get("BTC")?.changePct ?? marketQuotes.get("BTCUSD")?.changePct ?? 0;
    if (
      (rsiVal != null && rsiVal < 40) ||
      change1h > 0.3
    ) {
      hits.push(
        hit("CRYPTO_SCALP", `Scalp RSI=${rsiVal?.toFixed(0) ?? "—"} Δ1h=${change1h.toFixed(2)}%`, {
          stopLossPrice: price * 0.98,
          takeProfitPrice: price * 1.05,
        }),
      );
    }
    if (
      goldenCrossRecent(c) &&
      ema50 != null &&
      price > ema50 &&
      rsiVal != null &&
      rsiVal > 50 &&
      relVol > 1.1
    ) {
      hits.push(
        hit("CRYPTO_GOLDEN_CROSS", "Golden Cross crypto + RSI>50", {
          stopLossPrice: ema50,
          takeProfitPrice: price * 1.15,
        }),
      );
    }
    if (
      rsiVal != null &&
      rsiVal < 28 &&
      bb != null &&
      price <= bb.lower * 1.01 &&
      relVol > 1.3 &&
      (ema200 == null || price > ema200)
    ) {
      hits.push(
        hit("CRYPTO_RSI_OVERSOLD", `RSI=${rsiVal.toFixed(0)} BB low crypto`, {
          stopLossPrice: price * 0.96,
          takeProfitPrice: price * 1.12,
        }),
      );
    }
    if (
      (symbol === "BTC" ? change1d > 2 : btcMove > 2) &&
      rsiVal != null &&
      rsiVal >= 50 &&
      rsiVal <= 70 &&
      ema9 != null &&
      ema21 != null &&
      ema9 > ema21 &&
      relVol > 1.1
    ) {
      hits.push(
        hit("CRYPTO_MOMENTUM", `Momentum crypto BTC/ETH follow +${change1d.toFixed(1)}%`, {
          stopLossPrice: price * 0.97,
          takeProfitPrice: price * 1.08,
        }),
      );
    }
  }

  if (defensiveMarket) {
    const filtered = hits.filter((h) => REVERSAL_ONLY_IDS.includes(h.id));
    hits.length = 0;
    hits.push(...filtered);
  }
  if (deepDown) {
    const filtered = hits.filter((h) => REVERSAL_ONLY_IDS.includes(h.id));
    hits.length = 0;
    hits.push(...filtered);
  }

  if (hits.length === 0) {
    console.log(`[ProStrategy] ${symbol}: ninguna señal (${phase})`);
    return hold("Ninguna estrategia activa en sesión", rsiVal);
  }

  const minTradeConfidence = minTradeConfidenceForPhase(phase, crypto);

  hits.sort((a, b) => b.baseConfidence - a.baseConfidence);
  const primary = hits[0]!;
  const scored = scoreFinal({
    primaryBase: primary.baseConfidence,
    hits: hits.length,
    relVol,
    news4h,
    sentiment: sentScore,
    sectorPos: null,
    sectorNeg: null,
    rsiOk: rsiVal != null && rsiVal >= 45 && rsiVal <= 65,
    firstHour,
    marketPos: spyChange > 0 || (crypto && (change1d > 0 || change1h > 0)),
    change1d,
  });

  if (scored.confidence < minTradeConfidence) {
    return hold(
      `Confianza ${(scored.confidence * 100).toFixed(0)}% < mínimo ${(minTradeConfidence * 100).toFixed(0)}%`,
      rsiVal,
    );
  }

  let stopLossPct = primary.stopLossPct;
  let takeProfitPct = primary.takeProfitPct;
  let stopLoss = primary.stopLossPrice ?? (support != null ? support * 0.995 : price * (1 - stopLossPct));
  let takeProfit = primary.takeProfitPrice ?? price * (1 + takeProfitPct);

  if (primary.stopLossPrice != null) {
    stopLoss = primary.stopLossPrice;
    stopLossPct = Math.max(0.005, (price - stopLoss) / price);
  }
  if (primary.takeProfitPrice != null && primary.takeProfitPrice > price) {
    takeProfit = primary.takeProfitPrice;
    takeProfitPct = (takeProfit - price) / price;
  }

  const capitalPct = capitalPctFromConfidence(scored.confidence) * positionSizeFactor;
  const newsHeadline = newsCtx.items6h[0]?.headline ?? newsCtx.items24h[0]?.headline;
  const newsAgeH =
    newsCtx.items6h[0] != null
      ? ((Date.now() / 1000 - newsCtx.items6h[0].datetime) / 3600).toFixed(0)
      : null;

  console.log(
    `[Signal] ${symbol} BUY conf=${(scored.confidence * 100).toFixed(0)}% | Sesión: ${phase}`,
  );
  console.log(`  Estrategia: ${primary.name}`);
  if (hits.length > 1) {
    console.log(`  Confirmaciones: ${hits.map((h) => h.id).join(" + ")}`);
  }
  console.log(
    `  Precio: $${price.toFixed(2)} | Cambio hoy: ${change1d >= 0 ? "+" : ""}${change1d.toFixed(1)}% | Vol: ${relVol.toFixed(1)}x media`,
  );
  console.log(
    `  EMA: ${
      ema9 != null && ema21 != null && ema50 != null && ema9 > ema21 && ema21 > ema50 ? "9>21>50 ✅" : "—"
    } | RSI: ${rsiVal != null ? `${rsiVal.toFixed(0)} ${rsiVal >= 45 && rsiVal <= 65 ? "✅" : ""}` : "—"} | MACD: ${
      macdCur && macdCur.line > macdCur.signal ? "alcista ✅" : "—"
    }`,
  );
  if (newsHeadline) {
    console.log(
      `  Noticias: "${newsHeadline.slice(0, 70)}"${newsAgeH != null ? ` (${newsAgeH}h)` : ""} | Sentiment: ${sentScore.toFixed(2)}`,
    );
  }
  console.log(
    `  SL: $${stopLoss.toFixed(2)}${support != null ? " (soporte)" : ""} | TP: $${takeProfit.toFixed(2)} (+${(takeProfitPct * 100).toFixed(0)}%)`,
  );
  console.log(
    `  Sizing: ${(capitalPct * 100).toFixed(0)}% capital | Score: ${scored.breakdown}`,
  );

  return {
    direction: "BUY",
    confidence: scored.confidence,
    reasoning: `${primary.reason} [${hits.map((h) => h.name).join(" + ")}]`,
    urgency: scored.confidence >= 0.8 ? "HIGH" : scored.confidence >= 0.7 ? "MEDIUM" : "LOW",
    strategyIds: hits.map((h) => h.id),
    primaryStrategy: primary.name,
    stopLossPct,
    takeProfitPct,
    stopLoss: Number(stopLoss.toFixed(4)),
    takeProfit: Number(takeProfit.toFixed(4)),
    rsi: rsiVal,
    positionSizeFactor,
    capitalPct: Number(capitalPct.toFixed(3)),
    metrics: {
      change1d,
      relVolume: relVol,
      ema9,
      ema21,
      ema50,
      vwapApprox: vwap5m ?? technicals.volume.vwap,
      dist52wHigh: yearHigh > 0 ? price / yearHigh : null,
    },
  };
}

export function regionalFocusTickersMadrid(): string[] {
  const crypto = [...IBKR_CRYPTO_TICKERS];
  if (isAsiaOpen() && !isEuropeOpen() && !isUSAOpen() && !isUSAExtendedOpen()) {
    return [...crypto, ...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS];
  }
  if (isEuropeOpen() && !isUSAOpen() && !isUSAExtendedOpen()) {
    return [...crypto, ...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS];
  }
  if (isUSAOpen() || isUSAExtendedOpen()) return [...crypto, "SPY", "QQQ", "IWM"];
  return [...crypto, "GLD", "IBIT"];
}

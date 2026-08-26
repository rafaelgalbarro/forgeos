/**
 * Professional mixed technical strategies — EOD history + live profile price.
 * Replaces low-precision GAP_AND_GO / VOLUME_SPIKE screener-only logic.
 */

import "server-only";

import {
  fetchCompanyNewsContext,
  fetchNewsSentiment,
  fetchMarketIndicators,
} from "@/lib/market-data/finnhub-pro";
import { getHistory, getQuote, type FmpBar } from "@/lib/market-data/fmp";
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
import {
  ASIA_ETF_TICKERS,
  EUROPE_ETF_TICKERS,
  getActiveTradingPhase,
  isAsiaOpen,
  isEuropeOpen,
  isUsaFirstHour,
  isUSAExtendedOpen,
  isUSAOpen,
} from "@/src/core/trading/market-session";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { isLossStreakBlacklisted } from "@/src/core/trading/strategies/strategy-blacklist";

export type ProStrategyId =
  | "TECHNICAL_CONFLUENCE"
  | "REVERSAL_OVERSOLD"
  | "ICHIMOKU_BREAKOUT"
  | "GOLDEN_CROSS_MOMENTUM"
  | "DOUBLE_BOTTOM_BREAKOUT"
  | "NEWS_CATALYST"
  | "INVERSE_HEAD_AND_SHOULDERS"
  | "GAP_AND_GO"
  | "EMA21_PULLBACK"
  | "MOMENTUM_BREAKOUT";

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
  positionSizeFactor: number;
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
};

const REVERSAL_ONLY_IDS: ProStrategyId[] = ["REVERSAL_OVERSOLD"];

const BASE: Record<
  ProStrategyId,
  { name: string; base: number; sl: number; tp: number; style: ProStrategyHit["style"]; days: number }
> = {
  TECHNICAL_CONFLUENCE: { name: "Technical Confluence", base: 0.78, sl: 0.02, tp: 0.05, style: "swing", days: 4 },
  REVERSAL_OVERSOLD: { name: "Reversal Oversold", base: 0.75, sl: 0.02, tp: 0.06, style: "scalping", days: 2 },
  ICHIMOKU_BREAKOUT: { name: "Ichimoku Breakout", base: 0.73, sl: 0.02, tp: 0.05, style: "swing", days: 5 },
  GOLDEN_CROSS_MOMENTUM: { name: "Golden Cross Momentum", base: 0.72, sl: 0.03, tp: 0.08, style: "swing", days: 8 },
  DOUBLE_BOTTOM_BREAKOUT: { name: "Double Bottom Breakout", base: 0.76, sl: 0.02, tp: 0.05, style: "swing", days: 4 },
  NEWS_CATALYST: { name: "News Catalyst", base: 0.7, sl: 0.015, tp: 0.04, style: "scalping", days: 1 },
  INVERSE_HEAD_AND_SHOULDERS: { name: "Inverse H&S", base: 0.8, sl: 0.03, tp: 0.08, style: "swing", days: 8 },
  GAP_AND_GO: { name: "Gap And Go", base: 0.74, sl: 0.015, tp: 0.05, style: "scalping", days: 1 },
  EMA21_PULLBACK: { name: "EMA21 Pullback", base: 0.73, sl: 0.02, tp: 0.06, style: "momentum", days: 3 },
  MOMENTUM_BREAKOUT: { name: "Momentum Breakout", base: 0.72, sl: 0.02, tp: 0.06, style: "momentum", days: 2 },
};

const SECTOR_ETF_MAP: Record<string, string> = {
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

function hit(id: ProStrategyId, reason: string, overrides?: Partial<ProStrategyHit>): ProStrategyHit {
  const b = BASE[id];
  return {
    id,
    name: b.name,
    baseConfidence: b.base,
    reason,
    stopLossPct: overrides?.stopLossPct ?? b.sl,
    takeProfitPct: overrides?.takeProfitPct ?? b.tp,
    style: b.style,
    timeframeDays: b.days,
    stopLossPrice: overrides?.stopLossPrice,
    takeProfitPrice: overrides?.takeProfitPrice,
  };
}

function toOhlcv(bars: readonly FmpBar[]): OhlcvBar[] {
  return bars.map((b) => ({
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
    date: b.date,
  }));
}

function appendLiveBar(bars: OhlcvBar[], price: number, volume: number, high: number, low: number): OhlcvBar[] {
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

function fibNearLevel(
  price: number,
  fibLevels: readonly { level: string; price: number }[],
): string | null {
  for (const f of fibLevels) {
    if (f.level === "38.2%" || f.level === "61.8%") {
      if (nearLevel(price, f.price, 0.015)) return f.level;
    }
  }
  return null;
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

function ichimokuCloudCrossUp(bars: readonly OhlcvBar[]): boolean {
  if (bars.length < 53) return false;
  const prev = bars.slice(0, -1);
  const cur = bars;
  const ichPrev = computeTechnicalIndicators(prev).trend.ichimoku;
  const ichCur = computeTechnicalIndicators(cur).trend.ichimoku;
  if (!ichPrev || !ichCur) return false;
  const prevPrice = prev.at(-1)!.close;
  const curPrice = cur.at(-1)!.close;
  return prevPrice <= ichPrev.cloudTop && curPrice > ichCur.cloudTop;
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

function logStrategyDetail(
  symbol: string,
  primary: ProStrategyHit,
  confidence: number,
  checks: Record<string, string>,
  sl: number,
  tp: number,
  slLabel: string,
  tpLabel: string,
): void {
  console.log(`[ProStrategy] ${symbol}: ${primary.id} conf=${(confidence * 100).toFixed(0)}%`);
  const line = Object.entries(checks)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" ");
  console.log(`  ${line}`);
  console.log(`  SL: $${sl.toFixed(2)} (${slLabel}) TP: $${tp.toFixed(2)} (${tpLabel})`);
}

/** Evaluate mixed technical strategies using EOD + live price. */
export async function evaluateProStrategies(
  symbol: string,
  inputs?: Partial<ScreenerInputs>,
): Promise<ProStrategySignal> {
  const quote = await getQuote(symbol).catch(() => null);
  const price = inputs?.price ?? quote?.price ?? 0;
  const change1d = inputs?.change1dPct ?? quote?.changePercentage ?? 0;
  const volume = inputs?.volume ?? quote?.volume ?? 0;
  const yearHigh = inputs?.yearHigh ?? quote?.yearHigh ?? 0;
  const dayHigh = quote?.dayHigh ?? price;
  const dayLow = quote?.dayLow ?? price;
  const bid = inputs?.bid;
  const ask = inputs?.ask;

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
    metrics: {
      change1d,
      relVolume: 0,
      ema9: null,
      ema21: null,
      ema50: quote?.priceAvg50 ?? null,
      vwapApprox: null,
      dist52wHigh: yearHigh > 0 && price > 0 ? price / yearHigh : null,
    },
  });

  if (!(price > 0.75)) {
    console.log(`[ProStrategy] ${symbol}: skip (precio ≤ $0.75)`);
    return hold("Precio bajo mínimo $0.75");
  }
  if (price > 200 && !isIbkrCryptoTicker(symbol)) {
    console.log(`[ProStrategy] ${symbol}: skip (precio > $200)`);
    return hold("Precio sobre máximo $200");
  }

  // Regla crítica: no comprar en el pico de la sesión
  if (change1d > 5) {
    console.log(`[ProStrategy] ${symbol}: skip (ya subió ${change1d.toFixed(1)}% > 5%)`);
    return hold(`Ya subió ${change1d.toFixed(1)}% — no comprar en pico`);
  }

  if (isLossStreakBlacklisted(symbol)) {
    console.log(`[ProStrategy] ${symbol}: skip (blacklist 3 pérdidas consecutivas)`);
    return hold("Blacklist: 3 pérdidas consecutivas");
  }

  const history = await getHistory(symbol, 250);
  let bars = appendLiveBar(toOhlcv(history), price, volume, dayHigh, dayLow);
  if (bars.length < 20) {
    console.log(`[ProStrategy] ${symbol}: skip (historial ${bars.length} < 20 velas)`);
    return hold(`Historial insuficiente (${bars.length} velas)`);
  }

  const vol20 = bars.slice(-20).reduce((s, b) => s + b.volume, 0) / 20;
  if (vol20 < 300_000 && !isIbkrCryptoTicker(symbol)) {
    console.log(`[ProStrategy] ${symbol}: skip (vol medio 20d ${(vol20 / 1e3).toFixed(0)}k < 300k)`);
    return hold("Volumen medio 20d insuficiente");
  }

  // Cambio intraday permitido: -2% … +5% (reversiones pueden ir por debajo)
  const deepDown = change1d < -2;

  const spreadEst =
    bid != null && ask != null && ask > bid && price > 0
      ? (ask - bid) / price
      : (dayHigh - dayLow) / price / 2;
  if (spreadEst > 0.03) {
    console.log(`[ProStrategy] ${symbol}: skip (spread est ${(spreadEst * 100).toFixed(1)}% > 3%)`);
    return hold("Spread estimado > 3%");
  }

  const technicals = computeTechnicalIndicators(bars);
  const patterns = recognizePatterns(bars, technicals);
  const c = closes(bars);
  const rsiVal = rsi(c);
  const relVol = relativeVolume(bars) ?? (vol20 > 0 ? volume / vol20 : 0);
  const ema9 = ema(c, 9);
  const ema21 = ema(c, 21);
  const ema50 = ema(c, 50);
  const macdCur = macd(c);
  const ich = technicals.trend.ichimoku;
  const bb = technicals.volatility.bollingerBands;
  const fibLevel = fibNearLevel(price, technicals.levels.fibonacci);
  const support = nearestSupport(price, technicals.levels.support);
  const resistance = nearestResistance(price, technicals.levels.resistance);

  const [newsCtx, sentiment, marketQuotes] = await Promise.all([
    fetchCompanyNewsContext(symbol),
    fetchNewsSentiment(symbol),
    fetchMarketIndicators(["SPY", "VIX", "^VIX"]),
  ]);

  const spy = marketQuotes.get("SPY");
  const vix = marketQuotes.get("VIX") ?? marketQuotes.get("^VIX");
  const spyChange = spy?.changePct ?? 0;
  const vixLevel = vix?.price ?? 0;
  const defensiveMarket = spyChange <= -1.5;
  let positionSizeFactor = vixLevel > 30 ? 0.5 : 1;
  if (vixLevel > 30) {
    console.log(`[ProStrategy] ${symbol}: VIX ${vixLevel.toFixed(1)} — tamaño ×50%`);
  }

  // Soporte demasiado lejos → skip (entrada sin ancla)
  if (support != null && price > 0 && (price - support) / price > 0.05) {
    console.log(
      `[ProStrategy] ${symbol}: skip (soporte ${(support).toFixed(2)} a >5% — ${(
        ((price - support) / price) *
        100
      ).toFixed(1)}%)`,
    );
    return hold("Soporte >5% lejos — skip");
  }

  const phase = getActiveTradingPhase();
  const firstHour = isUsaFirstHour() || phase === "EUROPE_OPEN";
  const hits: ProStrategyHit[] = [];

  // 0a. GAP AND GO — primera hora USA, gap 1.5–5% mantenido + vol
  if (isUsaFirstHour() && change1d >= 1.5 && change1d <= 5 && relVol >= 2) {
    const gapFloor = price * (1 - Math.min(0.02, change1d / 100 / 2));
    hits.push(
      hit("GAP_AND_GO", `Gap +${change1d.toFixed(1)}% mantenido + vol ${relVol.toFixed(1)}x`, {
        stopLossPrice: gapFloor,
        takeProfitPrice: price * 1.05,
        stopLossPct: 0.015,
        takeProfitPct: 0.05,
      }),
    );
  }

  // 0b. EMA21 PULLBACK — tendencia alcista + rebote cerca EMA21
  if (
    ema9 != null &&
    ema21 != null &&
    ema50 != null &&
    ema9 > ema21 &&
    ema21 > ema50 &&
    nearLevel(price, ema21, 0.012) &&
    rsiVal != null &&
    rsiVal >= 40 &&
    rsiVal <= 60 &&
    change1d < 5
  ) {
    hits.push(
      hit("EMA21_PULLBACK", `Pullback EMA21 en tendencia alcista RSI=${rsiVal.toFixed(0)}`, {
        stopLossPrice: ema21 * 0.985,
        takeProfitPrice: resistance ?? price * 1.06,
      }),
    );
  }

  // 0c. MOMENTUM BREAKOUT — ruptura resistencia + vol + Δ 1–5%
  if (
    resistance != null &&
    price > resistance &&
    change1d >= 1 &&
    change1d <= 5 &&
    relVol >= 1.5
  ) {
    hits.push(
      hit("MOMENTUM_BREAKOUT", `Ruptura resistencia $${resistance.toFixed(2)} + vol`, {
        stopLossPrice: resistance * 0.99,
        takeProfitPrice: price * 1.06,
      }),
    );
  }

  // 1. TECHNICAL CONFLUENCE — 4 of 6
  {
    let score = 0;
    if (ema9 != null && ema21 != null && ema50 != null && ema9 > ema21 && ema21 > ema50) score += 1;
    if (rsiVal != null && rsiVal >= 45 && rsiVal <= 65) score += 1;
    if (macdCrossUp(c)) score += 1;
    if (ich?.aboveCloud) score += 1;
    if (relVol > 1.5) score += 1;
    if (fibLevel != null) score += 1;
    if (score >= 4) {
      const slPrice = support != null ? support * 0.995 : price * (1 - BASE.TECHNICAL_CONFLUENCE.sl);
      const tpPrice = resistance ?? price * (1 + BASE.TECHNICAL_CONFLUENCE.tp);
      hits.push(
        hit("TECHNICAL_CONFLUENCE", `Confluencia ${score}/6 EMA+RSI+MACD+Ichi+Vol+Fib`, {
          stopLossPrice: slPrice,
          takeProfitPrice: tpPrice,
        }),
      );
    }
  }

  // 2. REVERSAL OVERSOLD
  {
    const reversalCandles = patterns.candlesticks.filter((p) => p.type === "BULLISH").map((p) => p.name);
    const atLowerBb = bb != null && price <= bb.lower * 1.01;
    const nearSup = support != null && nearLevel(price, support);
    const volSpike = relVol > 1.3;
    if (
      rsiVal != null &&
      rsiVal < 30 &&
      atLowerBb &&
      hasBullishReversalCandle(reversalCandles) &&
      nearSup &&
      volSpike
    ) {
      hits.push(hit("REVERSAL_OVERSOLD", `RSI=${rsiVal.toFixed(0)} BB low + vela reversión + soporte`));
    }
  }

  // 3. ICHIMOKU BREAKOUT
  {
    const tenkanAbove = ich != null && ich.tenkan > ich.kijun;
    const cloudCross = ichimokuCloudCrossUp(bars);
    if (cloudCross && tenkanAbove && relVol > 1.5) {
      const slPrice = ich?.kijun ?? price * (1 - BASE.ICHIMOKU_BREAKOUT.sl);
      hits.push(
        hit("ICHIMOKU_BREAKOUT", "Cruce nube + Tenkan>Kijun + volumen", {
          stopLossPrice: slPrice,
          takeProfitPrice: price * (1 + BASE.ICHIMOKU_BREAKOUT.tp),
        }),
      );
    }
  }

  // 4. GOLDEN CROSS MOMENTUM
  {
    if (goldenCrossRecent(c) && ema50 != null && price > ema50 && rsiVal != null && rsiVal > 50 && rsiRising(c) && relVol > 1.2) {
      hits.push(
        hit("GOLDEN_CROSS_MOMENTUM", "EMA50×EMA200 reciente + RSI>50 + vol", {
          stopLossPrice: ema50,
          takeProfitPrice: price * (1 + BASE.GOLDEN_CROSS_MOMENTUM.tp),
        }),
      );
    }
  }

  // 5. DOUBLE BOTTOM BREAKOUT
  {
    const dbPattern = patterns.price.find((p) => p.name === "Double Bottom" && p.type === "BULLISH");
    const rsiDiv = patterns.divergences.some((d) => d.indicator === "RSI" && d.type === "BULLISH");
    if (dbPattern && relVol > 1.5 && rsiDiv && macdCrossUp(c)) {
      hits.push(
        hit("DOUBLE_BOTTOM_BREAKOUT", "Doble suelo + ruptura neckline + RSI div + MACD", {
          takeProfitPrice: dbPattern.targetPrice ?? price * (1 + BASE.DOUBLE_BOTTOM_BREAKOUT.tp),
          stopLossPct: 0.02,
          stopLossPrice: price * 0.98,
        }),
      );
    }
  }

  // 6. NEWS CATALYST
  {
    const sentScore = sentiment?.score ?? 0;
    if (newsCtx.positive6h && sentScore > 0.3 && change1d > 2 && relVol > 1.2) {
      hits.push(hit("NEWS_CATALYST", `Noticia 6h + sentiment ${sentScore.toFixed(2)} + Δ${change1d.toFixed(1)}%`));
    }
  }

  // 7. INVERSE HEAD AND SHOULDERS
  {
    const ihs = patterns.price.find((p) => p.name === "Inverse Head and Shoulders");
    if (ihs && relVol > 1.5 && rsiVal != null && rsiVal > 50) {
      hits.push(
        hit("INVERSE_HEAD_AND_SHOULDERS", "IH&S + ruptura neckline + vol", {
          takeProfitPrice: ihs.targetPrice ?? price * (1 + BASE.INVERSE_HEAD_AND_SHOULDERS.tp),
          stopLossPct: 0.03,
        }),
      );
    }
  }

  if (defensiveMarket) {
    const before = hits.length;
    const filtered = hits.filter((h) => REVERSAL_ONLY_IDS.includes(h.id));
    hits.length = 0;
    hits.push(...filtered);
    if (before > filtered.length) {
      console.log(`[ProStrategy] ${symbol}: SPY ${spyChange.toFixed(1)}% — solo reversión`);
    }
  }

  if (deepDown) {
    const filtered = hits.filter((h) => REVERSAL_ONLY_IDS.includes(h.id));
    hits.length = 0;
    hits.push(...filtered);
  }

  const minConfirm = TRADING_CONFIG.ai.minStrategiesConfirming ?? 2;
  if (hits.length < minConfirm) {
    console.log(
      `[ProStrategy] ${symbol}: ${hits.length} estrategia(s) < mínimo ${minConfirm} — HOLD`,
    );
    return hold(
      hits.length === 0
        ? "Ninguna estrategia técnica activa"
        : `Solo ${hits.length} estrategia (mínimo ${minConfirm})`,
      rsiVal,
    );
  }

  hits.sort((a, b) => b.baseConfidence - a.baseConfidence);
  const primary = hits[0]!;

  let confidence = primary.baseConfidence;
  if (hits.length > 1) confidence += (hits.length - 1) * 0.08;
  // Bonos tiempo real / noticias (última 4–6h)
  if (newsCtx.positive6h) confidence += 0.1;
  else if (newsCtx.positive24h) confidence += 0.05;
  if ((sentiment?.score ?? 0) > 0.3) confidence += 0.05;
  if (relVol > 1) confidence += 0.05; // vol > media
  if (firstHour) confidence += 0.05;
  if (rsiVal != null && rsiVal >= 45 && rsiVal <= 65) confidence += 0.03;

  confidence = Math.min(0.92, confidence);

  const styleSlTp = (style: ProStrategyHit["style"], days: number): { sl: number; tp: number } => {
    if (style === "scalping" || days <= 1) return { sl: 0.015, tp: 0.03 };
    if (style === "momentum" || days <= 3) return { sl: 0.02, tp: 0.06 };
    return { sl: 0.03, tp: 0.08 };
  };

  const defaults = styleSlTp(primary.style, primary.timeframeDays);
  let stopLossPct = primary.stopLossPct ?? defaults.sl;
  let takeProfitPct = primary.takeProfitPct ?? defaults.tp;
  let stopLoss = primary.stopLossPrice ?? price * (1 - stopLossPct);
  let takeProfit = primary.takeProfitPrice ?? price * (1 + takeProfitPct);

  if (primary.stopLossPrice != null) {
    stopLoss = primary.stopLossPrice;
    stopLossPct = (price - stopLoss) / price;
  }
  if (primary.takeProfitPrice != null && primary.takeProfitPrice > price) {
    takeProfit = primary.takeProfitPrice;
    takeProfitPct = (takeProfit - price) / price;
  }

  const crypto = isIbkrCryptoTicker(symbol);
  if (crypto) {
    stopLossPct = 0.02;
    takeProfitPct = 0.05;
    stopLoss = price * (1 - stopLossPct);
    takeProfit = price * (1 + takeProfitPct);
  }

  const newsHeadline = newsCtx.items6h[0]?.headline ?? newsCtx.items24h[0]?.headline;
  const newsAgeH =
    newsCtx.items6h[0] != null
      ? ((Date.now() / 1000 - newsCtx.items6h[0].datetime) / 3600).toFixed(0)
      : null;

  console.log(
    `[Signal] ${symbol} BUY conf=${(confidence * 100).toFixed(0)}% | Sesión: ${phase}`,
  );
  console.log(`  Estrategias: ${hits.map((h) => h.id).join(" + ")}`);
  console.log(
    `  Precio: $${price.toFixed(2)} | Cambio: ${change1d >= 0 ? "+" : ""}${change1d.toFixed(1)}% | Vol: ${relVol.toFixed(1)}x`,
  );
  console.log(
    `  RSI: ${rsiVal != null ? rsiVal.toFixed(0) : "—"} | EMA9>EMA21 ${
      ema9 != null && ema21 != null && ema9 > ema21 ? "✅" : "—"
    } | Sobre soporte ${support != null && nearLevel(price, support, 0.03) ? "✅" : "—"}`,
  );
  if (newsHeadline) {
    console.log(
      `  Noticia: "${newsHeadline.slice(0, 80)}"${newsAgeH != null ? ` (${newsAgeH}h)` : ""} | Sentiment: ${(
        sentiment?.score ?? 0
      ).toFixed(2)}`,
    );
  }
  console.log(
    `  SL: $${stopLoss.toFixed(2)} | TP: $${takeProfit.toFixed(2)} (+${(takeProfitPct * 100).toFixed(0)}%)`,
  );
  console.log(
    `  Timing: ${firstHour ? "Primera hora ✅" : phase} | Premarket ${
      phase === "USA_PREMARKET" ? "prepare-only" : "—"
    }`,
  );

  return {
    direction: "BUY",
    confidence: Number(confidence.toFixed(3)),
    reasoning: `${primary.reason} [${hits.map((h) => h.name).join(" + ")}]`,
    urgency: confidence >= 0.8 ? "HIGH" : confidence >= 0.7 ? "MEDIUM" : "LOW",
    strategyIds: hits.map((h) => h.id),
    primaryStrategy: primary.name,
    stopLossPct,
    takeProfitPct,
    stopLoss: Number(stopLoss.toFixed(4)),
    takeProfit: Number(takeProfit.toFixed(4)),
    rsi: rsiVal,
    positionSizeFactor,
    metrics: {
      change1d,
      relVolume: relVol,
      ema9,
      ema21,
      ema50,
      vwapApprox: technicals.volume.vwap,
      dist52wHigh: yearHigh > 0 ? price / yearHigh : null,
    },
  };
}

/** Regional focus ETFs by Madrid session (Asia / Europa / USA) + crypto 24h. */
export function regionalFocusTickersMadrid(): string[] {
  const crypto = [...IBKR_CRYPTO_TICKERS];
  if (isAsiaOpen() && !isEuropeOpen() && !isUSAOpen() && !isUSAExtendedOpen()) {
    return [...crypto, ...ASIA_ETF_TICKERS];
  }
  if (isEuropeOpen() && !isUSAOpen() && !isUSAExtendedOpen()) {
    return [...crypto, ...EUROPE_ETF_TICKERS];
  }
  if (isUSAOpen() || isUSAExtendedOpen()) return [...crypto, "SPY", "QQQ", "IWM"];
  return [...crypto, "GLD", "IBIT"];
}

export { SECTOR_ETF_MAP };

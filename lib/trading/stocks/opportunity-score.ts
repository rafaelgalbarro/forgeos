/**
 * Multi-component technical score (0–100) for stocks opportunity scanner.
 */

import type { OhlcvBar } from "@/lib/market-data/types";
import {
  atr,
  ema,
  emaSeries,
  macd,
  relativeVolume,
  rsi,
  rsiSeries,
} from "@/lib/market-data/technical-indicators";
import { recognizePatterns } from "@/lib/market-data/pattern-recognition";
import { computeTechnicalIndicators } from "@/lib/market-data/technical-indicators";
import type { OpportunityComponentScores } from "@/lib/trading/stocks/scan-store";

function closes(bars: readonly OhlcvBar[]): number[] {
  return bars.map((b) => b.close);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function emaSlope(series: number[], lookback = 5): number {
  if (series.length < lookback + 1) return 0;
  const a = series[series.length - 1 - lookback]!;
  const b = series[series.length - 1]!;
  if (!(a > 0)) return 0;
  return (b - a) / a;
}

/** Higher highs / higher lows over last ~20 bars. */
function structureScore(bars: readonly OhlcvBar[]): number {
  if (bars.length < 40) return 40;
  const recent = bars.slice(-20);
  const prior = bars.slice(-40, -20);
  const hh = Math.max(...recent.map((b) => b.high)) > Math.max(...prior.map((b) => b.high));
  const hl = Math.min(...recent.map((b) => b.low)) > Math.min(...prior.map((b) => b.low));
  if (hh && hl) return 90;
  if (hh || hl) return 65;
  return 35;
}

function pivotLevels(bars: readonly OhlcvBar[], lookback = 60): { support: number; resistance: number } {
  const slice = bars.slice(-lookback);
  if (slice.length < 10) {
    const c = bars.at(-1)?.close ?? 0;
    return { support: c * 0.97, resistance: c * 1.05 };
  }
  const lows = [...slice].map((b) => b.low).sort((a, b) => a - b);
  const highs = [...slice].map((b) => b.high).sort((a, b) => b - a);
  const price = slice.at(-1)!.close;
  const support = lows.find((l) => l < price * 0.995) ?? lows[0]!;
  const resistance = highs.find((h) => h > price * 1.005) ?? highs[0]!;
  return { support, resistance };
}

function day20Extremes(bars: readonly OhlcvBar[]): { high20: number; low20: number } {
  const slice = bars.slice(-20);
  return {
    high20: Math.max(...slice.map((b) => b.high)),
    low20: Math.min(...slice.map((b) => b.low)),
  };
}

function vwapApprox(bars: readonly OhlcvBar[]): number | null {
  const slice = bars.slice(-20);
  let pv = 0;
  let vol = 0;
  for (const b of slice) {
    const typ = (b.high + b.low + b.close) / 3;
    pv += typ * b.volume;
    vol += b.volume;
  }
  return vol > 0 ? pv / vol : null;
}

function rsiDivergenceBull(bars: readonly OhlcvBar[]): boolean {
  const c = closes(bars);
  const series = rsiSeries(c, 14);
  if (series.length < 20 || c.length < 20) return false;
  const priceSlice = c.slice(-20);
  const rsiSlice = series.slice(-20);
  const mid = Math.floor(priceSlice.length / 2);
  const low1 = Math.min(...priceSlice.slice(0, mid));
  const low2 = Math.min(...priceSlice.slice(mid));
  const rsiAt = (priceLow: number) => {
    const idx = priceSlice.indexOf(priceLow);
    return idx >= 0 ? rsiSlice[idx]! : 50;
  };
  return low2 < low1 && rsiAt(low2) > rsiAt(low1);
}

export type OpportunityAnalysisInput = {
  daily: readonly OhlcvBar[];
  hourly: readonly OhlcvBar[];
  m15: readonly OhlcvBar[];
  benchmarkDaily: readonly OhlcvBar[];
};

export type OpportunityAnalysisResult = {
  components: OpportunityComponentScores;
  score: number;
  entry: number;
  stop: number;
  target: number;
  riskReward: number;
  expectedMovePct: number;
  rationale: string[];
  indicators: Record<string, number | string | boolean | null>;
  patternsHit: string[];
};

export function analyzeOpportunity(input: OpportunityAnalysisInput): OpportunityAnalysisResult | null {
  const { daily, hourly, m15, benchmarkDaily } = input;
  if (daily.length < 60) return null;

  const price = daily.at(-1)!.close;
  if (!(price > 0)) return null;

  const dCloses = closes(daily);
  const hCloses = closes(hourly.length ? hourly : daily);
  const snap = computeTechnicalIndicators(daily);
  const patterns = recognizePatterns(daily, snap);

  const ema20d = ema(dCloses, 20);
  const ema50d = ema(dCloses, 50);
  const ema200d = ema(dCloses, 200);
  const ema20h = ema(hCloses, 20);
  const ema50h = ema(hCloses, 50);
  const ema200h = ema(hCloses, 200);
  const slope20 = emaSlope(emaSeries(dCloses, 20));
  const slope50 = emaSlope(emaSeries(dCloses, 50));

  let trend = 40;
  const rationale: string[] = [];
  if (ema20d != null && ema50d != null && ema20d > ema50d) {
    trend += 15;
    rationale.push("EMA20 > EMA50 diario");
  }
  if (ema50d != null && ema200d != null && ema50d > ema200d) {
    trend += 15;
    rationale.push("EMA50 > EMA200 (tendencia alcista)");
  }
  if (slope20 > 0 && slope50 > 0) trend += 10;
  if (ema20h != null && ema50h != null && ema20h > ema50h) trend += 10;
  trend += structureScore(daily) * 0.1;
  trend = clamp(trend);

  const piv = pivotLevels(daily, 60);
  const { high20, low20 } = day20Extremes(daily);
  const vwap = vwapApprox(daily);
  const atr14 = atr(daily, 14) ?? price * 0.02;
  let levels = 40;
  if (price > piv.support && price < piv.resistance) levels += 10;
  if (vwap != null && price >= vwap * 0.995) {
    levels += 15;
    rationale.push("Precio ≥ VWAP");
  }
  if (price > low20 && (price - low20) / price < 0.04) {
    levels += 20;
    rationale.push("Cerca del mínimo 20d (soporte)");
  }
  if (price < high20 * 0.98) levels += 10;
  levels = clamp(levels);

  const rsi14 = rsi(dCloses, 14);
  const macdD = macd(dCloses);
  const relVol = relativeVolume(daily);
  let momentum = 40;
  if (rsi14 != null && rsi14 >= 40 && rsi14 <= 65) {
    momentum += 20;
    rationale.push(`RSI ${rsi14.toFixed(0)} en zona saludable`);
  } else if (rsi14 != null && rsi14 < 35) {
    momentum += 15;
    rationale.push(`RSI sobreventa ${rsi14.toFixed(0)}`);
  } else if (rsi14 != null && rsi14 > 72) {
    momentum -= 15;
  }
  if (macdD && macdD.histogram > 0) {
    momentum += 15;
    rationale.push("MACD histograma > 0");
  }
  if (relVol != null && relVol >= 1.5) {
    momentum += 15;
    rationale.push(`Volumen relativo ${relVol.toFixed(1)}×`);
  }
  if (rsiDivergenceBull(daily)) {
    momentum += 10;
    rationale.push("Divergencia alcista RSI");
  }
  momentum = clamp(momentum);

  const bullishCandles = patterns.candlesticks.filter((p) => p.type === "BULLISH");
  const bullishPrice = patterns.price.filter((p) => p.type === "BULLISH");
  const bullishSignals = patterns.signals.filter(
    (p) =>
      p.strength >= 60 &&
      !/death|bear|sell|breakdown/i.test(p.name + p.description),
  );
  const bullishPatterns = [
    ...bullishCandles.map((p) => ({ name: p.name, confidence: p.confidence })),
    ...bullishPrice.map((p) => ({ name: p.name, confidence: p.confidence })),
    ...bullishSignals.map((p) => ({ name: p.name, confidence: p.strength })),
  ];
  const patternsHit = bullishPatterns.map((p) => p.name).slice(0, 5);
  let patternScore = 35;
  for (const p of bullishPatterns) {
    patternScore += Math.min(20, (p.confidence / 100) * 25);
  }
  const nearSupport = Math.abs(price - piv.support) / price < 0.025;
  const hammerLike = bullishPatterns.some((p) =>
    /hammer|envolvente|engulfing|morning/i.test(p.name),
  );
  if (nearSupport && hammerLike) {
    patternScore += 15;
    rationale.push("Vela de giro sobre soporte");
  }
  if (/flag|pullback|breakout|base|doble|double/i.test(patternsHit.join(" "))) {
    patternScore += 10;
  }
  patternScore = clamp(patternScore);
  if (patternsHit[0]) rationale.push(`Patrón: ${patternsHit[0]}`);

  let relativeStrength = 50;
  if (benchmarkDaily.length >= 63 && daily.length >= 63) {
    const ret = (bars: readonly OhlcvBar[], n: number) => {
      const a = bars.at(-1)!.close;
      const b = bars.at(-Math.min(n, bars.length))!.close;
      return b > 0 ? (a - b) / b : 0;
    };
    const rs1m = ret(daily, 21) - ret(benchmarkDaily, 21);
    const rs3m = ret(daily, 63) - ret(benchmarkDaily, 63);
    relativeStrength = clamp(50 + rs1m * 400 + rs3m * 200);
    if (rs1m > 0 && rs3m > 0) rationale.push("Fuerza relativa > índice 1m/3m");
  }

  const components: OpportunityComponentScores = {
    trend: Math.round(trend),
    levels: Math.round(levels),
    momentum: Math.round(momentum),
    patterns: Math.round(patternScore),
    relativeStrength: Math.round(relativeStrength),
  };
  const score = Math.round(
    components.trend * 0.28 +
      components.levels * 0.18 +
      components.momentum * 0.22 +
      components.patterns * 0.18 +
      components.relativeStrength * 0.14,
  );

  const stopBySupport = piv.support * 0.995;
  const stopByAtr = price - atr14 * 1.5;
  const stop = Math.min(stopBySupport, stopByAtr);
  const target = Math.max(piv.resistance, high20, price + atr14 * 3);
  const risk = price - stop;
  const reward = target - price;
  const riskReward = risk > 0 ? reward / risk : 0;
  const expectedMovePct = (reward / price) * 100;

  // Soft m15 confirmation
  if (m15.length >= 30) {
    const e20 = ema(closes(m15), 20);
    const e50 = ema(closes(m15), 50);
    if (e20 != null && e50 != null && e20 > e50) {
      rationale.push("15m alineado alcista");
    }
  }

  return {
    components,
    score,
    entry: price,
    stop: Number(stop.toFixed(4)),
    target: Number(target.toFixed(4)),
    riskReward: Number(riskReward.toFixed(2)),
    expectedMovePct: Number(expectedMovePct.toFixed(2)),
    rationale: rationale.slice(0, 6),
    patternsHit,
    indicators: {
      ema20d,
      ema50d,
      ema200d,
      ema20h,
      ema50h,
      ema200h,
      rsi14,
      macdHist: macdD?.histogram ?? null,
      atr14,
      relativeVolume: relVol,
      vwap,
      support: piv.support,
      resistance: piv.resistance,
      high20,
      low20,
      slope20,
      slope50,
    },
  };
}

/**
 * Evaluate FOREX strategies A–F on OHLCV bars (no invented prices).
 */

import {
  computeBollinger,
  computeEmaSeries,
  computeMacd,
  computeRsi,
  type ForexBar,
} from "@/lib/investment/forex/indicators";
import {
  buildSlTpFromPips,
  getForexPair,
  priceToPips,
  type ForexIbkrContract,
} from "@/lib/investment/forex/config";
import {
  FOREX_STRATEGIES,
  getStrategyDef,
  isStrategyWindowActive,
  type ForexStrategyDef,
  type ForexStrategyId,
  type ForexStrategyStyle,
} from "@/lib/investment/forex/strategies/defs";

export type ForexStrategySignal = {
  strategyId: ForexStrategyId;
  code: ForexStrategyDef["code"];
  name: string;
  style: ForexStrategyStyle;
  pairId: string;
  display: string;
  side: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  stopPips: number;
  tpPips: number;
  confidence: number;
  reasons: string[];
  timeframe: string;
  estimatedMinutes: number;
  generatedAt: string;
};

function closes(bars: readonly ForexBar[]): number[] {
  return bars.map((b) => b.close).filter((n) => Number.isFinite(n));
}

function volumes(bars: readonly ForexBar[]): number[] {
  return bars.map((b) => (Number.isFinite(b.volume) ? Number(b.volume) : 0));
}

function lastCross(
  fast: readonly number[],
  slow: readonly number[],
): "UP" | "DOWN" | null {
  if (fast.length < 2 || slow.length < 2) return null;
  const n = Math.min(fast.length, slow.length);
  const f0 = fast[n - 2]!;
  const f1 = fast[n - 1]!;
  const s0 = slow[n - 2]!;
  const s1 = slow[n - 1]!;
  if (f0 <= s0 && f1 > s1) return "UP";
  if (f0 >= s0 && f1 < s1) return "DOWN";
  return null;
}

function pivotLevels(bars: readonly ForexBar[], lookback = 20): { support: number; resistance: number } | null {
  if (bars.length < lookback + 2) return null;
  const window = bars.slice(-lookback - 1, -1);
  const highs = window.map((b) => b.high);
  const lows = window.map((b) => b.low);
  return {
    resistance: Math.max(...highs),
    support: Math.min(...lows),
  };
}

function bullishCandle(b: ForexBar): boolean {
  return b.close > b.open && b.close >= b.low + (b.high - b.low) * 0.6;
}

function bearishCandle(b: ForexBar): boolean {
  return b.close < b.open && b.close <= b.high - (b.high - b.low) * 0.6;
}

function macdDivergence(bars: readonly ForexBar[]): "BULL" | "BEAR" | null {
  if (bars.length < 40) return null;
  const c = closes(bars);
  const macdVals: number[] = [];
  for (let i = 35; i <= c.length; i++) {
    const m = computeMacd(c.slice(0, i));
    if (m.macd != null) macdVals.push(m.macd);
  }
  if (macdVals.length < 10) return null;
  const priceSlice = c.slice(-macdVals.length);
  const pLow1 = Math.min(...priceSlice.slice(0, Math.floor(priceSlice.length / 2)));
  const pLow2 = Math.min(...priceSlice.slice(Math.floor(priceSlice.length / 2)));
  const mLow1 = Math.min(...macdVals.slice(0, Math.floor(macdVals.length / 2)));
  const mLow2 = Math.min(...macdVals.slice(Math.floor(macdVals.length / 2)));
  const pHigh1 = Math.max(...priceSlice.slice(0, Math.floor(priceSlice.length / 2)));
  const pHigh2 = Math.max(...priceSlice.slice(Math.floor(priceSlice.length / 2)));
  const mHigh1 = Math.max(...macdVals.slice(0, Math.floor(macdVals.length / 2)));
  const mHigh2 = Math.max(...macdVals.slice(Math.floor(macdVals.length / 2)));
  if (pLow2 < pLow1 && mLow2 > mLow1) return "BULL";
  if (pHigh2 > pHigh1 && mHigh2 < mHigh1) return "BEAR";
  return null;
}

function makeSignal(params: {
  def: ForexStrategyDef;
  pair: ForexIbkrContract;
  side: "BUY" | "SELL";
  entry: number;
  confidence: number;
  reasons: string[];
}): ForexStrategySignal | null {
  const levels = buildSlTpFromPips({
    pair: params.pair,
    side: params.side,
    entry: params.entry,
    stopPips: params.def.stopPips,
    tpPips: params.def.tpPips,
  });
  if (!levels) return null;
  return {
    strategyId: params.def.id,
    code: params.def.code,
    name: params.def.name,
    style: params.def.style,
    pairId: params.pair.pairId,
    display: params.pair.display,
    side: params.side,
    entry: levels.entry,
    stopLoss: levels.stopLoss,
    takeProfit: levels.takeProfit,
    stopPips: levels.stopPips,
    tpPips: levels.tpPips,
    confidence: params.confidence,
    reasons: params.reasons,
    timeframe: params.def.timeframe,
    estimatedMinutes: params.def.estimatedMinutes,
    generatedAt: new Date().toISOString(),
  };
}

function evalEmaCross(
  def: ForexStrategyDef,
  pair: ForexIbkrContract,
  bars: readonly ForexBar[],
  spreadPips: number | null,
): ForexStrategySignal | null {
  if (spreadPips != null && spreadPips > def.maxSpreadPips) return null;
  const c = closes(bars);
  if (c.length < 30) return null;
  const ema9 = computeEmaSeries(c, 9);
  const ema21 = computeEmaSeries(c, 21);
  // align: ema9 starts earlier — take last len(ema21) of ema9
  const f = ema9.slice(ema9.length - ema21.length);
  const cross = lastCross(f, ema21);
  const rsi = computeRsi(c);
  if (!cross || rsi == null) return null;
  if (cross === "UP" && rsi < 70) {
    return makeSignal({
      def,
      pair,
      side: "BUY",
      entry: c[c.length - 1]!,
      confidence: 0.72 + (rsi < 50 ? 0.08 : 0),
      reasons: [`EMA9×EMA21 alza`, `RSI ${rsi.toFixed(1)}`, `spread ${spreadPips?.toFixed(1) ?? "?"}p`],
    });
  }
  if (cross === "DOWN" && rsi > 30) {
    return makeSignal({
      def,
      pair,
      side: "SELL",
      entry: c[c.length - 1]!,
      confidence: 0.72 + (rsi > 50 ? 0.08 : 0),
      reasons: [`EMA9×EMA21 baja`, `RSI ${rsi.toFixed(1)}`, `spread ${spreadPips?.toFixed(1) ?? "?"}p`],
    });
  }
  return null;
}

function evalBbBounce(
  def: ForexStrategyDef,
  pair: ForexIbkrContract,
  bars: readonly ForexBar[],
  spreadPips: number | null,
): ForexStrategySignal | null {
  if (spreadPips != null && spreadPips > def.maxSpreadPips) return null;
  const c = closes(bars);
  if (c.length < 25) return null;
  const bb = computeBollinger(c);
  const rsi = computeRsi(c);
  const last = c[c.length - 1]!;
  if (bb.lower == null || bb.upper == null || rsi == null) return null;
  const touchLower = last <= bb.lower * 1.0005;
  const touchUpper = last >= bb.upper * 0.9995;
  if (touchLower && rsi < 30) {
    return makeSignal({
      def,
      pair,
      side: "BUY",
      entry: last,
      confidence: 0.75,
      reasons: [`BB lower touch`, `RSI ${rsi.toFixed(1)}`],
    });
  }
  if (touchUpper && rsi > 70) {
    return makeSignal({
      def,
      pair,
      side: "SELL",
      entry: last,
      confidence: 0.75,
      reasons: [`BB upper touch`, `RSI ${rsi.toFixed(1)}`],
    });
  }
  return null;
}

function evalMomentumBreakout(
  def: ForexStrategyDef,
  pair: ForexIbkrContract,
  bars: readonly ForexBar[],
  spreadPips: number | null,
): ForexStrategySignal | null {
  if (spreadPips != null && spreadPips > def.maxSpreadPips) return null;
  if (bars.length < 25) return null;
  const levels = pivotLevels(bars, 20);
  if (!levels) return null;
  const last = bars[bars.length - 1]!;
  const vols = volumes(bars);
  const avgVol =
    vols.slice(-21, -1).reduce((a, b) => a + b, 0) / Math.max(1, vols.slice(-21, -1).length);
  const volOk = avgVol <= 0 || last.volume == null || last.volume >= avgVol * 1.2;
  if (!volOk) return null;
  if (last.close > levels.resistance && last.high >= levels.resistance) {
    return makeSignal({
      def,
      pair,
      side: "BUY",
      entry: last.close,
      confidence: 0.7,
      reasons: [`Break resistencia ${levels.resistance.toFixed(5)}`, `vol spike`],
    });
  }
  if (last.close < levels.support && last.low <= levels.support) {
    return makeSignal({
      def,
      pair,
      side: "SELL",
      entry: last.close,
      confidence: 0.7,
      reasons: [`Break soporte ${levels.support.toFixed(5)}`, `vol spike`],
    });
  }
  return null;
}

function evalOverlap(
  def: ForexStrategyDef,
  pair: ForexIbkrContract,
  bars: readonly ForexBar[],
  spreadPips: number | null,
  inOverlap: boolean,
): ForexStrategySignal | null {
  if (!inOverlap) return null;
  if (spreadPips != null && spreadPips > def.maxSpreadPips) return null;
  const c = closes(bars);
  if (c.length < 40) return null;
  const rsi = computeRsi(c);
  const macd = computeMacd(c);
  const ema9 = computeEmaSeries(c, 9);
  const ema21 = computeEmaSeries(c, 21);
  if (rsi == null || macd.hist == null || ema9.length < 2 || ema21.length < 2) return null;
  const lastE9 = ema9[ema9.length - 1]!;
  const lastE21 = ema21[ema21.length - 1]!;
  let confluence = 0;
  const reasons: string[] = ["Overlap London/NY"];
  if (macd.hist > 0) {
    confluence += 1;
    reasons.push("MACD+");
  }
  if (macd.hist < 0) {
    confluence += 1;
    reasons.push("MACD-");
  }
  if (lastE9 > lastE21) {
    confluence += 1;
    reasons.push("EMA trend up");
  }
  if (lastE9 < lastE21) {
    confluence += 1;
    reasons.push("EMA trend down");
  }
  if (rsi > 45 && rsi < 65 && macd.hist > 0 && lastE9 > lastE21 && confluence >= 2) {
    return makeSignal({
      def,
      pair,
      side: "BUY",
      entry: c[c.length - 1]!,
      confidence: 0.78,
      reasons,
    });
  }
  if (rsi < 55 && rsi > 35 && macd.hist < 0 && lastE9 < lastE21 && confluence >= 2) {
    return makeSignal({
      def,
      pair,
      side: "SELL",
      entry: c[c.length - 1]!,
      confidence: 0.78,
      reasons,
    });
  }
  return null;
}

function evalSrBounce(
  def: ForexStrategyDef,
  pair: ForexIbkrContract,
  bars: readonly ForexBar[],
  spreadPips: number | null,
): ForexStrategySignal | null {
  if (spreadPips != null && spreadPips > def.maxSpreadPips) return null;
  const levels = pivotLevels(bars, 30);
  if (!levels || bars.length < 5) return null;
  const last = bars[bars.length - 1]!;
  const pip = priceToPips(pair, last.close, last.close + 1) > 0 ? 1 : 1;
  void pip;
  const nearSupport = Math.abs(last.low - levels.support) / (levels.resistance - levels.support || 1) < 0.08
    || priceToPips(pair, last.low, levels.support) <= 8;
  const nearResist = Math.abs(last.high - levels.resistance) / (levels.resistance - levels.support || 1) < 0.08
    || priceToPips(pair, last.high, levels.resistance) <= 8;
  if (nearSupport && bullishCandle(last)) {
    return makeSignal({
      def,
      pair,
      side: "BUY",
      entry: last.close,
      confidence: 0.74,
      reasons: [`Rebote soporte ${levels.support.toFixed(5)}`, "vela alcista"],
    });
  }
  if (nearResist && bearishCandle(last)) {
    return makeSignal({
      def,
      pair,
      side: "SELL",
      entry: last.close,
      confidence: 0.74,
      reasons: [`Rebote resistencia ${levels.resistance.toFixed(5)}`, "vela bajista"],
    });
  }
  return null;
}

function evalMacdDiv(
  def: ForexStrategyDef,
  pair: ForexIbkrContract,
  bars: readonly ForexBar[],
  spreadPips: number | null,
): ForexStrategySignal | null {
  if (spreadPips != null && spreadPips > def.maxSpreadPips) return null;
  const div = macdDivergence(bars);
  const levels = pivotLevels(bars, 30);
  if (!div || !levels) return null;
  const last = bars[bars.length - 1]!.close;
  if (div === "BULL" && last <= levels.support * 1.002) {
    return makeSignal({
      def,
      pair,
      side: "BUY",
      entry: last,
      confidence: 0.76,
      reasons: ["Divergencia alcista MACD", "precio en soporte"],
    });
  }
  if (div === "BEAR" && last >= levels.resistance * 0.998) {
    return makeSignal({
      def,
      pair,
      side: "SELL",
      entry: last,
      confidence: 0.76,
      reasons: ["Divergencia bajista MACD", "precio en resistencia"],
    });
  }
  return null;
}

export function evaluateStrategy(
  strategyId: ForexStrategyId,
  pairId: string,
  bars: readonly ForexBar[],
  opts: {
    spreadPips?: number | null;
    madridMinutes: number;
    weekend: boolean;
    primarySession?: string;
  },
): ForexStrategySignal | null {
  const def = getStrategyDef(strategyId);
  const pair = getForexPair(pairId);
  if (!pair) return null;
  if (!isStrategyWindowActive(def.style, opts.madridMinutes, opts.weekend)) return null;
  const spread = opts.spreadPips ?? null;
  const inOverlap = opts.primarySession === "OVERLAP_LONDON_NY";

  switch (strategyId) {
    case "EMA_CROSS_SCALP":
      return evalEmaCross(def, pair, bars, spread);
    case "BB_BOUNCE_SCALP":
      return evalBbBounce(def, pair, bars, spread);
    case "MOMENTUM_BREAKOUT_SCALP":
      return evalMomentumBreakout(def, pair, bars, spread);
    case "LONDON_NY_OVERLAP":
      return evalOverlap(def, pair, bars, spread, inOverlap);
    case "SR_BOUNCE":
      return evalSrBounce(def, pair, bars, spread);
    case "MACD_DIVERGENCE":
      return evalMacdDiv(def, pair, bars, spread);
    default:
      return null;
  }
}

export function evaluateAllStrategies(
  pairId: string,
  barsByTf: Partial<Record<string, readonly ForexBar[]>>,
  opts: {
    spreadPips?: number | null;
    madridMinutes: number;
    weekend: boolean;
    primarySession?: string;
  },
): ForexStrategySignal[] {
  const out: ForexStrategySignal[] = [];
  for (const def of FOREX_STRATEGIES) {
    const bars = barsByTf[def.timeframe] ?? barsByTf["5m"] ?? [];
    if (bars.length < 20) continue;
    const sig = evaluateStrategy(def.id, pairId, bars, opts);
    if (sig) out.push(sig);
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

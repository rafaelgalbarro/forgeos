import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, dailyVwap, ema, highestHigh, lowestLow, relVolume, rsi } from "@/lib/trading/crypto/indicators";
import type { MarketRegime } from "@/lib/trading/crypto/regime";
import {
  holdSignal,
  type CryptoStrategySignal,
  type FuturesShortStrategyId,
} from "./types";
import {
  TREND_PULLBACK_RSI_MAX,
  TREND_PULLBACK_RSI_MIN,
} from "./trend-pullback-1h";

function ret(bars: readonly Bar[], n: number): number | null {
  if (bars.length < n + 1) return null;
  const a = bars[bars.length - 1 - n]!.close;
  const b = bars[bars.length - 1]!.close;
  if (!(a > 0)) return null;
  return (b - a) / a;
}

/** VWAP rejection from below with bearish 1h trend (EMA20 < EMA50). */
export function evaluateVwapBounce5mShort(
  bars5m: readonly Bar[],
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "VWAP_BOUNCE_5M_SHORT" satisfies FuturesShortStrategyId;
  if (bars5m.length < 30 || bars1h.length < 30) {
    return holdSignal(id, "insuficientes barras");
  }
  const c1h = bars1h.map((b) => b.close);
  const e20 = ema(c1h, 20);
  const e50 = ema(c1h, 50);
  if (e20 == null || e50 == null || !(e20 < e50)) {
    return holdSignal(id, "1h no bajista");
  }

  const vwap = dailyVwap(bars5m);
  if (vwap == null || !(vwap > 0)) return holdSignal(id, "sin VWAP");
  const last = bars5m[bars5m.length - 1]!;
  const touched = last.low <= vwap * 1.001 && last.high >= vwap * 0.999;
  const rejected = last.close < vwap && last.close < last.open;
  if (!(touched && rejected)) return holdSignal(id, "sin touch+reject VWAP arriba");

  const price = last.close;
  return {
    strategyId: id,
    direction: "SELL",
    confidence: 0.7,
    reasoning: `VWAP_BOUNCE_5M_SHORT vwap=${vwap.toFixed(4)}`,
    entry: price,
    stopLoss: price * (1 + 0.007),
    takeProfit: price * (1 - 0.025),
    expectedMovePct: 0.025,
    maxHoldMs: 60 * 60_000,
    atr: price * 0.007,
    stopLossPct: 0.007,
    riskR: price * 0.007,
    candleTime: last.time,
  };
}

/** Downtrend pullback to EMA20 on 1h — mirror of TREND_PULLBACK_1H long. */
export function evaluateTrendPullback1hShort(
  bars1h: readonly Bar[],
): CryptoStrategySignal {
  const id = "TREND_PULLBACK_1H_SHORT" satisfies FuturesShortStrategyId;
  if (bars1h.length < 60) return holdSignal(id, "insuficientes barras 1h");
  const closes = bars1h.map((b) => b.close);
  const price = closes[closes.length - 1]!;
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(bars1h, 14);
  if (e20 == null || e50 == null || r == null || a == null) {
    return holdSignal(id, "indicadores incompletos");
  }
  if (!(e20 < e50)) return holdSignal(id, "EMA20>=EMA50 1h");
  if (Math.abs(price - e20) / price > 0.012) return holdSignal(id, "no en EMA20");
  if (r < TREND_PULLBACK_RSI_MIN || r > TREND_PULLBACK_RSI_MAX) {
    return holdSignal(id, `RSI=${r.toFixed(0)} fuera ${TREND_PULLBACK_RSI_MIN}-${TREND_PULLBACK_RSI_MAX}`);
  }
  const stopDist = Math.min(a * 1.5, price * 0.03);
  return {
    strategyId: id,
    direction: "SELL",
    confidence: 0.74,
    reasoning: `TREND_PULLBACK_1H_SHORT EMA20<EMA50 RSI=${r.toFixed(0)}`,
    entry: price,
    stopLoss: price + stopDist,
    takeProfit: price - stopDist * 2,
    expectedMovePct: (stopDist * 2) / price,
    maxHoldMs: 24 * 3600_000,
    atr: a,
    stopLossPct: stopDist / price,
    riskR: stopDist,
    candleTime: bars1h[bars1h.length - 1]!.time,
  };
}

/** Liquidity sweep above 20-bar high, close back inside — short. */
export function evaluateLiquiditySweep15mShort(
  bars15: readonly Bar[],
): CryptoStrategySignal {
  const id = "LIQUIDITY_SWEEP_15M_SHORT" satisfies FuturesShortStrategyId;
  if (bars15.length < 25) return holdSignal(id, "insuficientes barras");

  const prior = bars15.slice(-21, -1);
  const last = bars15[bars15.length - 1]!;
  const low20 = lowestLow(prior, prior.length);
  const high20 = highestHigh(prior, prior.length);
  if (low20 == null || high20 == null) return holdSignal(id, "rango 20 n/a");

  const swept = last.high > high20 && last.close < high20;
  if (!swept) return holdSignal(id, "sin sweep de liquidez arriba");

  const rv = relVolume(bars15, 20);
  if (rv == null || rv < 1.5) return holdSignal(id, `vol ${rv?.toFixed(2) ?? "n/a"}<1.5x`);

  const mid = (high20 + low20) / 2;
  const entry = last.close;
  const stopLoss = last.high * 1.001;
  const risk = stopLoss - entry;
  if (!(risk > 0)) return holdSignal(id, "risk=0");
  const tp2r = entry - risk * 2;
  const tp = mid < entry ? mid : tp2r;
  const a = atr(bars15, 14) ?? risk;

  return {
    strategyId: id,
    direction: "SELL",
    confidence: 0.72,
    reasoning: `LIQUIDITY_SWEEP_SHORT wick>high20 close-in vol=${rv.toFixed(1)}x`,
    entry,
    stopLoss,
    takeProfit: tp,
    expectedMovePct: (entry - tp) / entry,
    maxHoldMs: 12 * 3600_000,
    atr: a,
    stopLossPct: risk / entry,
    riskR: risk,
    candleTime: last.time,
  };
}

/** Relative weakness vs BTC — bottom RS, pullback to EMA20 15m for short. */
export function evaluateRsVsBtc1hShort(
  bars15: readonly Bar[],
  bars1h: readonly Bar[],
  btc1h: readonly Bar[],
  regime: MarketRegime,
  opts?: { isBottom3Rs?: boolean },
): CryptoStrategySignal {
  const id = "RS_VS_BTC_1H_SHORT" satisfies FuturesShortStrategyId;
  if (regime === "ALCISTA") return holdSignal(id, "BTC régimen ALCISTA");
  if (!opts?.isBottom3Rs) return holdSignal(id, "no bottom-3 RS vs BTC");
  if (bars15.length < 40 || bars1h.length < 10 || btc1h.length < 10) {
    return holdSignal(id, "insuficientes barras");
  }

  const pair1h = ret(bars1h, 1);
  const pair4h = ret(bars1h, 4);
  const btcR1 = ret(btc1h, 1);
  const btcR4 = ret(btc1h, 4);
  if (pair1h == null || pair4h == null || btcR1 == null || btcR4 == null) {
    return holdSignal(id, "returns n/a");
  }
  const rs1 = pair1h - btcR1;
  const rs4 = pair4h - btcR4;
  if (rs1 >= 0 || rs4 >= 0) return holdSignal(id, "RS no negativo 1h+4h");

  const c15 = bars15.map((b) => b.close);
  const e20 = ema(c15, 20);
  const price = c15[c15.length - 1]!;
  if (e20 == null) return holdSignal(id, "EMA20 n/a");
  if (Math.abs(price - e20) / price > 0.01) {
    return holdSignal(id, "sin pullback EMA20 15m");
  }

  const a = atr(bars15, 14) ?? price * 0.01;
  const stopLoss = Math.max(e20, price) + a;
  const takeProfit = price - (stopLoss - price) * 2;

  return {
    strategyId: id,
    direction: "SELL",
    confidence: 0.71,
    reasoning: `RS_VS_BTC_SHORT rs1h=${(rs1 * 100).toFixed(1)}% rs4h=${(rs4 * 100).toFixed(1)}%`,
    entry: price,
    stopLoss,
    takeProfit,
    expectedMovePct: (price - takeProfit) / price,
    maxHoldMs: 24 * 3600_000,
    atr: a,
    stopLossPct: (stopLoss - price) / price,
    riskR: stopLoss - price,
    candleTime: bars15[bars15.length - 1]!.time,
  };
}

/** Rank pairs by combined RS vs BTC; return bottom N (weakest). */
export function bottomRsPairsVsBtc(
  pairs: string[],
  get1h: (pair: string) => readonly Bar[],
  btc1h: readonly Bar[],
  n = 3,
): string[] {
  const scored: Array<{ pair: string; score: number }> = [];
  for (const pair of pairs) {
    if (pair === "XBTEUR" || pair === "BTCEUR") continue;
    const bars = get1h(pair);
    const p1 = ret(bars, 1);
    const p4 = ret(bars, 4);
    const b1 = ret(btc1h, 1);
    const b4 = ret(btc1h, 4);
    if (p1 == null || p4 == null || b1 == null || b4 == null) continue;
    scored.push({ pair, score: p1 - b1 + (p4 - b4) });
  }
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((s) => s.pair);
}

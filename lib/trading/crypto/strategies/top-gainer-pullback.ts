import type { Bar } from "@/lib/brokers/kraken/market-store";
import type { TickerSnap } from "@/lib/brokers/kraken/market-store";
import { atr, dailyVwap, ema } from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * TOP_GAINER_PULLBACK: +8%..+40% 24h, no chase, pullback to EMA20 15m or VWAP hold.
 * Force close 12h.
 */
export function evaluateTopGainerPullback(
  bars15: readonly Bar[],
  bars1h: readonly Bar[],
  ticker: TickerSnap | null,
): CryptoStrategySignal {
  const id = "TOP_GAINER_PULLBACK" as const;
  if (bars15.length < 40) return holdSignal(id, "insuficientes barras 15m");
  const change24 = ticker?.changePct24h ?? 0;
  if (change24 < 8 || change24 > 40) {
    return holdSignal(id, `chg24h=${change24.toFixed(1)}% fuera 8-40`);
  }

  const last1h = bars1h[bars1h.length - 1];
  if (last1h && last1h.open > 0) {
    const candlePct = ((last1h.close - last1h.open) / last1h.open) * 100;
    if (candlePct > 6) return holdSignal(id, `vela 1h +${candlePct.toFixed(1)}% chase`);
  }

  const c15 = bars15.map((b) => b.close);
  const price = c15[c15.length - 1]!;
  const e20 = ema(c15, 20);
  const a = atr(bars15, 14);
  const vwap = dailyVwap(bars15);
  if (e20 == null || a == null) return holdSignal(id, "indicadores incompletos");
  if ((price - e20) / e20 > 0.03) {
    return holdSignal(id, "precio >3% sobre EMA20 15m");
  }

  const nearEma = Math.abs(price - e20) / price <= 0.012;
  const aboveVwap = vwap != null && price >= vwap * 0.998;
  const last3 = bars15.slice(-3);
  const rangePct =
    last3.length === 3
      ? (Math.max(...last3.map((b) => b.high)) - Math.min(...last3.map((b) => b.low))) /
        price
      : 1;
  const consolidating = rangePct <= 0.015 && aboveVwap;

  if (!nearEma && !consolidating) {
    return holdSignal(id, "sin pullback EMA20 ni consolidación VWAP");
  }

  const stopDist = Math.min(a * 1.5, price * 0.03);
  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.68,
    reasoning: `TOP_GAINER +${change24.toFixed(0)}% pullback/VWAP`,
    entry: price,
    stopLoss: price - stopDist,
    takeProfit: price + stopDist * 2,
    expectedMovePct: (stopDist * 2) / price,
    maxHoldMs: 12 * 3600_000,
    atr: a,
    stopLossPct: stopDist / price,
    riskR: stopDist,
    candleTime: bars15[bars15.length - 1]!.time,
  };
}

import type { Bar } from "@/lib/brokers/kraken/market-store";
import {
  atr,
  bollinger,
  bollingerWidthSeries,
  relVolume,
} from "@/lib/trading/crypto/indicators";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * BB_SQUEEZE_BREAKOUT_15M: BB width at 100-bar minimum + breakout with vol > 2×.
 */
export function evaluateBbSqueezeBreakout15m(
  bars15: readonly Bar[],
): CryptoStrategySignal {
  const id = "BB_SQUEEZE_BREAKOUT_15M" as const;
  if (bars15.length < 120) return holdSignal(id, "insuficientes barras (100+)");

  const closes = bars15.map((b) => b.close);
  const widths = bollingerWidthSeries(closes, 20, 2);
  if (widths.length < 100) return holdSignal(id, "widths insuficientes");

  const recent = widths.slice(-100);
  const lastW = recent[recent.length - 1]!;
  const minW = Math.min(...recent);
  if (lastW > minW * 1.05) return holdSignal(id, "BB width no en mínimo");

  const bb = bollinger(closes, 20, 2);
  const last = bars15[bars15.length - 1]!;
  const prev = bars15[bars15.length - 2]!;
  if (!bb) return holdSignal(id, "BB n/a");

  const breakoutUp = last.close > bb.upper && prev.close <= bb.upper;
  if (!breakoutUp) return holdSignal(id, "sin ruptura upper BB");

  const rv = relVolume(bars15, 20);
  if (rv == null || rv < 2) return holdSignal(id, `vol ${rv?.toFixed(2) ?? "n/a"}<2x`);

  const entry = last.close;
  const a = atr(bars15, 14) ?? entry * 0.01;
  const stopLoss = Math.min(bb.mid, entry - a);
  const takeProfit = entry + (entry - stopLoss) * 2;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.73,
    reasoning: `BB_SQUEEZE breakout vol=${rv.toFixed(1)}x width=${lastW.toFixed(4)}`,
    entry,
    stopLoss,
    takeProfit,
    expectedMovePct: (takeProfit - entry) / entry,
    maxHoldMs: 18 * 3600_000,
    atr: a,
    stopLossPct: (entry - stopLoss) / entry,
    riskR: entry - stopLoss,
    candleTime: last.time,
  };
}

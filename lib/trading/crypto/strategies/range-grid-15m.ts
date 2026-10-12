import type { Bar } from "@/lib/brokers/kraken/market-store";
import { atr, lowestLow, highestHigh } from "@/lib/trading/crypto/indicators";
import type { MarketRegime } from "@/lib/trading/crypto/regime";
import { holdSignal, type CryptoStrategySignal } from "./types";

/**
 * RANGE_GRID_15M — only LATERAL: 24h range, low ATR; limit buy lower third.
 * Stop = 1×ATR below range low. Max 3 levels/pair handled by engine.
 * When regime leaves LATERAL, engine cancels/closes (forceExitReason).
 */
export function evaluateRangeGrid15m(
  bars15: readonly Bar[],
  regime: MarketRegime,
  openGridLevels = 0,
  opts?: {
    /** When true, 24h range uses bars before the last (signal) candle — no lookahead. */
    excludeSignalBarFromRange?: boolean;
    signalBarIndex?: number;
  },
): CryptoStrategySignal {
  const id = "RANGE_GRID_15M" as const;
  if (regime !== "LATERAL") {
    return {
      ...holdSignal(id, `régimen ${regime} — cancelar grid`),
      forceExitReason: "REGIME_EXIT_LATERAL",
      direction: "SELL",
      confidence: 0.5,
      reasoning: `RANGE_GRID salir LATERAL→${regime}`,
    };
  }
  if (bars15.length < 96) return holdSignal(id, "insuficientes barras 15m (24h)");
  if (openGridLevels >= 3) return holdSignal(id, "máx 3 niveles grid");

  const sigIdx = opts?.signalBarIndex ?? bars15.length - 1;
  const day = opts?.excludeSignalBarFromRange
    ? bars15.slice(Math.max(0, sigIdx - 96), sigIdx)
    : bars15.slice(-96);
  if (day.length < 48) return holdSignal(id, "rango 24h insuficiente (excl. señal)");
  const hi = highestHigh(day, day.length);
  const lo = lowestLow(day, day.length);
  const a = atr(bars15.slice(0, sigIdx + 1), 14);
  const price = bars15[sigIdx]!.close;
  if (hi == null || lo == null || a == null || !(hi > lo)) {
    return holdSignal(id, "rango inválido");
  }
  const range = hi - lo;
  // ATR bajo vs rango (lateral comprimido)
  if (a > range * 0.35) return holdSignal(id, "ATR alto vs rango");

  const lowerThird = lo + range / 3;
  // Signal: price in lower third → place limit at lowerThird (fill later in backtest)
  if (price > lowerThird) return holdSignal(id, "precio no en tercio inferior");

  const entry = lowerThird; // limit price — not market at close
  const stopLoss = lo - a;
  const takeProfit = hi - range / 3; // upper third
  const expectedMovePct = (takeProfit - entry) / entry;
  const candleTime = bars15[sigIdx]!.time;

  return {
    strategyId: id,
    direction: "BUY",
    confidence: 0.62,
    reasoning: `RANGE_GRID LATERAL low=${lo.toFixed(4)} hi=${hi.toFixed(4)} lvl=${openGridLevels + 1}`,
    entry,
    stopLoss,
    takeProfit,
    expectedMovePct,
    maxHoldMs: 36 * 3600_000,
    atr: a,
    stopLossPct: (entry - stopLoss) / entry,
    riskR: entry - stopLoss,
    candleTime,
    gridLevel: openGridLevels + 1,
  };
}

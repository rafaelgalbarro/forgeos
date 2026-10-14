/**
 * Kraken Futures venue config — defaults keep spot path unchanged.
 */

import "server-only";

import { readCryptoEnvLocal } from "@/lib/trading/crypto/live-strategies";

export type CryptoVenue = "spot" | "futures";

export function getCryptoVenue(): CryptoVenue {
  const raw =
    readCryptoEnvLocal("CRYPTO_VENUE") ?? process.env.CRYPTO_VENUE ?? "spot";
  const v = raw.trim().toLowerCase();
  return v === "futures" ? "futures" : "spot";
}

export function isCryptoFuturesVenue(): boolean {
  return getCryptoVenue() === "futures";
}

/** Hard cap 2× even if env requests more. Default 1×. */
export function futuresMaxLeverage(): number {
  const n = Number(
    readCryptoEnvLocal("FUTURES_MAX_LEVERAGE") ??
      process.env.FUTURES_MAX_LEVERAGE ??
      1,
  );
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(2, Math.max(1, n));
}

/** Default true — simulated entries with real prices/fees. */
export function futuresShadowMode(): boolean {
  const raw =
    readCryptoEnvLocal("FUTURES_SHADOW_MODE") ??
    process.env.FUTURES_SHADOW_MODE ??
    "true";
  const v = raw.trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(v)) return false;
  return true;
}

/** Empty default → no live futures strategies (all shadow). */
export function parseFuturesLiveStrategiesList(): Set<string> {
  const raw =
    readCryptoEnvLocal("FUTURES_LIVE_STRATEGIES") ??
    process.env.FUTURES_LIVE_STRATEGIES ??
    "";
  const out = new Set<string>();
  if (!raw.trim()) return out;
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (id) out.add(id);
  }
  return out;
}

export function isFuturesStrategyLive(strategyId: string): boolean {
  const list = parseFuturesLiveStrategiesList();
  return list.has(strategyId.trim().toUpperCase());
}

/** Futures daily max loss uses separate capital baseline (flex balance). */
export function futuresDailyMaxLossPct(): number {
  return 0.03;
}

/** Use demo-futures.kraken.com (see KRAKEN_FUTURES_USE_DEMO). */
export function futuresUseDemoEndpoint(): boolean {
  const raw =
    readCryptoEnvLocal("KRAKEN_FUTURES_USE_DEMO") ??
    process.env.KRAKEN_FUTURES_USE_DEMO ??
    "";
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/**
 * Global crypto market regime from BTC/EUR + ETH/EUR.
 */

import "server-only";

import { getBars, type Bar, restBackfill } from "@/lib/brokers/kraken/market-store";
import { ema } from "@/lib/trading/crypto/indicators";

export type MarketRegime = "ALCISTA" | "LATERAL" | "BAJISTA";

type RegimeState = {
  regime: MarketRegime;
  btcDrop1hPct: number;
  buyPauseUntil: number;
  updatedAt: string;
};

let state: RegimeState = {
  regime: "LATERAL",
  btcDrop1hPct: 0,
  buyPauseUntil: 0,
  updatedAt: new Date().toISOString(),
};

function closes(bars: Bar[]): number[] {
  return bars.map((b) => b.close);
}

function aggregate4h(bars1h: Bar[]): Bar[] {
  const out: Bar[] = [];
  for (let i = 3; i < bars1h.length; i += 4) {
    const slice = bars1h.slice(i - 3, i + 1);
    out.push({
      time: slice[0]!.time,
      open: slice[0]!.open,
      high: Math.max(...slice.map((s) => s.high)),
      low: Math.min(...slice.map((s) => s.low)),
      close: slice[slice.length - 1]!.close,
      volume: slice.reduce((a, s) => a + s.volume, 0),
    });
  }
  return out;
}

export async function updateMarketRegime(): Promise<RegimeState> {
  for (const pair of ["XBTEUR", "ETHEUR"]) {
    if (getBars(pair, "60").length < 60) {
      await restBackfill(pair, 60).catch(() => undefined);
    }
  }
  const btc1h = getBars("XBTEUR", "60");
  const eth1h = getBars("ETHEUR", "60");
  const btc4h = aggregate4h(btc1h);
  const cBtc1h = closes(btc1h);
  const cBtc4h = closes(btc4h);
  const cEth4h = closes(aggregate4h(eth1h));

  const ema20_4h = ema(cBtc4h, 20);
  const ema50_4h = ema(cBtc4h, 50);
  const ema200_1h = ema(cBtc1h, 200);
  const price = cBtc1h[cBtc1h.length - 1] ?? 0;

  let regime: MarketRegime = "LATERAL";
  if (
    ema20_4h != null &&
    ema50_4h != null &&
    ema200_1h != null &&
    ema20_4h > ema50_4h &&
    price > ema200_1h
  ) {
    regime = "ALCISTA";
  } else if (
    ema20_4h != null &&
    ema50_4h != null &&
    (ema20_4h < ema50_4h * 0.998 || (ema200_1h != null && price < ema200_1h * 0.98))
  ) {
    // Confirm with ETH weak
    const ethEma20 = ema(cEth4h, 20);
    const ethEma50 = ema(cEth4h, 50);
    if (ethEma20 != null && ethEma50 != null && ethEma20 < ethEma50) {
      regime = "BAJISTA";
    } else if (ema20_4h < ema50_4h) {
      regime = "BAJISTA";
    }
  }

  let btcDrop1hPct = 0;
  if (btc1h.length >= 2) {
    const prev = btc1h[btc1h.length - 2]!.close;
    const last = btc1h[btc1h.length - 1]!.close;
    if (prev > 0) btcDrop1hPct = ((last - prev) / prev) * 100;
  }
  let buyPauseUntil = state.buyPauseUntil;
  if (btcDrop1hPct <= -3) {
    buyPauseUntil = Math.max(buyPauseUntil, Date.now() + 2 * 60 * 60 * 1000);
    console.log(
      `[Kraken/Regime] BTC ${btcDrop1hPct.toFixed(2)}% 1h → pausa compras 2h`,
    );
  }

  state = {
    regime,
    btcDrop1hPct,
    buyPauseUntil,
    updatedAt: new Date().toISOString(),
  };
  console.log(
    `[Kraken/Regime] ${regime} btc1h=${btcDrop1hPct.toFixed(2)}% pauseBuys=${buyPauseUntil > Date.now()}`,
  );
  return state;
}

export function getMarketRegime(): RegimeState {
  return state;
}

export function isBuyPausedByRegime(): { paused: boolean; reason?: string } {
  if (Date.now() < state.buyPauseUntil) {
    return { paused: true, reason: "pausa 2h tras caída BTC >3% 1h" };
  }
  if (state.regime === "BAJISTA") {
    return { paused: true, reason: "régimen BAJISTA — solo salidas" };
  }
  return { paused: false };
}

export function sizeMultiplierForRegime(): number {
  if (state.regime === "LATERAL") return 0.5;
  return 1;
}

export function allowedStrategiesForRegime(): Set<string> | "all" {
  if (state.regime === "ALCISTA") return "all";
  if (state.regime === "LATERAL") return new Set(["RSI_MEAN_REVERSION_15M"]);
  return new Set(); // BAJISTA — no new buys
}

let regimeTimer: ReturnType<typeof setInterval> | null = null;

export function startRegimeScheduler(): void {
  if (regimeTimer) return;
  void updateMarketRegime().catch(() => undefined);
  regimeTimer = setInterval(() => {
    void updateMarketRegime().catch(() => undefined);
  }, 5 * 60_000);
  if (typeof regimeTimer === "object" && "unref" in regimeTimer) regimeTimer.unref?.();
}

/**
 * Global crypto market regime from BTC/EUR + ETH/EUR.
 *
 * BAJISTA requires structural bear (EMA20 4h < EMA50 4h AND price < EMA200 1h)
 * plus a current decline (BTC 24h < −1.5% OR BTC 4h < −1%). Otherwise LATERAL.
 */

import "server-only";

import { getBars, type Bar, restBackfill } from "@/lib/brokers/kraken/market-store";
import { ema } from "@/lib/trading/crypto/indicators";
import { recordRegimeTick } from "@/lib/trading/crypto/diagnostics";

export type MarketRegime = "ALCISTA" | "LATERAL" | "BAJISTA";

/** legacy = pre-13/10; decline_confirm = require live drawdown for BAJISTA. */
export type RegimeRuleVersion = "legacy" | "decline_confirm";

/** Active live rule (validated via scripts/validate-crypto-regime-rsi.ts). */
export const ACTIVE_REGIME_RULE: RegimeRuleVersion = "decline_confirm";

type RegimeState = {
  regime: MarketRegime;
  btcDrop1hPct: number;
  btcRet4hPct: number;
  btcRet24hPct: number;
  buyPauseUntil: number;
  updatedAt: string;
  /** Raw regime before hysteresis (debug). */
  rawRegime?: MarketRegime;
  pendingRegime?: MarketRegime | null;
  pendingSince?: string | null;
  rule?: RegimeRuleVersion;
};

let state: RegimeState = {
  regime: "LATERAL",
  btcDrop1hPct: 0,
  btcRet4hPct: 0,
  btcRet24hPct: 0,
  buyPauseUntil: 0,
  updatedAt: new Date().toISOString(),
  pendingRegime: null,
  pendingSince: null,
  rule: ACTIVE_REGIME_RULE,
};

/** Require candidate regime to persist this long before flipping. */
const REGIME_HYSTERESIS_MS = 20 * 60_000;

function closes(bars: readonly Bar[]): number[] {
  return bars.map((b) => b.close);
}

export function aggregate4h(bars1h: readonly Bar[]): Bar[] {
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

/** Percent change vs N bars ago (e.g. 24 on 1h = ~24h). */
export function pctChangeVsBarsAgo(
  closesArr: readonly number[],
  barsAgo: number,
): number | null {
  if (closesArr.length <= barsAgo || barsAgo < 1) return null;
  const last = closesArr[closesArr.length - 1]!;
  const prev = closesArr[closesArr.length - 1 - barsAgo]!;
  if (!(prev > 0) || !Number.isFinite(last)) return null;
  return ((last - prev) / prev) * 100;
}

export type RegimeClassifyInputs = {
  ema20_4h: number | null;
  ema50_4h: number | null;
  ema200_1h: number | null;
  price: number;
  btcRet24hPct: number | null;
  btcRet4hPct: number | null;
  /** Used only by legacy rule. */
  ethEma20_4h?: number | null;
  ethEma50_4h?: number | null;
};

/**
 * Pure raw regime (no hysteresis). Used by live engine + 30d backtester.
 */
export function classifyRawRegime(
  inputs: RegimeClassifyInputs,
  rule: RegimeRuleVersion = ACTIVE_REGIME_RULE,
): MarketRegime {
  const {
    ema20_4h,
    ema50_4h,
    ema200_1h,
    price,
    btcRet24hPct,
    btcRet4hPct,
    ethEma20_4h,
    ethEma50_4h,
  } = inputs;

  if (
    ema20_4h != null &&
    ema50_4h != null &&
    ema200_1h != null &&
    ema20_4h > ema50_4h &&
    price > ema200_1h
  ) {
    return "ALCISTA";
  }

  if (rule === "legacy") {
    if (
      ema20_4h != null &&
      ema50_4h != null &&
      (ema20_4h < ema50_4h * 0.998 ||
        (ema200_1h != null && price < ema200_1h * 0.98))
    ) {
      if (
        ethEma20_4h != null &&
        ethEma50_4h != null &&
        ethEma20_4h < ethEma50_4h
      ) {
        return "BAJISTA";
      }
      if (ema20_4h < ema50_4h) return "BAJISTA";
    }
    return "LATERAL";
  }

  // decline_confirm: structural bear + live decline
  const structuralBear =
    ema20_4h != null &&
    ema50_4h != null &&
    ema200_1h != null &&
    ema20_4h < ema50_4h &&
    price < ema200_1h;
  const currentDecline =
    (btcRet24hPct != null && btcRet24hPct < -1.5) ||
    (btcRet4hPct != null && btcRet4hPct < -1);

  if (structuralBear && currentDecline) return "BAJISTA";
  return "LATERAL";
}

/** Build classify inputs from 1h BTC (+ optional ETH) bars. */
export function regimeInputsFromBars(
  btc1h: readonly Bar[],
  eth1h?: readonly Bar[],
): RegimeClassifyInputs & {
  btcDrop1hPct: number;
} {
  const btc4h = aggregate4h(btc1h);
  const cBtc1h = closes(btc1h);
  const cBtc4h = closes(btc4h);
  const cEth4h = eth1h?.length ? closes(aggregate4h(eth1h)) : [];

  const price = cBtc1h[cBtc1h.length - 1] ?? 0;
  let btcDrop1hPct = 0;
  if (btc1h.length >= 2) {
    const prev = btc1h[btc1h.length - 2]!.close;
    const last = btc1h[btc1h.length - 1]!.close;
    if (prev > 0) btcDrop1hPct = ((last - prev) / prev) * 100;
  }

  return {
    ema20_4h: ema(cBtc4h, 20),
    ema50_4h: ema(cBtc4h, 50),
    ema200_1h: ema(cBtc1h, 200),
    price,
    btcRet24hPct: pctChangeVsBarsAgo(cBtc1h, 24),
    btcRet4hPct: pctChangeVsBarsAgo(cBtc1h, 4),
    ethEma20_4h: cEth4h.length ? ema(cEth4h, 20) : null,
    ethEma50_4h: cEth4h.length ? ema(cEth4h, 50) : null,
    btcDrop1hPct,
  };
}

export async function updateMarketRegime(): Promise<RegimeState> {
  for (const pair of ["XBTEUR", "ETHEUR"]) {
    if (getBars(pair, "60").length < 220) {
      await restBackfill(pair, 60).catch(() => undefined);
    }
    if (getBars(pair, "240").length < 60) {
      await restBackfill(pair, 240).catch(() => undefined);
    }
  }
  const btc1h = getBars("XBTEUR", "60");
  const eth1h = getBars("ETHEUR", "60");
  const inputs = regimeInputsFromBars(btc1h, eth1h);
  const regime = classifyRawRegime(inputs, ACTIVE_REGIME_RULE);

  let buyPauseUntil = state.buyPauseUntil;
  if (inputs.btcDrop1hPct <= -3) {
    buyPauseUntil = Math.max(buyPauseUntil, Date.now() + 2 * 60 * 60 * 1000);
    console.log(
      `[Kraken/Regime] BTC ${inputs.btcDrop1hPct.toFixed(2)}% 1h → pausa compras 2h`,
    );
  }

  // Hysteresis: do not flip on every candle — candidate must persist ≥20 min
  let next = state.regime;
  let pendingRegime = state.pendingRegime ?? null;
  let pendingSince = state.pendingSince ?? null;
  if (regime === state.regime) {
    pendingRegime = null;
    pendingSince = null;
    next = regime;
  } else if (regime === pendingRegime && pendingSince) {
    if (Date.now() - Date.parse(pendingSince) >= REGIME_HYSTERESIS_MS) {
      next = regime;
      pendingRegime = null;
      pendingSince = null;
    }
  } else {
    pendingRegime = regime;
    pendingSince = new Date().toISOString();
    next = state.regime;
  }

  const btcRet4hPct = inputs.btcRet4hPct ?? 0;
  const btcRet24hPct = inputs.btcRet24hPct ?? 0;

  state = {
    regime: next,
    rawRegime: regime,
    btcDrop1hPct: inputs.btcDrop1hPct,
    btcRet4hPct,
    btcRet24hPct,
    buyPauseUntil,
    updatedAt: new Date().toISOString(),
    pendingRegime,
    pendingSince,
    rule: ACTIVE_REGIME_RULE,
  };
  console.log(
    `[Kraken/Regime] ${next} (raw=${regime}` +
      `${pendingRegime ? ` pending=${pendingRegime}` : ""}) ` +
      `rule=${ACTIVE_REGIME_RULE} ` +
      `btc1h=${inputs.btcDrop1hPct.toFixed(2)}% ` +
      `btc4h=${btcRet4hPct.toFixed(2)}% btc24h=${btcRet24hPct.toFixed(2)}% ` +
      `pauseBuys=${buyPauseUntil > Date.now()}`,
  );
  recordRegimeTick(next);
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

const LATERAL_STRATEGIES = [
  "RSI_MEAN_REVERSION_15M",
  "RANGE_GRID_15M",
  "VWAP_RECLAIM_15M",
  "LIQUIDITY_SWEEP_15M",
  "EMA_CROSS_15M",
  "SESSION_OPEN_BREAKOUT",
  "MICRO_BREAKOUT_1M",
  "MOMENTUM_IGNITION_1M",
  "CAPITULATION_REVERSAL_1M",
  "VWAP_BOUNCE_5M",
] as const;

export function allowedStrategiesForRegimeValue(
  regime: MarketRegime,
): Set<string> | "all" {
  if (regime === "ALCISTA") return "all";
  if (regime === "LATERAL") return new Set(LATERAL_STRATEGIES);
  return new Set(); // BAJISTA — no new buys
}

export function allowedStrategiesForRegime(): Set<string> | "all" {
  return allowedStrategiesForRegimeValue(state.regime);
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

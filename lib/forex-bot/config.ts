/**
 * Forex bot configuration — read from env at call time (pure, no server-only).
 *
 *   FOREX_BOT_MODE            shadow (default) | practice | live
 *   FOREX_BOT_RISK_PCT        risk per trade, % of NAV (default 2, hard cap 2)
 *   FOREX_BOT_MIN_LOT_MAX_RISK_PCT up to this % when the minimum lot forces it (default 3, cap 5)
 *   FOREX_BOT_DAILY_LOSS_PCT  stop trading for the day after this loss (default 4)
 *   FOREX_BOT_MAX_POSITIONS   concurrent trades (default 2)
 *   FOREX_BOT_PAIRS           comma list (default 21 majors + crosses)
 *   FOREX_BOT_SESSION         24h (default, Sun 23:00 → Fri 19:00 London) | london
 *   FOREX_BOT_STRATEGIES      comma list (default both)
 *   FOREX_BOT_MAX_LEVERAGE    notional / NAV cap (default 10, ESMA retail max 30)
 *   FOREX_BOT_LIVE_CONFIRM    must be "true" for mode=live
 *   OANDA_API_TOKEN / OANDA_ACCOUNT_ID / OANDA_ENV (practice|live)
 */

import type { FxStrategyId } from "./types";

export type FxBotMode = "shadow" | "practice" | "live";

export const DEFAULT_FX_PAIRS = [
  "EUR_USD",
  "GBP_USD",
  "USD_JPY",
  "AUD_USD",
  "USD_CAD",
  "USD_CHF",
  "NZD_USD",
  "EUR_GBP",
  "EUR_JPY",
  "GBP_JPY",
  "EUR_CHF",
  "EUR_AUD",
  "EUR_CAD",
  "GBP_CHF",
  "GBP_AUD",
  "AUD_JPY",
  "AUD_NZD",
  "AUD_CAD",
  "CAD_JPY",
  "CHF_JPY",
  "NZD_JPY",
] as const;

export const ALL_FX_STRATEGIES: readonly FxStrategyId[] = [
  "FX_TREND_PULLBACK_M15",
  "FX_LONDON_BREAKOUT",
];

/** Typical retail spread in pips (used for backtest/shadow costs and as a spread ceiling). */
export const TYPICAL_SPREAD_PIPS: Record<string, number> = {
  EUR_USD: 1.0,
  GBP_USD: 1.4,
  USD_JPY: 1.2,
  AUD_USD: 1.3,
  USD_CAD: 1.8,
  USD_CHF: 1.6,
  EUR_GBP: 1.4,
  EUR_JPY: 1.9,
  NZD_USD: 1.6,
  GBP_JPY: 2.8,
  EUR_CHF: 1.9,
  EUR_AUD: 2.5,
  EUR_CAD: 2.6,
  GBP_CHF: 3.0,
  GBP_AUD: 3.5,
  AUD_JPY: 2.0,
  AUD_NZD: 2.6,
  AUD_CAD: 2.4,
  CAD_JPY: 2.4,
  CHF_JPY: 2.8,
  NZD_JPY: 2.6,
};

function num(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export function fxBotMode(): FxBotMode {
  const m = (process.env.FOREX_BOT_MODE ?? "shadow").trim().toLowerCase();
  if (m === "practice" || m === "live") return m;
  return "shadow";
}

export function fxRiskPct(): number {
  return Math.min(2, num(process.env.FOREX_BOT_RISK_PCT, 2));
}

/** Risk ceiling (% NAV) accepted only when the broker's minimum lot forces it (default 3, hard cap 5). */
export function fxMinLotMaxRiskPct(): number {
  return Math.min(5, num(process.env.FOREX_BOT_MIN_LOT_MAX_RISK_PCT, 3));
}

export function fxDailyLossPct(): number {
  return num(process.env.FOREX_BOT_DAILY_LOSS_PCT, 4);
}

export function fxMaxPositions(): number {
  return Math.floor(num(process.env.FOREX_BOT_MAX_POSITIONS, 2));
}

export function fxMaxLeverage(): number {
  return Math.min(30, num(process.env.FOREX_BOT_MAX_LEVERAGE, 10));
}

export function fxPairs(): string[] {
  const raw = (process.env.FOREX_BOT_PAIRS ?? "").trim();
  const list = raw ? raw.split(",") : [...DEFAULT_FX_PAIRS];
  return [...new Set(list.map((p) => p.trim().toUpperCase().replace("/", "_")).filter(Boolean))];
}

export function fxStrategies(): FxStrategyId[] {
  const raw = (process.env.FOREX_BOT_STRATEGIES ?? "").trim();
  if (!raw) return [...ALL_FX_STRATEGIES];
  const wanted = new Set(raw.split(",").map((s) => s.trim().toUpperCase()));
  return ALL_FX_STRATEGIES.filter((s) => wanted.has(s));
}

export function fxLiveConfirmed(): boolean {
  return (process.env.FOREX_BOT_LIVE_CONFIRM ?? "").trim().toLowerCase() === "true";
}

export function oandaConfigured(): boolean {
  return Boolean(process.env.OANDA_API_TOKEN?.trim() && process.env.OANDA_ACCOUNT_ID?.trim());
}

export function oandaEnv(): "practice" | "live" {
  return (process.env.OANDA_ENV ?? "practice").trim().toLowerCase() === "live" ? "live" : "practice";
}

/** Execution broker: FOREX_BOT_BROKER=mt5|oanda (default mt5 when the MT5 bridge is configured). */
export function fxBroker(): "mt5" | "oanda" {
  const b = (process.env.FOREX_BOT_BROKER ?? "").trim().toLowerCase();
  if (b === "mt5" || b === "oanda") return b;
  return (process.env.MT5_BRIDGE_KEY ?? "").trim() ? "mt5" : "oanda";
}

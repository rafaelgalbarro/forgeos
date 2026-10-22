/**
 * ForgeOS Forex bot — shared types (pure, no server-only).
 * Instruments use OANDA naming: EUR_USD, USD_JPY…
 */

export type FxCandle = {
  /** epoch seconds (bar open) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type FxSide = "long" | "short";

export type FxStrategyId = "FX_TREND_PULLBACK_M15" | "FX_LONDON_BREAKOUT";

export type FxSignal = {
  strategy: FxStrategyId;
  instrument: string;
  side: FxSide;
  entry: number;
  stop: number;
  takeProfit: number;
  /** distance entry→stop in price units */
  risk: number;
  reason: string;
  candleTime: number;
};

export type FxHold = { strategy: FxStrategyId; instrument: string; hold: string };

export type FxEvaluation = FxSignal | FxHold;

export function isFxSignal(e: FxEvaluation): e is FxSignal {
  return (e as FxSignal).side !== undefined;
}

export type FxTrade = {
  id: string;
  strategy: FxStrategyId;
  instrument: string;
  side: FxSide;
  units: number;
  entry: number;
  stop: number;
  takeProfit: number;
  openedAt: string;
  mode: "shadow" | "practice" | "live";
  brokerTradeId?: string | null;
  closedAt?: string | null;
  exit?: number | null;
  exitReason?: "TP" | "SL" | "WEEKEND" | "MANUAL" | "BROKER" | "TIME" | null;
  /** P&L in account currency (net of the spread assumed / actual) */
  pnl?: number | null;
  rMultiple?: number | null;
};

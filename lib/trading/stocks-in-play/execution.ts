import "server-only";

import { USA_EXECUTABLE_EQUITIES } from "@/lib/trading/usa-sectors";
import {
  getStocksInPlayMode,
  STOCKS_IN_PLAY_MAX_NOTIONAL_USD,
  STOCKS_IN_PLAY_MAX_OPEN_POSITIONS,
} from "@/lib/trading/stocks-in-play/config";
import { passesInPlayCostFilter } from "@/lib/trading/stocks-in-play/cost-gate";
import { stocksInPlayLiveGate } from "@/lib/trading/stocks-in-play/live-gate";
import { isStocksInPlayTicker } from "@/lib/trading/stocks-in-play/store";
import { isStocksRunnerTicker } from "@/lib/trading/stocks-in-play/runners/store";
import { readJournalTrades } from "@/lib/trading/journal/trades";
import { recordInPlayShadowSignal } from "@/lib/trading/stocks-in-play/shadow-journal";

const FIXED_SET = new Set(USA_EXECUTABLE_EQUITIES.map((s) => s.toUpperCase()));

export function capInPlayShares(params: {
  shares: number;
  price: number;
  fractional?: boolean;
}): { shares: number; fractional: false } {
  let qty = Math.max(0, Math.floor(params.shares));
  if (params.fractional) qty = Math.max(1, Math.floor(STOCKS_IN_PLAY_MAX_NOTIONAL_USD / params.price));
  while (qty > 0 && qty * params.price > STOCKS_IN_PLAY_MAX_NOTIONAL_USD) qty -= 1;
  if (qty === 0 && params.price <= STOCKS_IN_PLAY_MAX_NOTIONAL_USD) qty = 1;
  return { shares: qty, fractional: false };
}

function openInPlayDynamicPositions(): number {
  const open = new Set<string>();
  for (const t of readJournalTrades(4000)) {
    if (t.market !== "stocks" || t.shadow === true) continue;
    const sym = t.ticker.trim().toUpperCase();
    if (!isStocksInPlayTicker(sym) || FIXED_SET.has(sym)) continue;
    if (t.side === "BUY") open.add(sym);
    if (t.side === "SELL") open.delete(sym);
  }
  return open.size;
}

export type InPlayOrderDecision =
  | { action: "not_in_play" }
  | { action: "block"; reason: string }
  | { action: "shadow"; reason: string }
  | { action: "live_ok" };

export function decideInPlayOrder(params: {
  ticker: string;
  entry: number;
  target: number;
  stopLoss: number;
  shares: number;
  spreadPct?: number;
  strategy?: string;
}): InPlayOrderDecision {
  if (isStocksRunnerTicker(params.ticker)) return { action: "not_in_play" };
  if (!isStocksInPlayTicker(params.ticker)) return { action: "not_in_play" };
  if (!(params.stopLoss > 0 && params.stopLoss < params.entry)) {
    return { action: "block", reason: "in-play: bracket stop required" };
  }
  const cost = passesInPlayCostFilter({
    entry: params.entry,
    target: params.target,
    qty: Math.max(1, Math.floor(params.shares)),
    spreadPct: params.spreadPct,
  });
  if (!cost.ok) {
    return {
      action: "block",
      reason: `in-play: move ${cost.expectedMovePct.toFixed(2)}% < ${cost.requiredMovePct.toFixed(2)}% (3× cost)`,
    };
  }
  if (openInPlayDynamicPositions() >= STOCKS_IN_PLAY_MAX_OPEN_POSITIONS) {
    return { action: "block", reason: "in-play: max 1 open dynamic position" };
  }
  if (getStocksInPlayMode() !== "live") {
    return { action: "shadow", reason: "STOCKS_IN_PLAY_MODE=shadow" };
  }
  const gate = stocksInPlayLiveGate();
  if (!gate.ok) return { action: "shadow", reason: `live gate: ${gate.reason ?? "blocked"}` };
  return { action: "live_ok" };
}

export function emitInPlayShadow(params: {
  ticker: string;
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy?: string;
  reason: string;
}): void {
  recordInPlayShadowSignal({
    symbol: params.ticker.trim().toUpperCase(),
    entry: params.entry,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    strategy: params.strategy,
  });
  console.log(`[InPlay/shadow] ${params.ticker} @$${params.entry.toFixed(2)} — ${params.reason}`);
}

import { STOCKS_IN_PLAY_COST_MULT } from "@/lib/trading/stocks-in-play/config";

function estimateIbkrStockCommissionUsd(qty: number, price: number): number {
  const perShare = Math.max(1, qty) * 0.005;
  return Math.max(1, Math.min(perShare, Math.max(0, qty) * price * 0.01));
}

export function spreadPctFromBidAsk(bid: number, ask: number, mid?: number): number | undefined {
  const m = mid ?? (bid > 0 && ask >= bid ? (bid + ask) / 2 : 0);
  if (!(m > 0) || !(bid > 0) || !(ask > 0)) return undefined;
  return ((ask - bid) / m) * 100;
}

export function stocksInPlayRoundTripCostPct(params: {
  price: number;
  qty: number;
  spreadPct?: number;
}): number {
  const qty = Math.max(1, Math.floor(params.qty));
  const notional = params.price * qty;
  if (!(notional > 0)) return 1;
  const comm = estimateIbkrStockCommissionUsd(qty, params.price) * 2;
  const spread = ((params.spreadPct ?? 0.15) / 100) * notional;
  return (comm + spread) / notional;
}

export function passesInPlayCostFilter(params: {
  entry: number;
  target: number;
  qty: number;
  spreadPct?: number;
}): { ok: boolean; roundTripPct: number; requiredMovePct: number; expectedMovePct: number } {
  const { entry, target } = params;
  if (!(entry > 0 && target > entry)) {
    return { ok: false, roundTripPct: 1, requiredMovePct: 1, expectedMovePct: 0 };
  }
  const roundTripPct = stocksInPlayRoundTripCostPct({
    price: entry,
    qty: params.qty,
    spreadPct: params.spreadPct,
  });
  const expectedMovePct = ((target - entry) / entry) * 100;
  const requiredMovePct = roundTripPct * 100 * STOCKS_IN_PLAY_COST_MULT;
  return { ok: expectedMovePct >= requiredMovePct, roundTripPct, requiredMovePct, expectedMovePct };
}

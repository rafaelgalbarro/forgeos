/**
 * FOREX Telegram-supervised approval → IBKR IDEALPRO submit.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { getForexPair } from "@/lib/investment/forex/config";
import { getInvestmentRuntimeFlags } from "@/lib/investment/runtime-flags";
import { fetchLiveLimitPrice } from "@/lib/trading/ibkr-data";
import { OrderApprovalGate } from "@/src/core/trading/order-approval";
import type { PendingOrderRecord } from "@/src/core/trading/trading-state-store";
import type { ForexStrategySignal } from "@/lib/investment/forex/strategies/engine";

export const FOREX_ORDER_TYPE = "FOREX_LMT";

export function isForexPending(record: Pick<PendingOrderRecord, "orderType" | "ticker">): boolean {
  if (record.orderType === FOREX_ORDER_TYPE) return true;
  return getForexPair(record.ticker) != null;
}

export function enqueueForexApproval(params: {
  signal: ForexStrategySignal;
  units: number;
}): PendingOrderRecord {
  const notional = params.units * params.signal.entry;
  return OrderApprovalGate.getInstance().enqueue({
    ticker: params.signal.pairId,
    direction: params.signal.side,
    shares: params.units,
    orderType: FOREX_ORDER_TYPE,
    limitPrice: params.signal.entry,
    orderValueUSD: Number.isFinite(notional) ? notional : 0,
    price: params.signal.entry,
    stopLoss: params.signal.stopLoss,
    takeProfit: params.signal.takeProfit,
    reason: `FOREX ${params.signal.code} ${params.signal.name} · ${params.signal.display}`,
    signal: {
      confidence: params.signal.confidence,
      reasoning: params.signal.reasons.join("; ").slice(0, 400) || params.signal.name,
      urgency: "HIGH",
    },
  });
}

export async function executeApprovedForexOrder(
  record: PendingOrderRecord,
): Promise<{ orderId: string; staged: boolean }> {
  const pair = getForexPair(record.ticker);
  if (!pair) {
    throw new Error(`FOREX pair invalid: ${record.ticker}`);
  }
  const flags = getInvestmentRuntimeFlags();
  const transmit =
    flags.liveTradingEnabled && !flags.ibkrReadOnly && flags.forexEnabled;
  const limitPrice = await fetchLiveLimitPrice({
    symbol: pair.pairId,
    side: record.direction,
    asset: "FOREX",
    suggested: record.limitPrice ?? record.price,
  });
  const data = await ibkrServiceFetch<{
    ibkrOrderId?: number;
    staged?: boolean;
  }>("/api/forex/order", {
    method: "POST",
    body: JSON.stringify({
      pair_id: pair.pairId,
      side: record.direction,
      quantity: record.shares,
      limit_price: limitPrice,
      rationale: record.reason.slice(0, 4000),
      transmit,
    }),
  });
  const orderId = data.ibkrOrderId != null ? String(data.ibkrOrderId) : `FX_${Date.now()}`;
  return { orderId, staged: data.staged ?? !transmit };
}

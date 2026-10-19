import "server-only";

import {
  capInPlayShares,
  decideInPlayOrder,
  emitInPlayShadow,
} from "@/lib/trading/stocks-in-play/execution";
import { isStocksInPlayTicker } from "@/lib/trading/stocks-in-play/store";
import { spreadPctFromBidAsk } from "@/lib/trading/stocks-in-play/cost-gate";
import {
  decideRunnersOrder,
  estimateRunnerRoundTripCommissionUsd,
} from "@/lib/trading/stocks-in-play/runners/execution";
import { isStocksRunnerTicker } from "@/lib/trading/stocks-in-play/runners/store";
import { recordRunnerShadowSignal } from "@/lib/trading/stocks-in-play/runners/shadow-journal";

export type DynamicCategoryHold = {
  status: "HOLD";
  reason: string;
  stopLoss?: number;
  takeProfit?: number;
  reasoningSuffix: string;
};

export function applyInPlayShareCap(params: {
  ticker: string;
  kind: string;
  shares: number;
  price: number;
  fractional?: boolean;
}): { shares: number; fractional?: boolean } {
  if (params.kind !== "stocks" || !isStocksInPlayTicker(params.ticker)) {
    return { shares: params.shares, fractional: params.fractional };
  }
  const capped = capInPlayShares({
    shares: params.shares,
    price: params.price,
    fractional: params.fractional,
  });
  return { shares: capped.shares, fractional: capped.fractional };
}

export async function gateStocksDynamicCategories(params: {
  ticker: string;
  entry: number;
  effectiveStopLoss: number;
  effectiveTakeProfit: number;
  resolvedShares: number;
  bid: number;
  ask: number;
  primaryStrategy?: string;
}): Promise<DynamicCategoryHold | { liveOk: true } | null> {
  const spreadPct = spreadPctFromBidAsk(params.bid, params.ask, params.entry);

  if (isStocksRunnerTicker(params.ticker)) {
    const runners = decideRunnersOrder({
      ticker: params.ticker,
      entry: params.entry,
      stopLoss: params.effectiveStopLoss,
      spreadPct,
    });
    if (runners.action === "live_ok") return { liveOk: true };
    const commissionUsd = estimateRunnerRoundTripCommissionUsd(params.entry, spreadPct);
    recordRunnerShadowSignal({
      symbol: params.ticker.trim().toUpperCase(),
      entry: params.entry,
      stopLoss: params.effectiveStopLoss,
      takeProfit: params.effectiveTakeProfit,
      strategy: params.primaryStrategy,
      spreadPct,
      commissionUsd,
    });
    const { appendJournalTrade } = await import("@/lib/trading/journal/trades");
    appendJournalTrade({
      at: new Date().toISOString(),
      market: "stocks",
      strategy: params.primaryStrategy || "RUNNERS",
      ticker: params.ticker,
      side: "BUY",
      entry: params.entry,
      exit: null,
      exitReason: null,
      grossPnlUsd: null,
      costsUsd: commissionUsd,
      netPnlUsd: null,
      rMultiple: null,
      durationMs: null,
      shadow: true,
      open: true,
    });
    return {
      status: "HOLD",
      reason: `${params.ticker}: runners simulation — ${runners.reason}`,
      stopLoss: params.effectiveStopLoss,
      takeProfit: params.effectiveTakeProfit,
      reasoningSuffix: "[runners shadow]",
    };
  }

  if (!isStocksInPlayTicker(params.ticker)) return null;

  const inPlay = decideInPlayOrder({
    ticker: params.ticker,
    entry: params.entry,
    target: params.effectiveTakeProfit,
    stopLoss: params.effectiveStopLoss,
    shares: params.resolvedShares,
    spreadPct,
    strategy: params.primaryStrategy,
  });
  if (inPlay.action === "block") {
    return {
      status: "HOLD",
      reason: inPlay.reason,
      stopLoss: params.effectiveStopLoss,
      takeProfit: params.effectiveTakeProfit,
      reasoningSuffix: "[in-play block]",
    };
  }
  if (inPlay.action === "shadow") {
    emitInPlayShadow({
      ticker: params.ticker,
      entry: params.entry,
      stopLoss: params.effectiveStopLoss,
      takeProfit: params.effectiveTakeProfit,
      strategy: params.primaryStrategy,
      reason: inPlay.reason,
    });
    const { appendJournalTrade } = await import("@/lib/trading/journal/trades");
    appendJournalTrade({
      at: new Date().toISOString(),
      market: "stocks",
      strategy: params.primaryStrategy || "IN_PLAY",
      ticker: params.ticker,
      side: "BUY",
      entry: params.entry,
      exit: null,
      exitReason: null,
      grossPnlUsd: null,
      costsUsd: 0,
      netPnlUsd: null,
      rMultiple: null,
      durationMs: null,
      shadow: true,
      open: true,
    });
    return {
      status: "HOLD",
      reason: `${params.ticker}: in-play shadow — ${inPlay.reason}`,
      stopLoss: params.effectiveStopLoss,
      takeProfit: params.effectiveTakeProfit,
      reasoningSuffix: "[in-play shadow]",
    };
  }
  if (inPlay.action === "live_ok") return { liveOk: true };
  return null;
}

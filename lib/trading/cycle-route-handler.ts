/**
 * Shared handler for /api/trading/cycle/{stocks,crypto,forex}
 */

import "server-only";

import { NextResponse } from "next/server";
import {
  TradingEngine,
  type TradeCycleResult,
} from "@/src/core/trading/trading-engine";
import { expireStalePendingApprovals } from "@/lib/investment/order-approval-service";
import { publishInvestmentEvent } from "@/lib/notifications/investment-events";
import { notifyTypedCycleComplete } from "@/lib/notifications/telegram-bot";
import { startPositionMonitor } from "@/src/core/trading/position-monitor";

const engine = new TradingEngine();

export type TypedCycleKind = "stocks" | "crypto" | "forex";

export type TypedCycleConfig = {
  kind: TypedCycleKind;
  tickers: string[];
  minBuyConfidence?: number;
  analysisOnly?: boolean;
  windowOpen: boolean;
  windowLabel: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __lastStocksCycle: TradeCycleResult | undefined;
  // eslint-disable-next-line no-var
  var __lastCryptoCycle: TradeCycleResult | undefined;
  // eslint-disable-next-line no-var
  var __lastForexCycle: TradeCycleResult | undefined;
}

function storeLastCycle(kind: TypedCycleKind, result: TradeCycleResult): void {
  if (kind === "stocks") global.__lastStocksCycle = result;
  else if (kind === "crypto") global.__lastCryptoCycle = result;
  else if (kind === "forex") global.__lastForexCycle = result;
}

export async function runTypedTradingCycle(config: TypedCycleConfig): Promise<NextResponse> {
  startPositionMonitor();

  if (!config.windowOpen) {
    return NextResponse.json({
      skipped: true,
      reason: `outside ${config.windowLabel}`,
      cycleKind: config.kind,
    });
  }

  if (config.tickers.length === 0) {
    return NextResponse.json({
      skipped: true,
      reason: "empty universe",
      cycleKind: config.kind,
    });
  }

  try {
    await expireStalePendingApprovals();

    const result = await engine.runCycle(config.tickers, {
      cycleKind: config.kind,
      minBuyConfidence: config.minBuyConfidence ?? 0.65,
      analysisOnly: config.analysisOnly ?? false,
    });

    storeLastCycle(config.kind, result);

    publishInvestmentEvent({
      type: "cycle_complete",
      at: new Date().toISOString(),
      payload: { ...result, cycleKind: config.kind },
    });

    void notifyTypedCycleComplete({
      channel: config.kind,
      result,
      tickers: config.tickers,
    }).catch((err) =>
      console.warn(`[Cycle/${config.kind}] Telegram:`, err instanceof Error ? err.message : err),
    );

    const pending = result.orders.filter((o) => o.status === "PENDING_APPROVAL").length;
    console.log(
      `[Cycle/${config.kind}] ✅ ${result.orders.length} results, pending=${pending}`,
    );

    return NextResponse.json({ ...result, cycleKind: config.kind });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "cycle failed";
    if (msg.includes("cycle already running")) {
      return NextResponse.json({ skipped: true, reason: msg, cycleKind: config.kind }, { status: 409 });
    }
    console.error(`[Cycle/${config.kind}] Error:`, err);
    return NextResponse.json({ error: msg, cycleKind: config.kind }, { status: 500 });
  }
}

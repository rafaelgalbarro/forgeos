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
import {
  getCurrentTradingPhase,
  nextOpenLabel,
} from "@/lib/trading/cycle-schedule";
import { getExitManager } from "@/lib/trading/exit-manager";
import { pruneExpiredIbkrNonTradable } from "@/lib/trading/ibkr-non-tradable";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";

const engine = new TradingEngine();

/** Max 1 forex zero-bars alert per 2h. */
let lastForexZeroBarsAlertAt = 0;

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
  // Position monitor + exit manager touch IBKR — only for stocks
  if (config.kind === "stocks") {
    startPositionMonitor();
  }

  const phase = getCurrentTradingPhase();
  if (config.kind === "stocks" && phase === "CLOSED") {
    return NextResponse.json({
      orders: [],
      reason: "market_closed",
      nextOpen: nextOpenLabel("CLOSED"),
      cycleKind: config.kind,
      skipped: true,
    });
  }

  if (!config.windowOpen) {
    return NextResponse.json({
      skipped: true,
      reason: `outside ${config.windowLabel}`,
      cycleKind: config.kind,
      phase,
      nextOpen: nextOpenLabel(phase),
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
    await pruneExpiredIbkrNonTradable().catch(() => undefined);
    if (config.kind === "stocks") {
      await ibkrServiceFetch("/api/proposals/expire-stale-approved?maxAgeMin=10", {
        method: "POST",
        body: "{}",
      }).catch((err) =>
        console.warn(
          "[Cycle/stocks] expire-stale-approved:",
          err instanceof Error ? err.message : err,
        ),
      );
    }

    // Exit manager — SL / trailing TP at start of stocks + crypto cycles
    if (config.kind === "stocks" || config.kind === "crypto") {
      try {
        const summary = await getExitManager().runChannel(config.kind);
        if (summary.actions.length > 0) {
          console.log(
            `[ExitManager] ${config.kind}: ${summary.actions.length} salidas ` +
              summary.actions.map((e) => `${e.symbol}:${e.reason}`).join(", "),
          );
        }
      } catch (err) {
        console.warn(
          `[ExitManager] ${config.kind} check failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    const result = await engine.runCycle(config.tickers, {
      cycleKind: config.kind,
      minBuyConfidence: config.minBuyConfidence ?? 0.6,
      analysisOnly: config.analysisOnly ?? false,
    });

    // Soft skip when IBKR unavailable (stocks) — HTTP 200
    if (result.reason === "ibkr_unavailable") {
      console.warn(`[Cycle/${config.kind}] ibkr_unavailable — returning empty orders`);
      return NextResponse.json({
        orders: [],
        reason: "ibkr_unavailable",
        cycleKind: config.kind,
        phase,
        skipped: true,
      });
    }

    storeLastCycle(config.kind, result);

    let accountSnapshot = result.accountSnapshot ?? null;
    if (config.kind === "forex") {
      try {
        accountSnapshot = await fetchTradingAccountSnapshot();
      } catch {
        /* keep cycle result snapshot */
      }
      const total = result.orders.length;
      const zeroBars = result.orders.filter((o) => {
        const r = `${o.reason ?? ""} ${o.signal?.reasoning ?? ""}`;
        return (
          /0 barras|sin hist[oó]rico|no analizado|histórico.*insuficiente|EODHD insuficiente/i.test(
            r,
          ) || (o.signal?.analyzed === false && /barras|precio|hist/i.test(r))
        );
      }).length;
      if (total > 0 && zeroBars / total > 0.5) {
        const now = Date.now();
        if (now - lastForexZeroBarsAlertAt >= 2 * 60 * 60_000) {
          lastForexZeroBarsAlertAt = now;
          void sendTelegramMessage(
            `⚠️ <b>FOREX</b>: ${zeroBars}/${total} tickers sin barras / no analizado ` +
              `(usar EURUSD.FOREX etc.)`,
          ).catch(() => undefined);
        }
      }
    }

    publishInvestmentEvent({
      type: "cycle_complete",
      at: new Date().toISOString(),
      payload: { ...result, cycleKind: config.kind, phase },
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
      `[Cycle/${config.kind}] ✅ ${result.orders.length} results, pending=${pending} phase=${phase}`,
    );

    return NextResponse.json({
      ...result,
      cycleKind: config.kind,
      phase,
      accountSnapshot: accountSnapshot ?? result.accountSnapshot,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "cycle failed";
    if (msg.includes("cycle already running")) {
      return NextResponse.json({ skipped: true, reason: msg, cycleKind: config.kind }, { status: 409 });
    }
    // Stocks: IBKR snapshot failures → 200 soft skip (also covered by result.reason)
    if (
      config.kind === "stocks" &&
      /snapshot de cuenta|ibkr|unavailable|2fa|timeout|ECONNREFUSED/i.test(msg)
    ) {
      console.warn(`[Cycle/stocks] IBKR soft-fail: ${msg}`);
      return NextResponse.json({
        orders: [],
        reason: "ibkr_unavailable",
        cycleKind: config.kind,
        skipped: true,
      });
    }
    console.error(`[Cycle/${config.kind}] Error:`, err);
    return NextResponse.json({ error: msg, cycleKind: config.kind }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { scanForexStrategySignals } from "@/lib/investment/forex/signal-scanner";
import { getForexGoalProgress } from "@/lib/investment/forex/goals";
import {
  assessForexRisk,
} from "@/lib/investment/forex/risk-engine";
import { getForexPair, loadForexEnvConfig } from "@/lib/investment/forex/config";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import {
  consumeTelegramConfirmSlot,
  getForexDailyState,
  recordForexTradeEvent,
} from "@/lib/investment/forex/goals";
import {
  notifyForexDailyGoal,
  notifyForexOrderFilled,
  notifyForexSignal,
} from "@/lib/investment/forex/telegram";
import { getForexMacroSnapshot } from "@/lib/investment/forex/macro-calendar";
import { getForexSessionSnapshot } from "@/lib/investment/forex/config";
import { isStrategyWindowActive } from "@/lib/investment/forex/strategies/defs";
import type { ForexStrategySignal } from "@/lib/investment/forex/strategies/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — live strategy signals + goals + backtest badges */
export async function GET() {
  try {
    const scan = await scanForexStrategySignals();
    return NextResponse.json({ ...scan, mode: "ANALYSIS_ONLY" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FOREX signals failed",
        signals: [],
        goals: getForexGoalProgress(),
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}

type ExecuteBody = {
  signal?: ForexStrategySignal;
  transmit?: boolean;
  confirmed?: boolean;
};

/** POST — execute / stage a signal via IBKR FOREX order */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExecuteBody;
    const signal = body.signal;
    if (!signal?.pairId || !signal.side || !signal.entry) {
      return NextResponse.json({ error: "signal required" }, { status: 400 });
    }
    const pair = getForexPair(signal.pairId);
    if (!pair) return NextResponse.json({ error: "pair invalid" }, { status: 400 });

    const config = loadForexEnvConfig();
    const session = getForexSessionSnapshot();
    const macro = await getForexMacroSnapshot();
    const weekend = session.label.toLowerCase().includes("fin de semana");
    const strategyWindow = isStrategyWindowActive(signal.style, session.madridMinutes, weekend);

    let openPairCount = 0;
    try {
      const pos = await ibkrServiceFetch<{ positions?: unknown[] }>("/api/forex/positions");
      openPairCount = pos.positions?.length ?? 0;
    } catch {
      openPairCount = 0;
    }

    let nav = 100_000;
    try {
      const acct = await fetchTradingAccountSnapshot();
      if (acct && Number.isFinite(acct.navUSD) && acct.navUSD > 0) nav = acct.navUSD;
    } catch {
      /* default */
    }

    const risk = assessForexRisk({
      signal,
      pair,
      nav,
      openPairCount,
      blackoutActive: macro.blackoutActive,
      tradingWindowActive: session.tradingWindowActive,
      strategyWindowActive: strategyWindow,
    });
    if (!risk.allowed || !risk.units) {
      return NextResponse.json({ ok: false, error: risk.reason ?? "risk blocked" }, { status: 423 });
    }

    const daily = getForexDailyState();
    const needsConfirm = daily.telegramConfirmRemaining > 0;
    if (needsConfirm && !body.confirmed) {
      await notifyForexSignal({
        signal,
        units: risk.units,
        requireConfirm: true,
      });
      return NextResponse.json({
        ok: false,
        needsTelegramConfirm: true,
        telegramConfirmRemaining: daily.telegramConfirmRemaining,
        message: "Confirma en UI (confirmed=true) — primeras 5 ops requieren confirmación",
        units: risk.units,
      });
    }

    if (needsConfirm && body.confirmed) {
      consumeTelegramConfirmSlot();
    }

    const transmit = Boolean(body.transmit) && config.enabled;
    const orderBody = {
      pair_id: signal.pairId,
      side: signal.side,
      quantity: risk.units,
      limit_price: signal.entry,
      rationale: `FX ${signal.code} ${signal.name} conf=${signal.confidence.toFixed(2)}`,
      transmit,
    };

    const data = await ibkrServiceFetch<{
      ibkrOrderId?: number;
      staged?: boolean;
      ok?: boolean;
    }>("/api/forex/order", {
      method: "POST",
      body: JSON.stringify(orderBody),
    });

    recordForexTradeEvent({ style: signal.style, pipsDelta: 0, opened: true });
    const goals = getForexGoalProgress();
    if (goals.scalp.pct >= 100) await notifyForexDailyGoal("scalp");
    if (goals.intraday.pct >= 100) await notifyForexDailyGoal("intraday");
    if (goals.stoppedOut) await notifyForexDailyGoal("stop");

    await notifyForexOrderFilled({
      pairId: signal.pairId,
      side: signal.side,
      price: signal.entry,
      orderId: data.ibkrOrderId,
      staged: data.staged ?? !transmit,
    });

    return NextResponse.json({
      ok: true,
      staged: data.staged ?? !transmit,
      transmit,
      orderId: data.ibkrOrderId,
      units: risk.units,
      riskPct: risk.riskPct,
      goals: getForexGoalProgress(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "execute failed" },
      { status: 500 },
    );
  }
}

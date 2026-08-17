import { NextRequest, NextResponse } from "next/server";
import { scanForexStrategySignals } from "@/lib/investment/forex/signal-scanner";
import { getForexGoalProgress } from "@/lib/investment/forex/goals";
import { assessForexRisk } from "@/lib/investment/forex/risk-engine";
import { getForexPair, getForexSessionSnapshot } from "@/lib/investment/forex/config";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { enqueueForexApproval } from "@/lib/investment/forex/approval";
import { notifyForexSignal } from "@/lib/investment/forex/telegram";
import { getForexMacroSnapshot } from "@/lib/investment/forex/macro-calendar";
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

/** POST — queue FOREX signal for Telegram approve/reject (does not place until callback). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExecuteBody;
    const signal = body.signal;
    if (!signal?.pairId || !signal.side || !signal.entry) {
      return NextResponse.json({ error: "signal required" }, { status: 400 });
    }
    const pair = getForexPair(signal.pairId);
    if (!pair) return NextResponse.json({ error: "pair invalid" }, { status: 400 });

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

    let nav = 0;
    let cash = 0;
    try {
      const acct = await fetchTradingAccountSnapshot();
      nav = Number.isFinite(acct.navUSD) ? acct.navUSD : 0;
      cash = Number.isFinite(acct.tradingCashUSD) ? acct.tradingCashUSD : acct.cashUSD;
    } catch {
      /* no invented cash/NAV */
    }

    const risk = assessForexRisk({
      signal,
      pair,
      nav,
      cash,
      openPairCount,
      blackoutActive: macro.blackoutActive,
      tradingWindowActive: session.tradingWindowActive,
      strategyWindowActive: strategyWindow,
    });
    if (!risk.allowed || !risk.units) {
      return NextResponse.json({ ok: false, error: risk.reason ?? "risk blocked" }, { status: 423 });
    }

    const pending = enqueueForexApproval({ signal, units: risk.units });
    await notifyForexSignal({
      signal,
      units: risk.units,
      requireConfirm: true,
      approvalId: pending.approvalId,
    });

    return NextResponse.json({
      ok: true,
      pending: true,
      needsTelegramConfirm: true,
      approvalId: pending.approvalId,
      units: risk.units,
      riskPct: risk.riskPct,
      message: "Señal enviada a Telegram — pulsa APROBAR o RECHAZAR",
      goals: getForexGoalProgress(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "execute failed" },
      { status: 500 },
    );
  }
}

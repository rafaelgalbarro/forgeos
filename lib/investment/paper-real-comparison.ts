import "server-only";

import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
} from "@/src/core/investment/paper-trading";
import { fetchTradingAccountSnapshot } from "@/lib/trading/ibkr-data";
import { IbkrServiceUnavailableError } from "@/lib/ibkr/service-client";

export type PaperRealComparisonSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly paper: {
    readonly label: "PAPER";
    readonly state: "READY" | "NO_DATA";
    readonly startingEquity: number | null;
    readonly endingEquity: number | null;
    readonly totalPnl: number | null;
    readonly tradeCount: number;
    readonly openPositionCount: number;
  };
  readonly real: {
    readonly label: "REAL_READ_ONLY";
    readonly state: "READY" | "NO_DATA";
    readonly navUSD: number | null;
    readonly cashUSD: number | null;
    readonly dailyPnlUSD: number | null;
    readonly openPositionsCount: number | null;
    readonly note: string;
  };
  readonly deltas: {
    readonly equityDelta: number | null;
    readonly pnlDelta: number | null;
    readonly positionCountDelta: number | null;
    readonly note: string;
  };
  readonly note: string;
};

/**
 * Side-by-side PAPER ledger vs IBKR live read-only snapshot.
 * Simultaneous modes: paper store + IBKR when both exist; missing side → NO_DATA.
 * Never invents balances or places orders.
 */
export async function getPaperRealComparison(): Promise<PaperRealComparisonSnapshot> {
  let paperStarting: number | null = null;
  let paperEnding: number | null = null;
  let paperPnl: number | null = null;
  let paperTrades = 0;
  let paperOpenPositions = 0;
  let paperState: "READY" | "NO_DATA" = "NO_DATA";

  try {
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: createPaperTradingConfigFromEnv(),
    });
    const dash = await orchestrator.getDashboardModel();
    paperStarting = dash.performance?.startingEquity ?? null;
    paperEnding = dash.performance?.endingEquity ?? null;
    paperPnl = dash.performance?.totalPnl ?? null;
    paperTrades = dash.recentTrades?.length ?? 0;
    paperOpenPositions = dash.positions?.filter((p) => Math.abs(Number(p.quantity ?? 0)) > 0).length ?? 0;
    if (
      paperStarting != null ||
      paperEnding != null ||
      paperTrades > 0 ||
      paperOpenPositions > 0
    ) {
      paperState = "READY";
    }
  } catch {
    /* keep NO_DATA */
  }

  let realNav: number | null = null;
  let realCash: number | null = null;
  let realDailyPnl: number | null = null;
  let realPositions: number | null = null;
  let realState: "READY" | "NO_DATA" = "NO_DATA";
  let realNote = "NO_DATA — IBKR snapshot unavailable";

  try {
    const snap = await fetchTradingAccountSnapshot();
    realNav = Number.isFinite(snap.navUSD) && snap.navUSD !== 0 ? snap.navUSD : snap.navUSD;
    // Treat all-zero disconnected aggregates cautiously: still surface numbers if finite.
    if (Number.isFinite(snap.navUSD) || Number.isFinite(snap.cashUSD)) {
      realNav = Number.isFinite(snap.navUSD) ? snap.navUSD : null;
      realCash = Number.isFinite(snap.cashUSD) ? snap.cashUSD : null;
      realDailyPnl = Number.isFinite(snap.dailyPnlUSD) ? snap.dailyPnlUSD : null;
      realPositions = snap.openPositionsCount;
      realState =
        realNav != null || realCash != null || (realPositions != null && realPositions > 0)
          ? "READY"
          : "NO_DATA";
      realNote =
        realState === "READY"
          ? "IBKR read-only aggregate (may sum multiple accounts)"
          : "IBKR connected payload empty — NO_DATA";
    }
  } catch (err) {
    realNote =
      err instanceof IbkrServiceUnavailableError
        ? err.message
        : err instanceof Error
          ? err.message
          : "IBKR unavailable";
  }

  const equityDelta =
    paperEnding != null && realNav != null && Number.isFinite(paperEnding) && Number.isFinite(realNav)
      ? paperEnding - realNav
      : null;
  const pnlDelta =
    paperPnl != null && realDailyPnl != null && Number.isFinite(paperPnl) && Number.isFinite(realDailyPnl)
      ? paperPnl - realDailyPnl
      : null;
  const positionCountDelta =
    paperState === "READY" && realPositions != null
      ? paperOpenPositions - realPositions
      : null;

  const both = paperState === "READY" && realState === "READY";

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    paper: {
      label: "PAPER",
      state: paperState,
      startingEquity: paperStarting,
      endingEquity: paperEnding,
      totalPnl: paperPnl,
      tradeCount: paperTrades,
      openPositionCount: paperOpenPositions,
    },
    real: {
      label: "REAL_READ_ONLY",
      state: realState,
      navUSD: realNav,
      cashUSD: realCash,
      dailyPnlUSD: realDailyPnl,
      openPositionsCount: realPositions,
      note: realNote,
    },
    deltas: {
      equityDelta,
      pnlDelta,
      positionCountDelta,
      note: both
        ? "Paper equity − real NAV; paper totalPnl − real dailyPnl (different bases — compare with care)"
        : "NO_DATA — need both PAPER and REAL sides for deltas",
    },
    note: both
      ? "Paper ledger vs IBKR read-only — simultaneous comparison; zero live orders from this panel"
      : paperState === "READY"
        ? "PAPER ready; REAL side NO_DATA"
        : realState === "READY"
          ? "REAL ready; PAPER side NO_DATA"
          : "NO_DATA — neither paper ledger nor IBKR snapshot available",
  };
}

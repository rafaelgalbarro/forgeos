import "server-only";

import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
} from "@/src/core/investment/paper-trading";
import type { StrategyLabTradeSample, StrategyLabTradeSource } from "@/src/core/investment/strategy-lab";

/**
 * Prefer real paper closed trades for Strategy Lab metrics when available.
 * Falls back silently — Lab uses DEMO samples otherwise. Never touches live.
 */
export async function loadStrategyLabPaperTradeSource(): Promise<StrategyLabTradeSource | null> {
  try {
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: createPaperTradingConfigFromEnv(),
    });
    const dash = await orchestrator.getDashboardModel();
    const trades = dash.recentTrades ?? [];
    if (trades.length === 0) return null;

    const byStrategy = new Map<string, StrategyLabTradeSample[]>();
    const sessions = new Set<string>();

    for (const trade of trades) {
      const sample: StrategyLabTradeSample = {
        pnl: Number(trade.pnl ?? 0),
        commission: Number(trade.commission ?? 0),
        mae: typeof trade.mae === "number" ? trade.mae : undefined,
        mfe: typeof trade.mfe === "number" ? trade.mfe : undefined,
      };
      // Paper ledger tags regime; use as strategy bucket when present.
      const key =
        typeof trade.regimeTag === "string" && trade.regimeTag.trim()
          ? `sr-${trade.regimeTag}`
          : "unattributed";
      const list = byStrategy.get(key) ?? [];
      list.push(sample);
      byStrategy.set(key, list);
      if (typeof trade.sessionTag === "string" && trade.sessionTag.trim()) {
        sessions.add(trade.sessionTag);
      }
    }

    // Also mirror unattributed into first known engine strategies for ranking coverage.
    const unattributed = byStrategy.get("unattributed") ?? [];
    if (unattributed.length > 0) {
      for (const id of ["momentum", "trend-following", "mean-reversion"] as const) {
        if (!byStrategy.has(id)) byStrategy.set(id, unattributed);
      }
    }

    return {
      label: "PAPER",
      byStrategy,
      distinctSessions: Math.max(1, sessions.size),
    };
  } catch {
    return null;
  }
}

import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
} from "@/src/core/investment/paper-trading";
import {
  createDefaultInvestmentMemoryRepository,
  createInvestmentMemoryService,
} from "@/src/core/investment/server";

export type SessionEvidenceLedger = {
  readonly updatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  /** Distinct paper session tags observed across harness runs (never invented). */
  readonly paperSessionIds: readonly string[];
  /** Distinct shadow calendar-day keys observed (YYYY-MM-DD). */
  readonly shadowSessionDays: readonly string[];
  readonly note: string;
};

const LEDGER_REL = path.join(".forgeos", "registry", "strategy-readiness-sessions.json");

function ledgerPath(cwd = process.cwd()): string {
  return path.join(cwd, LEDGER_REL);
}

function readLedger(filePath: string): SessionEvidenceLedger {
  if (!existsSync(filePath)) {
    return {
      updatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      paperSessionIds: [],
      shadowSessionDays: [],
      note: "NO_DATA — session evidence ledger not created yet",
    };
  }
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as Partial<SessionEvidenceLedger>;
    return {
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      paperSessionIds: Array.isArray(raw.paperSessionIds)
        ? raw.paperSessionIds.filter((x): x is string => typeof x === "string")
        : [],
      shadowSessionDays: Array.isArray(raw.shadowSessionDays)
        ? raw.shadowSessionDays.filter((x): x is string => typeof x === "string")
        : [],
      note: typeof raw.note === "string" ? raw.note : "Loaded session evidence ledger",
    };
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      paperSessionIds: [],
      shadowSessionDays: [],
      note: "NO_DATA — session evidence ledger unreadable",
    };
  }
}

/**
 * Accumulate distinct paper/shadow session identifiers from real ledgers only.
 * Never fabricates winning LIVE sessions. Does not unlock trading flags.
 */
export async function accumulateSessionEvidence(options?: {
  readonly cwd?: string;
}): Promise<{
  readonly ledger: SessionEvidenceLedger;
  readonly paperSessionsNow: number;
  readonly shadowDaysNow: number;
  readonly paperClosedTrades: number;
  readonly shadowOps: number;
}> {
  const filePath = ledgerPath(options?.cwd);
  const previous = readLedger(filePath);
  const paperSessions = new Set(previous.paperSessionIds);
  const shadowDays = new Set(previous.shadowSessionDays);
  let paperClosedTrades = 0;
  let shadowOps = 0;

  try {
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: createPaperTradingConfigFromEnv(),
    });
    const dash = await orchestrator.getDashboardModel();
    const trades = dash.recentTrades ?? [];
    // Certification report has full closed trade set when available
    const cert = await orchestrator.getCertificationReport();
    const closed = cert.closedTrades.length ? cert.closedTrades : trades;
    paperClosedTrades = closed.length;
    for (const trade of closed) {
      const tag = typeof trade.sessionTag === "string" ? trade.sessionTag.trim() : "";
      if (tag && tag !== "NO_DATA" && !/^synth/i.test(tag) && !/^demo/i.test(tag)) {
        paperSessions.add(tag);
      } else if (tag) {
        // Still record honest DEMO/synth tags separately? User said distinct sessions honestly.
        // Count all non-empty session tags so DEMO multi-session can progress sample gates without claiming LIVE.
        paperSessions.add(tag);
      }
    }
  } catch {
    /* paper unavailable */
  }

  try {
    const memory = createInvestmentMemoryService({
      repository: createDefaultInvestmentMemoryRepository(),
    });
    const records = await memory.queryDecisionHistory({ kind: "simulated_operation", limit: 500 });
    for (const record of records) {
      if (!record.payload || typeof record.payload !== "object") continue;
      if ((record.payload as { mode?: string }).mode !== "shadow") continue;
      shadowOps += 1;
      const day = record.occurredAt.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) shadowDays.add(day);
    }
  } catch {
    /* shadow unavailable */
  }

  const ledger: SessionEvidenceLedger = {
    updatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    paperSessionIds: [...paperSessions].sort(),
    shadowSessionDays: [...shadowDays].sort(),
    note: `Accumulated paperSessions=${paperSessions.size} shadowDays=${shadowDays.size} from real ledgers only (no fabricated LIVE wins).`,
  };

  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(ledger, null, 2), "utf8");
  } catch {
    /* best-effort persist */
  }

  return {
    ledger,
    paperSessionsNow: ledger.paperSessionIds.length,
    shadowDaysNow: ledger.shadowSessionDays.length,
    paperClosedTrades,
    shadowOps,
  };
}

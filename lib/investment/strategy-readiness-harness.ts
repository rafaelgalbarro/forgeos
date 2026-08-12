import "server-only";

import { createPaperBrokerEngine } from "@/lib/broker-engine/paper-broker-engine";
import {
  createDefaultPaperTradingOrchestrator,
  createPaperTradingConfigFromEnv,
} from "@/src/core/investment/paper-trading";
import { accumulateSessionEvidence } from "@/lib/investment/session-evidence-ledger";

export type SampleGateStatus = "PASS" | "FAIL" | "NOT_READY" | "NO_DATA";

export type SampleGate = {
  readonly id: string;
  readonly name: string;
  readonly required: string | number | boolean;
  readonly actual: string | number | boolean;
  readonly status: SampleGateStatus;
  readonly evidence: string;
};

export type StrategyReadinessHarnessSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly autonomousLive: "LOCKED";
  /** Honest go-live decision — never unlocked by this harness. */
  readonly goLiveDecision: "NOT_READY_FOR_LIVE" | "READY_FOR_SUPERVISED_CONSIDERATION";
  readonly paper: {
    readonly status: SampleGateStatus;
    readonly closedTrades: number;
    readonly distinctSessions: number;
    readonly certified: boolean | null;
    readonly note: string;
  };
  readonly shadow: {
    readonly status: SampleGateStatus;
    readonly operationCount: number;
    readonly distinctDays: number;
    readonly note: string;
  };
  readonly sampleGates: readonly SampleGate[];
  readonly overallSample: SampleGateStatus;
  readonly unlockEligible: false;
  readonly note: string;
};

const MIN_PAPER_TRADES_SAMPLE = 30;
const MIN_SHADOW_OPS_SAMPLE = 10;
const MIN_PAPER_SESSIONS = 3;
const MIN_SHADOW_DAYS = 3;

/**
 * Honest paper/shadow sample-gate harness.
 * Never unlocks LIVE, never fabricates wins or LIVE sessions — NO_DATA / NOT_READY when insufficient.
 */
export async function evaluateStrategyReadinessHarness(): Promise<StrategyReadinessHarnessSnapshot> {
  const sessions = await accumulateSessionEvidence();
  let closedTrades = sessions.paperClosedTrades;
  let certified: boolean | null = null;
  let paperNote = "NO_DATA — paper ledger unavailable";
  let paperGateDetails = "";

  try {
    const orchestrator = createDefaultPaperTradingOrchestrator({
      brokerEngine: createPaperBrokerEngine(),
      config: createPaperTradingConfigFromEnv(),
    });
    const cert = await orchestrator.getCertificationReport();
    closedTrades = cert.closedTrades.length || closedTrades;
    certified = cert.certified;
    paperGateDetails = [
      `minTrades=${cert.gates.minimumClosedTrades.actual}/${cert.gates.minimumClosedTrades.required}`,
      `days=${cert.gates.minimumEvaluationDays.actual}/${cert.gates.minimumEvaluationDays.required}`,
      `sessions=${cert.gates.multipleSessions.actual}/${cert.gates.multipleSessions.required}`,
      `regimes=${cert.gates.multipleRegimes.actual}/${cert.gates.multipleRegimes.required}`,
    ].join("; ");
    paperNote = certified
      ? `Paper institutional gates passed on simulated ledger (${paperGateDetails}). Still NOT_READY_FOR_LIVE.`
      : `Paper institutional gates incomplete (${paperGateDetails}). NOT_READY — not fabricated.`;
  } catch (error) {
    paperNote =
      error instanceof Error
        ? `NO_DATA — paper certification unavailable: ${error.message}`
        : "NO_DATA — paper certification unavailable";
  }

  const operationCount = sessions.shadowOps;
  const distinctSessions = sessions.paperSessionsNow;
  const distinctDays = sessions.shadowDaysNow;
  const shadowNote =
    operationCount === 0
      ? "NO_DATA — no shadow operations recorded"
      : `Shadow memory has ${operationCount} op(s) across ${distinctDays} calendar day(s) (hypothetical only).`;

  const sampleGates: SampleGate[] = [
    {
      id: "SR-PAPER-SAMPLES",
      name: `Paper closed trades sample (≥${MIN_PAPER_TRADES_SAMPLE})`,
      required: MIN_PAPER_TRADES_SAMPLE,
      actual: closedTrades,
      status:
        closedTrades === 0
          ? "NO_DATA"
          : closedTrades >= MIN_PAPER_TRADES_SAMPLE
            ? "PASS"
            : "NOT_READY",
      evidence: `closedTrades=${closedTrades}; paperNote=${paperNote}`,
    },
    {
      id: "SR-PAPER-SESSIONS",
      name: `Distinct paper sessions (≥${MIN_PAPER_SESSIONS})`,
      required: MIN_PAPER_SESSIONS,
      actual: distinctSessions,
      status:
        distinctSessions === 0
          ? "NO_DATA"
          : distinctSessions >= MIN_PAPER_SESSIONS
            ? "PASS"
            : "NOT_READY",
      evidence: `paperSessionIds=${sessions.ledger.paperSessionIds.slice(0, 12).join(",") || "none"}; ${sessions.ledger.note}`,
    },
    {
      id: "SR-PAPER-INSTITUTIONAL",
      name: "Paper institutional certification gates",
      required: true,
      actual: certified === true,
      status: certified == null ? "NO_DATA" : certified ? "PASS" : "NOT_READY",
      evidence: paperGateDetails || paperNote,
    },
    {
      id: "SR-SHADOW-SAMPLES",
      name: `Shadow simulated ops sample (≥${MIN_SHADOW_OPS_SAMPLE})`,
      required: MIN_SHADOW_OPS_SAMPLE,
      actual: operationCount,
      status:
        operationCount === 0
          ? "NO_DATA"
          : operationCount >= MIN_SHADOW_OPS_SAMPLE
            ? "PASS"
            : "NOT_READY",
      evidence: shadowNote,
    },
    {
      id: "SR-SHADOW-DAYS",
      name: `Distinct shadow session days (≥${MIN_SHADOW_DAYS})`,
      required: MIN_SHADOW_DAYS,
      actual: distinctDays,
      status:
        distinctDays === 0
          ? "NO_DATA"
          : distinctDays >= MIN_SHADOW_DAYS
            ? "PASS"
            : "NOT_READY",
      evidence: `shadowSessionDays=${sessions.ledger.shadowSessionDays.slice(0, 12).join(",") || "none"}`,
    },
    {
      id: "SR-NO-LIVE-UNLOCK",
      name: "Live unlock remains locked",
      required: "LOCKED",
      actual: "LOCKED",
      status: "PASS",
      evidence:
        "Harness never flips LIVE_TRADING_ENABLED / AUTONOMOUS_LIVE; unlockEligible=false; goLiveDecision stays NOT_READY_FOR_LIVE until human certification path exists",
    },
  ];

  const paperStatus = sampleGates.find((g) => g.id === "SR-PAPER-SAMPLES")!.status;
  const shadowStatus = sampleGates.find((g) => g.id === "SR-SHADOW-SAMPLES")!.status;

  const rank: Record<SampleGateStatus, number> = {
    FAIL: 3,
    NOT_READY: 2,
    NO_DATA: 1,
    PASS: 0,
  };
  let overallSample: SampleGateStatus = "PASS";
  for (const g of sampleGates) {
    if (rank[g.status] > rank[overallSample]) overallSample = g.status;
  }

  // Even if all sample gates PASS, this surface never auto-unlocks live trading.
  const goLiveDecision = "NOT_READY_FOR_LIVE" as const;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    autonomousLive: "LOCKED",
    goLiveDecision,
    paper: {
      status: paperStatus,
      closedTrades,
      distinctSessions,
      certified,
      note: paperNote,
    },
    shadow: {
      status: shadowStatus,
      operationCount,
      distinctDays,
      note: shadowNote,
    },
    sampleGates,
    overallSample,
    unlockEligible: false,
    note: `Strategy readiness sample harness · overall=${overallSample} · sessions paper=${distinctSessions} shadowDays=${distinctDays} · goLiveDecision=${goLiveDecision} · unlockEligible=false · zero real orders.`,
  };
}

/** Map harness paper/shadow status into LIVE readiness traffic lights (never unlocks). */
export function harnessStatusToReadiness(
  status: SampleGateStatus,
): "OK" | "WARN" | "NO_DATA" {
  if (status === "PASS") return "OK";
  if (status === "FAIL" || status === "NOT_READY") return "WARN";
  return "NO_DATA";
}

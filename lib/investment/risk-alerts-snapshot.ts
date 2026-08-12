import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { getPortfolioMonitorRuntime } from "@/lib/investment/portfolio-monitor-runtime";
import type { PortfolioMonitorAlert } from "@/src/core/investment/portfolio-monitor";
import type { PortfolioMonitorDataLabel } from "@/lib/investment/portfolio-monitor-provider-factory";

export type RiskBreachAlert = {
  readonly id: string;
  readonly source: "PORTFOLIO_MONITOR_DEMO" | "PORTFOLIO_MONITOR_IBKR" | "LIVE_RISK_AUDIT";
  readonly code: string;
  readonly severity: string;
  readonly title: string;
  readonly message: string;
  readonly value: number | string | null;
  readonly threshold: number | string | null;
  readonly detectedAt: string;
  readonly symbols: readonly string[];
  readonly dryRun: true;
};

export type RiskAlertsSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly monitorLabel: PortfolioMonitorDataLabel;
  readonly monitorNote: string;
  readonly monitorRunning: boolean;
  readonly evaluationCount: number;
  readonly alerts: readonly RiskBreachAlert[];
  readonly note: string;
};

function mapMonitorAlert(
  alert: PortfolioMonitorAlert,
  label: PortfolioMonitorDataLabel,
): RiskBreachAlert {
  return {
    id: alert.id,
    source: label === "IBKR_LIVE_READ_ONLY" ? "PORTFOLIO_MONITOR_IBKR" : "PORTFOLIO_MONITOR_DEMO",
    code: alert.code,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    value: alert.value,
    threshold: alert.threshold,
    detectedAt: alert.detectedAt,
    symbols: alert.symbols,
    dryRun: true,
  };
}

type AuditCheck = {
  readonly code?: string;
  readonly status?: string;
  readonly passed?: boolean;
  readonly severity?: string;
  readonly value?: number | string;
  readonly threshold?: number | string;
  readonly explanation?: string;
  readonly remediation?: string;
};

async function readLiveRiskAuditBreaches(limit: number): Promise<RiskBreachAlert[]> {
  const filePath = path.join(process.cwd(), ".forgeos", "live-risk-audit.json");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as {
      records?: Record<
        string,
        {
          timestampUtc?: string;
          result?: { decision?: string; checks?: AuditCheck[]; requestId?: string };
        }
      >;
    };
    const out: RiskBreachAlert[] = [];
    for (const [key, record] of Object.entries(parsed.records ?? {})) {
      const checks = record.result?.checks ?? [];
      for (const check of checks) {
        const failed = check.passed === false || check.status === "FAIL";
        if (!failed) continue;
        out.push({
          id: `audit:${key}:${check.code ?? out.length}`,
          source: "LIVE_RISK_AUDIT",
          code: String(check.code ?? "UNKNOWN"),
          severity: String(check.severity ?? "BLOCK"),
          title: `${check.code ?? "check"} FAIL`,
          message: check.explanation ?? check.remediation ?? "Limit check failed (dry-run audit)",
          value: check.value ?? null,
          threshold: check.threshold ?? null,
          detectedAt: record.timestampUtc ?? "NO_DATA",
          symbols: [],
          dryRun: true,
        });
        if (out.length >= limit) return out;
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Read-only / dry-run risk breach alerts.
 * Monitor label is DEMO (synthetic) or IBKR_LIVE_READ_ONLY when API key present.
 * Live-risk audit FAIL checks are historical dry-run records (no order path).
 */
export async function getRiskAlertsSnapshot(): Promise<RiskAlertsSnapshot> {
  let monitorAlerts: RiskBreachAlert[] = [];
  let monitorRunning = false;
  let evaluationCount = 0;
  let monitorLabel: PortfolioMonitorDataLabel = "DEMO";
  let monitorNote = "NO_DATA";

  try {
    const runtime = getPortfolioMonitorRuntime();
    monitorLabel = runtime.label;
    monitorNote = runtime.note;
    if (!runtime.monitor.isRunning()) {
      runtime.monitor.start();
    }
    const snap = await runtime.monitor.evaluateNow();
    monitorRunning = snap.monitorRunning;
    evaluationCount = snap.evaluationCount;
    monitorAlerts = snap.alerts.map((a) => mapMonitorAlert(a, runtime.label));
  } catch (error) {
    monitorAlerts = [];
    monitorNote =
      error instanceof Error
        ? `Monitor unavailable (${error.message}) — DEMO fallback may apply on next boot`
        : "Monitor unavailable";
  }

  const auditBreaches = await readLiveRiskAuditBreaches(40);
  const alerts = [...monitorAlerts, ...auditBreaches].slice(0, 80);

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    monitorLabel,
    monitorNote,
    monitorRunning,
    evaluationCount,
    alerts,
    note: alerts.length
      ? `Dry-run / read-only alerts — monitor=${monitorLabel}. No order submission.`
      : `NO_DATA — no monitor alerts or audit FAIL checks (monitor=${monitorLabel})`,
  };
}

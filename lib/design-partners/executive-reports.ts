import type { ExecutiveReport } from "./types";
import { readStorage, writeStorage } from "./storage";
import { getSuccessDashboardData } from "./success-dashboard";
import { getFeedbackInboxCount } from "./feedback-center";
import { getIssueCount } from "./issue-reporting";
import { getAiUsageSummary } from "./ai-usage-metrics";
import { getPendingInviteCount } from "./invitation-system";
import { trackDesignPartnerEvent } from "./analytics";

const REPORTS_KEY = "forgeos-dp-executive-reports";

let memoryReports: ExecutiveReport[] = [];

function read(): ExecutiveReport[] {
  if (typeof window === "undefined") return memoryReports;
  const stored = readStorage<ExecutiveReport[]>(REPORTS_KEY, []);
  memoryReports = stored;
  return memoryReports;
}

function write(reports: ExecutiveReport[]): void {
  memoryReports = reports;
  writeStorage(REPORTS_KEY, reports);
}

export function listExecutiveReports(): ExecutiveReport[] {
  return read().sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export function getLatestExecutiveReport(): ExecutiveReport | null {
  const reports = listExecutiveReports();
  return reports[0] ?? null;
}

export function generateExecutiveReport(period?: string): ExecutiveReport {
  const success = getSuccessDashboardData();
  const ai = getAiUsageSummary();
  const now = new Date();
  const reportPeriod = period ?? `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;

  const report: ExecutiveReport = {
    id: `exec-${Date.now()}`,
    period: reportPeriod,
    title: `Resumen Design Partners — ${reportPeriod}`,
    summary:
      `Programa Design Partners con ${success.retention.returningUsers} usuarios recurrentes, ` +
      `NPS ${success.nps.score}, activación ${success.activation.rate}% y ` +
      `${getFeedbackInboxCount()} entradas en el inbox de feedback.`,
    highlights: [
      `${getPendingInviteCount()} invitaciones pendientes`,
      `${getIssueCount()} issues reportados`,
      `${ai.requestCount} solicitudes AI (${ai.totalCostUsd.toFixed(2)} USD estimados)`,
      `Retención ${success.retention.rate}% en cohorte de ${success.retention.cohortSize}`,
      `Activación ${success.activation.rate}% (${success.activation.completed}/${success.activation.started})`,
    ],
    metrics: {
      activePartners: success.retention.returningUsers,
      nps: success.nps.score,
      retentionRate: success.retention.rate,
      activationRate: success.activation.rate,
      feedbackCount: getFeedbackInboxCount(),
      issueCount: getIssueCount(),
      aiRequests: ai.requestCount,
      aiCostUsd: ai.totalCostUsd,
    },
    generatedAt: now.toISOString(),
  };

  write([report, ...read()].slice(0, 20));
  trackDesignPartnerEvent({ event: "dp_executive_report_view", label: report.id });
  return report;
}

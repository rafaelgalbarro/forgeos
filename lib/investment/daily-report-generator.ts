/**
 * Daily investment report generator — HTML + PDF + immutable shared history.
 * ANALYSIS_ONLY. Cron entry: `npx --yes tsx scripts/generate-daily-investment-report.ts`
 *
 * JSON index: `.forgeos/investment/reports/` (shared reports-store)
 * PDF/HTML:   `.forgeos/reports/investment/daily/YYYY-MM-DDTHHMMSS-vN.*`
 */

import "server-only";

import { randomBytes } from "node:crypto";
import { sendDailyReportEmail } from "@/lib/investment/daily-report-email";
import { renderDailyReportHtml } from "@/lib/investment/daily-report-html";
import { renderDailyReportPdf } from "@/lib/investment/daily-report-pdf";
import { gatherDailyReportBundle } from "@/lib/investment/daily-report-snapshot";
import type { DailyReportGatherBundle } from "@/lib/investment/daily-report-types";
import {
  makeReportTimestampStamp,
  writeDailyArtifactFile,
} from "@/lib/investment/reports-persistence";
import { reportTitle } from "@/lib/investment/reports-export";
import {
  appendReport,
  countVersionsForPeriod,
} from "@/lib/investment/reports-store";
import type { InvestmentPeriodReport } from "@/lib/investment/reports-types";
import { REPORT_PERIOD_LABELS } from "@/lib/investment/reports-types";

export type GenerateDailyReportResult = {
  readonly report: InvestmentPeriodReport;
  readonly bundle: DailyReportGatherBundle;
  readonly pdfPath: string;
  readonly htmlPath: string;
  readonly jsonPath: string;
};

function toMarkdown(bundle: DailyReportGatherBundle): string {
  const lines: string[] = [
    `# ${REPORT_PERIOD_LABELS.daily} — ${bundle.periodKey}`,
    "",
    `_Generated ${bundle.generatedAt} · ANALYSIS_ONLY_`,
    "",
    "## Resumen",
    ...bundle.aiExecutiveConclusions.map((c) => `- ${c}`),
    "",
  ];
  for (const sec of bundle.sections) {
    lines.push(`## ${sec.title} (${sec.state})`);
    for (const l of sec.lines) lines.push(`- ${l}`);
    lines.push("");
  }
  lines.push(`_Note: ${bundle.note}_`);
  return lines.join("\n");
}

/**
 * Generate, persist (append-only), and stub-email a daily PDF+HTML report.
 */
export async function generateDailyInvestmentReport(options?: {
  readonly now?: Date;
  readonly cwd?: string;
  readonly refreshDashboard?: boolean;
}): Promise<GenerateDailyReportResult> {
  const cwd = options?.cwd ?? process.cwd();
  const now = options?.now ?? new Date();
  const bundle = await gatherDailyReportBundle({
    now,
    refreshDashboard: options?.refreshDashboard,
  });

  const version = countVersionsForPeriod("daily", bundle.periodKey, { cwd }) + 1;
  const stamp = makeReportTimestampStamp(now);
  const fileStamp = `${stamp}-v${version}`;
  const salt = randomBytes(3).toString("hex");
  const id = `daily_pdf_${bundle.periodKey.replace(/[^a-zA-Z0-9-]/g, "_")}_${stamp.replace(/[-T]/g, "")}_v${version}_${salt}`;

  const html = renderDailyReportHtml(bundle);
  const pdf = renderDailyReportPdf(bundle);

  const htmlPath = writeDailyArtifactFile(`${fileStamp}.html`, html, cwd);
  const pdfPath = writeDailyArtifactFile(`${fileStamp}.pdf`, pdf, cwd);

  const email = await sendDailyReportEmail({
    reportId: id,
    periodKey: bundle.periodKey,
    generatedAt: bundle.generatedAt,
    pdfPath,
    htmlPath,
  });

  const report: InvestmentPeriodReport = {
    id,
    generatedAt: bundle.generatedAt,
    periodType: "daily",
    periodKey: bundle.periodKey,
    title: reportTitle("daily", bundle.periodKey, version),
    version,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    sourceSnapshots: bundle.sourceSnapshots,
    summaryMetrics: bundle.summaryMetrics,
    sections: bundle.sections.map((s) => ({
      id: s.id,
      title: s.title,
      state: s.state,
      lines: s.lines,
      metrics: s.metrics,
    })),
    comparative: bundle.comparative,
    paperEquityCurve: bundle.paperEquityCurve,
    shadowEquityCurve: bundle.shadowEquityCurve,
    markdownBody: toMarkdown(bundle),
    note: `${bundle.note} · pdf=${pdfPath}`,
    artifacts: {
      jsonPath: `.forgeos/investment/reports/${id.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`,
      htmlPath,
      pdfPath,
    },
    email,
  };

  const saved = appendReport(report, { cwd });
  return {
    report: saved,
    bundle,
    pdfPath,
    htmlPath,
    jsonPath: saved.artifacts?.jsonPath ?? report.artifacts!.jsonPath,
  };
}

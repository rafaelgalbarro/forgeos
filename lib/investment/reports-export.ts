import type {
  InvestmentPeriodReport,
  ReportListItem,
  ReportPeriodType,
} from "@/lib/investment/reports-types";
import { REPORT_PERIOD_LABELS } from "@/lib/investment/reports-types";

/** ISO week key: YYYY-Www */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function periodKeyFor(type: ReportPeriodType, at = new Date()): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  const day = String(at.getUTCDate()).padStart(2, "0");
  switch (type) {
    case "daily":
      return `${y}-${m}-${day}`;
    case "weekly":
      return isoWeekKey(at);
    case "monthly":
      return `${y}-${m}`;
    case "annual":
      return String(y);
    default:
      return `${y}-${m}-${day}`;
  }
}

export function reportTitle(type: ReportPeriodType, periodKey: string, version: number): string {
  return `${REPORT_PERIOD_LABELS[type]} · ${periodKey} · v${version}`;
}

export function toReportListItem(report: InvestmentPeriodReport): ReportListItem {
  return {
    id: report.id,
    generatedAt: report.generatedAt,
    periodType: report.periodType,
    periodKey: report.periodKey,
    title: report.title,
    version: report.version,
    paperPnl: report.comparative.paperPnl,
    shadowPnl: report.comparative.shadowPnl,
    note: report.note,
  };
}

export function filterReportItems(
  items: readonly ReportListItem[],
  filters: {
    periodType?: string;
    periodKey?: string;
    q?: string;
    from?: string;
    to?: string;
    limit?: number;
  },
): ReportListItem[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const type = filters.periodType && filters.periodType !== "ALL" ? filters.periodType : null;
  const key = filters.periodKey?.trim() || null;
  const from = filters.from ? Date.parse(filters.from) : NaN;
  const to = filters.to ? Date.parse(filters.to) : NaN;

  let out = items.filter((item) => {
    if (type && item.periodType !== type) return false;
    if (key && item.periodKey !== key) return false;
    const ts = Date.parse(item.generatedAt);
    if (Number.isFinite(from) && Number.isFinite(ts) && ts < from) return false;
    if (Number.isFinite(to) && Number.isFinite(ts) && ts > to) return false;
    if (q) {
      const hay = `${item.title} ${item.periodKey} ${item.note} ${item.paperPnl} ${item.shadowPnl} ${item.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  out = out.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 200;
  return out.slice(0, limit);
}

/** Build markdown document from a persisted report (client-safe). */
export function reportToMarkdown(report: InvestmentPeriodReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Period:** ${report.periodType} / ${report.periodKey}`,
    `**Version:** ${report.version} (immutable)`,
    `**Mode:** ${report.mode}`,
    `**Orders:** ${report.orderExecution}`,
    `**Sources:** ${report.sourceSnapshots.join(", ") || "none"}`,
    "",
    "---",
    "",
    "## Summary metrics",
    "",
  ];

  for (const m of report.summaryMetrics) {
    lines.push(`- **${m.label}:** ${m.value}`);
  }

  lines.push("", "## Comparative (Paper vs Shadow)", "");
  lines.push(`- Paper P&L: ${report.comparative.paperPnl}`);
  lines.push(`- Shadow P&L: ${report.comparative.shadowPnl}`);
  lines.push(`- Matched: ${report.comparative.matchedCount}`);
  lines.push(`- Compare rows: ${report.comparative.compareRows}`);
  lines.push(`- Note: ${report.comparative.note}`);

  for (const section of report.sections) {
    lines.push("", `## ${section.title}`, "");
    lines.push(`_State: ${section.state}_`, "");
    for (const line of section.lines) {
      lines.push(`- ${line}`);
    }
    if (section.metrics?.length) {
      lines.push("", "| Metric | Value |", "| --- | --- |");
      for (const m of section.metrics) {
        lines.push(`| ${m.label} | ${m.value} |`);
      }
    }
  }

  if (report.paperEquityCurve.length) {
    lines.push("", "## Paper equity curve (sample)", "");
    lines.push("| Index | Equity |", "| --- | --- |");
    for (const p of report.paperEquityCurve.slice(-20)) {
      lines.push(`| ${p.index} | ${p.equity.toFixed(4)} |`);
    }
  }

  if (report.shadowEquityCurve.length) {
    lines.push("", "## Shadow equity curve (sample)", "");
    lines.push("| Index | Equity |", "| --- | --- |");
    for (const p of report.shadowEquityCurve.slice(-20)) {
      lines.push(`| ${p.index} | ${p.equity.toFixed(4)} |`);
    }
  }

  lines.push("", "---", "", report.note, "", "_ANALYSIS_ONLY — this report never triggers orders._", "");
  return lines.join("\n");
}

/** CSV suitable for Excel — no extra deps. */
export function reportToCsv(report: InvestmentPeriodReport): string {
  const rows: string[][] = [
    ["field", "value"],
    ["id", report.id],
    ["title", report.title],
    ["generatedAt", report.generatedAt],
    ["periodType", report.periodType],
    ["periodKey", report.periodKey],
    ["version", String(report.version)],
    ["mode", report.mode],
    ["paperPnl", report.comparative.paperPnl],
    ["shadowPnl", report.comparative.shadowPnl],
    ["matchedCount", String(report.comparative.matchedCount)],
  ];
  for (const m of report.summaryMetrics) {
    rows.push([`metric:${m.label}`, m.value]);
  }
  for (const s of report.sections) {
    rows.push([`section:${s.id}:state`, s.state]);
    s.lines.forEach((line, i) => rows.push([`section:${s.id}:line${i + 1}`, line]));
  }
  return rows
    .map((cols) =>
      cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

/**
 * Print-ready structured document for PDF workflows (browser Print → PDF).
 * No PDF library in package.json — this is intentional lightweight export.
 */
export function reportToPrintableHtml(report: InvestmentPeriodReport): string {
  const md = reportToMarkdown(report)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${report.title.replace(/</g, "")}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 720px; margin: 2rem auto; color: #111; line-height: 1.45; }
  pre { white-space: pre-wrap; font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
  h1 { font-size: 1.4rem; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${report.title.replace(/</g, "")}</h1>
<p><em>ANALYSIS_ONLY · Print this page to PDF. No order execution.</em></p>
<pre>${md}</pre>
<script>window.addEventListener("load",()=>{/* ready for print */});</script>
</body>
</html>`;
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadReportMarkdown(report: InvestmentPeriodReport): void {
  downloadTextFile(
    reportToMarkdown(report),
    `${report.id}.md`,
    "text/markdown;charset=utf-8",
  );
}

export function downloadReportExcelCsv(report: InvestmentPeriodReport): void {
  downloadTextFile(reportToCsv(report), `${report.id}.csv`, "text/csv;charset=utf-8");
}

/** Opens printable HTML in a new tab for Save as PDF / Print. */
export function downloadReportPdfHtml(report: InvestmentPeriodReport): void {
  downloadTextFile(
    reportToPrintableHtml(report),
    `${report.id}-print.html`,
    "text/html;charset=utf-8",
  );
}

import "server-only";

import { randomBytes } from "node:crypto";
import { getAuditTimeline } from "@/lib/investment/audit-timeline";
import { getCommitteeReplaySnapshot } from "@/lib/investment/committee-replay";
import { getPaperShadowComparison } from "@/lib/investment/paper-shadow-comparison";
import { getPerformanceSnapshot } from "@/lib/investment/performance-snapshot";
import {
  periodKeyFor,
  reportTitle,
  reportToMarkdown,
} from "@/lib/investment/reports-export";
import {
  appendReport,
  countVersionsForPeriod,
  latestForPeriod,
  listReportItems,
  loadReport,
} from "@/lib/investment/reports-store";
import type {
  InvestmentPeriodReport,
  ReportListFilters,
  ReportMetricRow,
  ReportPeriodType,
  ReportSection,
  ReportsCenterSnapshot,
} from "@/lib/investment/reports-types";
import { REPORT_PERIOD_TYPES } from "@/lib/investment/reports-types";
import { getRiskAlertsSnapshot } from "@/lib/investment/risk-alerts-snapshot";

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "NO_DATA";
  return n.toFixed(digits);
}

function newReportId(periodType: ReportPeriodType, periodKey: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const salt = randomBytes(4).toString("hex");
  return `rpt_${periodType}_${periodKey.replace(/[^a-zA-Z0-9-]/g, "_")}_${stamp}_${salt}`;
}

function metric(label: string, value: string): ReportMetricRow {
  return { label, value };
}

/**
 * Build a period report from existing investment snapshots only.
 * Never invents analytics engines; never places orders.
 */
export async function generatePeriodReport(args: {
  readonly periodType: ReportPeriodType;
  readonly periodKey?: string;
  readonly at?: Date;
  readonly cwd?: string;
}): Promise<InvestmentPeriodReport> {
  const at = args.at ?? new Date();
  const periodKey = args.periodKey ?? periodKeyFor(args.periodType, at);
  const cwd = args.cwd;

  const [perf, compare, audit, risk, committee] = await Promise.all([
    getPerformanceSnapshot(),
    getPaperShadowComparison(),
    getAuditTimeline({ limit: 40 }),
    getRiskAlertsSnapshot(),
    getCommitteeReplaySnapshot({ limit: 20 }),
  ]);

  const version = countVersionsForPeriod(args.periodType, periodKey, { cwd }) + 1;
  const generatedAt = new Date().toISOString();

  const summaryMetrics: ReportMetricRow[] = [
    metric("Paper P&L", fmtNum(perf.paper.totalPnl)),
    metric("Paper win rate", perf.paper.winRate == null ? "NO_DATA" : `${(perf.paper.winRate * 100).toFixed(1)}%`),
    metric("Paper Sharpe", fmtNum(perf.paper.sharpe, 3)),
    metric("Paper max DD %", fmtNum(perf.paper.maxDrawdownPct)),
    metric("Shadow P&L", fmtNum(perf.shadow.hypotheticalPnl)),
    metric("Benchmark", perf.benchmark.label),
    metric("Risk alerts", String(risk.alerts.length)),
    metric("Audit events", String(audit.count)),
    metric("Committee entries", String(committee.count)),
  ];

  const sections: ReportSection[] = [
    {
      id: "performance",
      title: "Performance",
      state: perf.paper.equityCurve.length > 1 || perf.shadow.equityCurve.length > 1 ? "READY" : "NO_DATA",
      lines: [
        perf.paper.note,
        `Paper trades: ${perf.paper.tradeCount}`,
        perf.shadow.note,
        `Shadow ops: ${perf.shadow.operationCount}`,
        perf.multiBenchmarkNote,
      ],
      metrics: [
        metric("Paper P&L", fmtNum(perf.paper.totalPnl)),
        metric("Shadow P&L", fmtNum(perf.shadow.hypotheticalPnl)),
        metric("Benchmark", `${perf.benchmark.label} · ${perf.benchmark.note}`),
      ],
    },
    {
      id: "compare",
      title: "Paper vs Shadow",
      state: compare.rows.length ? "READY" : "NO_DATA",
      lines: [
        compare.note,
        `Matched signals: ${compare.matchedCount}`,
        `Rows: ${compare.rows.length}`,
        ...compare.rows.slice(0, 8).map(
          (r) =>
            `${r.symbol} · Δpnl=${fmtNum(r.pnlDelta)} · ${r.note}`,
        ),
      ],
    },
    {
      id: "risk",
      title: "Risk alerts",
      state: risk.alerts.length ? "READY" : "NO_DATA",
      lines: [
        risk.note,
        `Monitor: ${risk.monitorLabel} · running=${risk.monitorRunning}`,
        ...risk.alerts.slice(0, 10).map(
          (a) => `[${a.severity}] ${a.code}: ${a.title} — ${a.message}`,
        ),
      ],
    },
    {
      id: "committee",
      title: "Committee / Memory",
      state: committee.entries.length ? "READY" : "NO_DATA",
      lines: [
        committee.note,
        ...committee.entries.slice(0, 8).map(
          (e) =>
            `${e.symbol} · ${e.recommendation ?? "NO_DATA"} · conf=${fmtNum(e.confidence, 2)} · ${e.note}`,
        ),
      ],
    },
    {
      id: "audit",
      title: "Audit timeline",
      state: audit.items.length ? "READY" : "NO_DATA",
      lines: [
        audit.note,
        ...audit.items.slice(0, 12).map(
          (i) => `${i.kind} · ${i.symbol} · ${i.summary}`,
        ),
      ],
    },
    {
      id: "attribution",
      title: "Attribution (top symbols)",
      state: perf.paper.bySymbol.length || perf.shadow.bySymbol.length ? "READY" : "NO_DATA",
      lines: [
        ...perf.paper.bySymbol.slice(0, 6).map(
          (b) => `PAPER ${b.label}: pnl=${b.pnl.toFixed(2)} trades=${b.trades}`,
        ),
        ...perf.shadow.bySymbol.slice(0, 6).map(
          (b) => `SHADOW ${b.label}: pnl=${b.pnl.toFixed(2)} ops=${b.trades}`,
        ),
      ],
    },
  ];

  const draft: Omit<InvestmentPeriodReport, "markdownBody"> & { markdownBody?: string } = {
    id: newReportId(args.periodType, periodKey),
    generatedAt,
    periodType: args.periodType,
    periodKey,
    title: reportTitle(args.periodType, periodKey, version),
    version,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    sourceSnapshots: [
      "performance-snapshot",
      "paper-shadow-comparison",
      "audit-timeline",
      "risk-alerts-snapshot",
      "committee-replay",
    ],
    summaryMetrics,
    sections,
    comparative: {
      paperPnl: fmtNum(compare.paper.totalPnl ?? perf.paper.totalPnl),
      shadowPnl: fmtNum(compare.shadow.hypotheticalPnl ?? perf.shadow.hypotheticalPnl),
      matchedCount: compare.matchedCount,
      compareRows: compare.rows.length,
      note: compare.note,
    },
    paperEquityCurve: perf.paper.equityCurve.map((p) => ({ index: p.index, equity: p.equity })),
    shadowEquityCurve: perf.shadow.equityCurve.map((p) => ({ index: p.index, equity: p.equity })),
    note: `Immutable ${args.periodType} report for ${periodKey}. Built from existing snapshots only. ANALYSIS_ONLY.`,
  };

  const report: InvestmentPeriodReport = {
    ...draft,
    markdownBody: "",
  };
  const withMd: InvestmentPeriodReport = {
    ...report,
    markdownBody: reportToMarkdown(report),
  };

  return appendReport(withMd, { cwd });
}

/**
 * Auto-generate missing period reports for current calendar windows.
 * Skips periods that already have at least one immutable version.
 */
export async function ensureCurrentPeriodReports(options?: {
  readonly cwd?: string;
  readonly at?: Date;
}): Promise<{ readonly created: readonly InvestmentPeriodReport[]; readonly skipped: readonly string[] }> {
  const at = options?.at ?? new Date();
  const cwd = options?.cwd;
  const created: InvestmentPeriodReport[] = [];
  const skipped: string[] = [];

  for (const periodType of REPORT_PERIOD_TYPES) {
    const periodKey = periodKeyFor(periodType, at);
    const existing = latestForPeriod(periodType, periodKey, { cwd });
    if (existing) {
      skipped.push(`${periodType}:${periodKey}`);
      continue;
    }
    created.push(await generatePeriodReport({ periodType, periodKey, at, cwd }));
  }

  return { created, skipped };
}

export async function getReportsCenterSnapshot(args?: {
  readonly filters?: ReportListFilters;
  readonly selectedId?: string;
  readonly compareId?: string;
  readonly autoEnsure?: boolean;
  readonly cwd?: string;
}): Promise<ReportsCenterSnapshot> {
  const cwd = args?.cwd;
  const autoGenerated: string[] = [];

  if (args?.autoEnsure !== false) {
    const ensured = await ensureCurrentPeriodReports({ cwd });
    for (const r of ensured.created) autoGenerated.push(r.id);
  }

  const listed = listReportItems(args?.filters, { cwd });
  const selected = args?.selectedId ? loadReport(args.selectedId, { cwd }) : listed.items[0]
    ? loadReport(listed.items[0].id, { cwd })
    : null;
  const compareWith = args?.compareId ? loadReport(args.compareId, { cwd }) : null;

  const keys = new Set<string>();
  for (const item of listed.items) keys.add(item.periodKey);

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    autoGenerated,
    total: listed.total,
    items: listed.items,
    selected,
    compareWith,
    availablePeriodKeys: [...keys].sort().reverse(),
    note:
      autoGenerated.length > 0
        ? `Auto-generated ${autoGenerated.length} missing period report(s). History is append-only.`
        : "Reports history loaded. Period reports auto-ensure on open when missing.",
  };
}

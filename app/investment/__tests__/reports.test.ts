import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  filterReportItems,
  periodKeyFor,
  reportToCsv,
  reportToMarkdown,
  reportTitle,
} from "@/lib/investment/reports-export";
import { appendReport, listReportItems, loadReport } from "@/lib/investment/reports-store";
import type { InvestmentPeriodReport } from "@/lib/investment/reports-types";

function sampleReport(overrides?: Partial<InvestmentPeriodReport>): InvestmentPeriodReport {
  const base: InvestmentPeriodReport = {
    id: overrides?.id ?? `rpt_test_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    generatedAt: overrides?.generatedAt ?? "2026-08-04T10:00:00.000Z",
    periodType: overrides?.periodType ?? "daily",
    periodKey: overrides?.periodKey ?? "2026-08-04",
    title: overrides?.title ?? reportTitle("daily", "2026-08-04", 1),
    version: overrides?.version ?? 1,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    sourceSnapshots: ["performance-snapshot"],
    summaryMetrics: [{ label: "Paper P&L", value: "1.25" }],
    sections: [
      {
        id: "performance",
        title: "Performance",
        state: "READY",
        lines: ["paper ok"],
      },
    ],
    comparative: {
      paperPnl: "1.25",
      shadowPnl: "0.50",
      matchedCount: 2,
      compareRows: 3,
      note: "compare note",
    },
    paperEquityCurve: [
      { index: 0, equity: 100 },
      { index: 1, equity: 101 },
    ],
    shadowEquityCurve: [],
    markdownBody: "",
    note: "test note",
  };
  return { ...base, ...overrides, markdownBody: overrides?.markdownBody ?? "" };
}

describe("investment reports helpers", () => {
  it("builds period keys for daily/weekly/monthly/annual", () => {
    const at = new Date(Date.UTC(2026, 7, 4)); // Aug 4 2026
    expect(periodKeyFor("daily", at)).toBe("2026-08-04");
    expect(periodKeyFor("monthly", at)).toBe("2026-08");
    expect(periodKeyFor("annual", at)).toBe("2026");
    expect(periodKeyFor("weekly", at)).toMatch(/^2026-W\d{2}$/);
  });

  it("exports markdown and csv from report view model", () => {
    const report = sampleReport();
    const md = reportToMarkdown(report);
    expect(md).toContain("# Informe diario");
    expect(md).toContain("ANALYSIS_ONLY");
    expect(md).toContain("Paper P&L");
    const csv = reportToCsv(report);
    expect(csv).toContain('"id"');
    expect(csv).toContain(report.id);
  });

  it("filters history by type, search, and limit", () => {
    const items = [
      {
        id: "a",
        generatedAt: "2026-08-04T12:00:00.000Z",
        periodType: "daily" as const,
        periodKey: "2026-08-04",
        title: "Informe diario · 2026-08-04 · v1",
        version: 1,
        paperPnl: "1",
        shadowPnl: "2",
        note: "alpha",
      },
      {
        id: "b",
        generatedAt: "2026-08-03T12:00:00.000Z",
        periodType: "weekly" as const,
        periodKey: "2026-W31",
        title: "Informe semanal · 2026-W31 · v1",
        version: 1,
        paperPnl: "3",
        shadowPnl: "4",
        note: "beta",
      },
    ];
    expect(filterReportItems(items, { periodType: "daily" })).toHaveLength(1);
    expect(filterReportItems(items, { q: "semanal" })[0]?.id).toBe("b");
    expect(filterReportItems(items, { limit: 1 })).toHaveLength(1);
  });
});

describe("investment reports append-only store", () => {
  let cwd: string;

  afterEach(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  it("persists reports and refuses overwrite of same id", () => {
    cwd = mkdtempSync(path.join(tmpdir(), "forgeos-reports-"));
    const report = sampleReport({ id: "rpt_immutable_1" });
    appendReport(report, { cwd });
    const loaded = loadReport("rpt_immutable_1", { cwd });
    expect(loaded?.title).toBe(report.title);
    expect(listReportItems({}, { cwd }).total).toBe(1);

    expect(() => appendReport(report, { cwd })).toThrow(/IMMUTABLE_REFUSAL/);
    expect(listReportItems({}, { cwd }).total).toBe(1);

    const v2 = sampleReport({
      id: "rpt_immutable_2",
      version: 2,
      periodKey: "2026-08-04",
      title: reportTitle("daily", "2026-08-04", 2),
    });
    appendReport(v2, { cwd });
    expect(listReportItems({ periodType: "daily" }, { cwd }).items).toHaveLength(2);
  });
});

describe("investment reports API route", () => {
  it("exports GET/POST and stays ANALYSIS_ONLY on GET", async () => {
    const route = await import("@/app/api/investment/reports/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");

    const res = await route.GET(
      new Request("http://localhost/api/investment/reports?autoEnsure=0"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mode).toBe("ANALYSIS_ONLY");
    expect(body.orderExecution).toBe("disabled");
    expect(body.liveTradingEnabled).toBe(false);
    expect(Array.isArray(body.items)).toBe(true);
  }, 60_000);

  it("exports reports page component", async () => {
    const page = await import("@/app/investment/reports/page");
    expect(typeof page.default).toBe("function");
  }, 30_000);
});

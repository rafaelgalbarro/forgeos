import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sendDailyReportEmail } from "@/lib/investment/daily-report-email";
import { renderDailyReportPdf } from "@/lib/investment/daily-report-pdf";
import type { DailyReportGatherBundle } from "@/lib/investment/daily-report-types";
import {
  makeReportTimestampStamp,
  writeDailyArtifactFile,
} from "@/lib/investment/reports-persistence";
import { appendReport, listReportItems } from "@/lib/investment/reports-store";
import type { InvestmentPeriodReport } from "@/lib/investment/reports-types";

function baseReport(id: string, version: number, periodKey: string): InvestmentPeriodReport {
  return {
    id,
    generatedAt: new Date().toISOString(),
    periodType: "daily",
    periodKey,
    title: `Informe diario ${periodKey} (v${version})`,
    version,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    sourceSnapshots: ["test"],
    summaryMetrics: [{ label: "Paper P&L", value: "NO_DATA" }],
    sections: [
      {
        id: "resumen_ejecutivo",
        title: "Resumen ejecutivo",
        state: "NO_DATA",
        lines: ["NO_DATA"],
      },
    ],
    comparative: {
      paperPnl: "NO_DATA",
      shadowPnl: "NO_DATA",
      matchedCount: 0,
      compareRows: 0,
      note: "test",
    },
    paperEquityCurve: [],
    shadowEquityCurve: [],
    markdownBody: "# test",
    note: "unit test",
    artifacts: {
      jsonPath: `x/${id}.json`,
      htmlPath: null,
      pdfPath: `.forgeos/reports/investment/daily/${periodKey}.pdf`,
    },
  };
}

describe("daily report artifacts + shared store", () => {
  it("appends via shared store and refuses overwrite", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "forgeos-daily-"));
    appendReport(baseReport("daily-pdf-v1", 1, "2026-08-04"), { cwd });
    expect(() =>
      appendReport(baseReport("daily-pdf-v1", 1, "2026-08-04"), { cwd }),
    ).toThrow(/IMMUTABLE_REFUSAL|already exists/);
    appendReport(baseReport("daily-pdf-v2", 2, "2026-08-04"), { cwd });
    expect(listReportItems({ periodType: "daily" }, { cwd }).total).toBe(2);
  });

  it("writes daily artifacts without overwrite", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "forgeos-daily-art-"));
    const stamp = makeReportTimestampStamp(new Date("2026-08-04T12:30:00.000Z"));
    expect(stamp).toBe("2026-08-04T123000");
    const rel = writeDailyArtifactFile(`${stamp}-v1.pdf`, Buffer.from("%PDF-1.4 test"), cwd);
    expect(rel).toContain("daily/");
    expect(existsSync(path.join(cwd, rel))).toBe(true);
    expect(() => writeDailyArtifactFile(`${stamp}-v1.pdf`, Buffer.from("x"), cwd)).toThrow(
      /immutable history/,
    );
  });
});

describe("daily report email stub", () => {
  it("does not send when flag is false", async () => {
    const status = await sendDailyReportEmail(
      {
        reportId: "x",
        periodKey: "2026-08-04",
        generatedAt: new Date().toISOString(),
        pdfPath: null,
        htmlPath: null,
      },
      { INVESTMENT_REPORT_EMAIL_ENABLED: "false" },
    );
    expect(status.sent).toBe(false);
    expect(status.enabled).toBe(false);
    expect(status.attempted).toBe(false);
  });
});

describe("daily report PDF renderer", () => {
  it("produces a PDF header from NO_DATA bundle", () => {
    const bundle: DailyReportGatherBundle = {
      generatedAt: "2026-08-04T12:00:00.000Z",
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      liveTradingEnabled: false,
      periodKey: "2026-08-04",
      sourceSnapshots: [],
      summaryMetrics: [{ label: "Paper P&L", value: "NO_DATA" }],
      sections: [
        {
          id: "resumen_ejecutivo",
          title: "Resumen ejecutivo",
          state: "NO_DATA",
          lines: ["NO_DATA"],
        },
      ],
      paperEquityCurve: [
        { index: 0, equity: 100 },
        { index: 1, equity: 101 },
      ],
      shadowEquityCurve: [],
      comparative: {
        paperPnl: "NO_DATA",
        shadowPnl: "NO_DATA",
        matchedCount: 0,
        compareRows: 0,
        note: "NO_DATA",
      },
      aiExecutiveConclusions: ["NO_DATA"],
      note: "test",
    };
    const pdf = renderDailyReportPdf(bundle);
    expect(pdf.subarray(0, 8).toString("utf8").startsWith("%PDF-1.")).toBe(true);
    expect(pdf.includes(Buffer.from("ForgeOS Investment"))).toBe(true);
  });
});

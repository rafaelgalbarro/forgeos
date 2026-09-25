import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildMorningBriefingId,
  listMorningBriefingHistory,
  persistMorningBriefing,
  renderMorningBriefingPdf,
} from "@/lib/investment/morning-briefing";
import type { MorningBriefingDocument } from "@/lib/investment/morning-briefing.types";

function sampleDoc(id: string): MorningBriefingDocument {
  return {
    id,
    type: "morning-briefing",
    generatedAt: "2026-08-04T08:00:00.000Z",
    briefingDate: "2026-08-04",
    scheduleTimezone: "Europe/Madrid",
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    title: "Morning Briefing — 2026-08-04",
    subtitle: "test",
    sections: [
      {
        id: "alerts",
        title: "Alertas",
        question: "Alertas",
        state: "NO_DATA",
        lines: [{ text: "NO_DATA — none", state: "NO_DATA" }],
        source: "test",
      },
    ],
    sourcesUsed: [],
    note: "test",
  };
}

describe("morning briefing storage + pdf", () => {
  let cwd: string;

  afterEach(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
  });

  it("renders a PDF with %PDF header", () => {
    const pdf = renderMorningBriefingPdf(sampleDoc("morning-briefing-20260804T080000Z"));
    const header = Buffer.from(pdf.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(100);
  });

  it("appends history and refuses overwrite of same folder", () => {
    cwd = mkdtempSync(path.join(tmpdir(), "forgeos-morning-"));
    const id1 = buildMorningBriefingId(new Date("2026-08-04T08:00:00.000Z"));
    const doc1 = sampleDoc(id1);
    const pdf = renderMorningBriefingPdf(doc1);

    persistMorningBriefing({
      document: doc1,
      pdfBytes: pdf,
      emailStatus: "SKIPPED_NO_SMTP",
      emailTo: "rafaelgalbarro@gmail.com",
      cwd,
    });

    const history1 = listMorningBriefingHistory({ cwd });
    expect(history1).toHaveLength(1);
    expect(history1[0]?.type).toBe("morning-briefing");
    expect(history1[0]?.immutable).toBe(true);

    expect(() =>
      persistMorningBriefing({
        document: doc1,
        pdfBytes: pdf,
        emailStatus: "SKIPPED_NO_SMTP",
        emailTo: "rafaelgalbarro@gmail.com",
        cwd,
      }),
    ).toThrow(/immutable/i);

    const id2 = buildMorningBriefingId(new Date("2026-08-04T08:05:00.000Z"));
    persistMorningBriefing({
      document: sampleDoc(id2),
      pdfBytes: pdf,
      emailStatus: "SKIPPED_DISABLED",
      emailTo: "rafaelgalbarro@gmail.com",
      cwd,
    });

    const history2 = listMorningBriefingHistory({ cwd });
    expect(history2).toHaveLength(2);

    const jsonl = readFileSync(path.join(cwd, ".forgeos", "reports", "history.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/);
    expect(jsonl).toHaveLength(2);
  });
});

describe("morning briefing API", () => {
  it("exports GET/POST for morning-briefing route", async () => {
    const route = await import("@/app/api/investment/reports/morning-briefing/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
  }, 30_000);
});

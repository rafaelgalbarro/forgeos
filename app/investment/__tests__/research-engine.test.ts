import { describe, expect, it } from "vitest";
import { composeResearchScores } from "@/lib/investment/research/scoring";
import {
  appendResearchMemory,
  compareResearchMemory,
  listResearchMemoryEntries,
  readResearchMemoryIndex,
} from "@/lib/investment/research/memory";
import type { EngineRunResult, ResearchScores } from "@/lib/investment/research/types";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

function engine(
  partial: Partial<EngineRunResult> & Pick<EngineRunResult, "engineId" | "status">,
): EngineRunResult {
  return {
    title: partial.engineId,
    summary: partial.summary ?? "test",
    lines: partial.lines ?? [],
    itemCount: partial.itemCount ?? 0,
    providers: partial.providers ?? [],
    evidence: partial.evidence ?? [`ev-${partial.engineId}`],
    signal: partial.signal ?? null,
    generatedAt: partial.generatedAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("research scoring composition", () => {
  it("returns NO_DATA overall when engines have no signals", () => {
    const scores = composeResearchScores("TEST", [
      engine({ engineId: "news", status: "CONFIG_REQUIRED" }),
      engine({ engineId: "macro", status: "NO_DATA" }),
      engine({ engineId: "pattern", status: "STUB" }),
    ]);
    expect(scores.overall.value).toBeNull();
    expect(scores.overall.label).toBe("NO_DATA");
    expect(scores.scores.find((s) => s.kind === "macro")?.label).toBe("NO_DATA");
  });

  it("composes LIVE overall from real engine signals (never DEMO)", () => {
    const scores = composeResearchScores("AAPL", [
      engine({ engineId: "macro", status: "LIVE", signal: 70, itemCount: 3 }),
      engine({ engineId: "company", status: "PARTIAL", signal: 45, itemCount: 1 }),
      engine({ engineId: "technical", status: "LIVE", signal: 60, itemCount: 20 }),
      engine({ engineId: "quant", status: "LIVE", signal: 55, itemCount: 10 }),
      engine({ engineId: "sentiment", status: "LIVE", signal: 65, itemCount: 2 }),
      engine({ engineId: "events", status: "LIVE", signal: 40, itemCount: 2 }),
    ]);
    expect(scores.overall.value).not.toBeNull();
    expect(scores.overall.value).toBeGreaterThan(0);
    expect(scores.overall.label).not.toBe("DEMO");
    expect(scores.scores.find((s) => s.kind === "fundamental")?.value).toBe(45);
    expect(scores.scores.find((s) => s.kind === "risk")?.value).not.toBeNull();
    expect(scores.scores.every((s) => s.label !== "DEMO")).toBe(true);
  });

  it("marks STUB pattern signal as NO_DATA in score map", () => {
    const scores = composeResearchScores("X", [
      engine({ engineId: "technical", status: "STUB", signal: 99 }),
    ]);
    expect(scores.scores.find((s) => s.kind === "technical")?.label).toBe("NO_DATA");
    expect(scores.scores.find((s) => s.kind === "technical")?.value).toBeNull();
  });
});

describe("research memory append-only", () => {
  it("appends versions without mutating prior entries", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "forgeos-research-mem-"));
    try {
      const scores: ResearchScores = composeResearchScores("MSFT", [
        engine({ engineId: "macro", status: "LIVE", signal: 50, itemCount: 1 }),
      ]);
      const engines = [
        engine({ engineId: "macro", status: "LIVE", signal: 50, itemCount: 1 }),
      ];

      const v1 = appendResearchMemory({
        symbol: "MSFT",
        opinion: "Initial opinion",
        scores,
        engines,
        cwd,
      });
      const v2 = appendResearchMemory({
        symbol: "MSFT",
        opinion: "Updated opinion",
        scores: composeResearchScores("MSFT", [
          engine({ engineId: "macro", status: "LIVE", signal: 62, itemCount: 2 }),
        ]),
        engines: [
          engine({ engineId: "macro", status: "LIVE", signal: 62, itemCount: 2 }),
        ],
        cwd,
      });

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
      expect(v1.id).not.toBe(v2.id);

      const index = readResearchMemoryIndex(cwd);
      expect(index.ids).toEqual([v1.id, v2.id]);
      expect(index.mode).toBe("ANALYSIS_ONLY");

      const listed = listResearchMemoryEntries({ symbol: "MSFT", cwd, limit: 10 });
      expect(listed).toHaveLength(2);
      expect(listed[0]?.id).toBe(v2.id);
      expect(listed[1]?.id).toBe(v1.id);
      expect(listed[1]?.opinion).toBe("Initial opinion");

      const cmp = compareResearchMemory(v2, v1);
      expect(cmp.opinionChanged).toBe(true);
      expect(cmp.symbol).toBe("MSFT");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

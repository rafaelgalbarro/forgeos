import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getMlLearningSnapshot,
  labelMlSignalOutcome,
  recordMlSignal,
  trainSignalModel,
} from "@/lib/ml/signal-trainer";

describe("Phase H ML signal trainer", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  function tmpCwd(): string {
    const d = mkdtempSync(path.join(tmpdir(), "forgeos-ml-"));
    dirs.push(d);
    return d;
  }

  it("reports NOT_READY before min labeled samples", () => {
    const cwd = tmpCwd();
    process.env.ML_SIGNAL_TRAINER_ENABLED = "true";
    process.env.ML_MIN_SAMPLES = "50";
    recordMlSignal(
      {
        ticker: "AAPL",
        direction: "BUY",
        confidence: 0.8,
        source: "trading-engine",
        indicators: { rsi: 28, squeezeActive: true },
        sector: "Technology",
        vix: 18,
      },
      cwd,
    );
    labelMlSignalOutcome({ ticker: "AAPL", pnlUSD: 10, pnlPct: 1, kind: "TP" }, cwd);
    const snap = getMlLearningSnapshot(cwd);
    expect(snap.status).toBe("NOT_READY");
    expect(snap.labeledCount).toBe(1);
    const train = trainSignalModel(cwd);
    expect(train.status).toBe("NOT_READY");
    expect(train.trained).toBe(false);
  });

  it("trains after enough labeled samples and writes capped weights", () => {
    const cwd = tmpCwd();
    process.env.ML_SIGNAL_TRAINER_ENABLED = "true";
    process.env.ML_MIN_SAMPLES = "12";
    for (let i = 0; i < 12; i++) {
      const ticker = `T${i}`;
      recordMlSignal(
        {
          ticker,
          direction: "BUY",
          confidence: 0.6 + (i % 5) * 0.05,
          source: "trading-engine",
          indicators: {
            rsi: i % 2 === 0 ? 25 : 55,
            squeezeActive: i % 3 === 0,
            rsiOversold: i % 2 === 0,
          },
          sector: i % 2 === 0 ? "Technology" : "Financials",
          vix: 14 + (i % 10),
          recordedAt: new Date(Date.UTC(2026, 0, 1, i, 0, 0)).toISOString(),
        },
        cwd,
      );
      labelMlSignalOutcome(
        {
          ticker,
          pnlUSD: i % 3 === 0 ? -5 : 8,
          pnlPct: i % 3 === 0 ? -1 : 1.2,
          kind: i % 3 === 0 ? "SL" : "TP",
        },
        cwd,
      );
    }
    const train = trainSignalModel(cwd);
    expect(train.trained).toBe(true);
    expect(train.status).toBe("TRAINED");
    const snap = getMlLearningSnapshot(cwd);
    expect(snap.status).toBe("TRAINED");
    expect(snap.learningCurve.length).toBeGreaterThan(0);
    expect(snap.weightCaps.min).toBe(0.85);
    expect(snap.weightCaps.max).toBe(1.15);
  });
});

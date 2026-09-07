import { describe, expect, it } from "vitest";
import {
  detectBreakouts,
  detectGaps,
  detectMomentum,
  detectReversals,
  detectVolatility,
  detectVolumeChanges,
  detectCorrelations,
  detectGeographicRotation,
  detectMacroNewsEarnings,
  detectRelativeStrengthWeakness,
  detectSectorRotation,
} from "../application/detection-rules";
import type { OpportunityMarketSnapshot, OpportunityScanContext } from "../application/ports";
import type { OpportunityInstrumentMeta } from "../domain";

const INSTRUMENT: OpportunityInstrumentMeta = {
  id: "stk-test",
  symbol: "TEST",
  assetClass: "stocks",
  market: "NASDAQ",
  currency: "USD",
  sector: "Technology",
  region: "US",
};

function barsAscending(): OpportunityMarketSnapshot["bars"] {
  return Array.from({ length: 20 }, (_, index) => {
    const close = 100 + index * 0.5;
    return {
      open: close - 0.1,
      high: close + 0.4,
      low: close - 0.4,
      close,
      volume: 100_000 + index * 1_000,
      timestamp: `2026-07-30T${String(index).padStart(2, "0")}:00:00.000Z`,
    };
  });
}

function snapshot(overrides: Partial<OpportunityMarketSnapshot> = {}): OpportunityMarketSnapshot {
  const series = barsAscending();
  const last = series.at(-1)!.close;
  return {
    instrument: INSTRUMENT,
    last,
    bid: last - 0.01,
    ask: last + 0.01,
    previousClose: last * 0.97,
    averageVolume: 90_000,
    atr: 1.2,
    bars: series,
    capturedAt: "2026-07-30T12:00:00.000Z",
    providerId: "fixture",
    ...overrides,
  };
}

describe("opportunity detection rules", () => {
  it("detects breakouts above prior range with volume", () => {
    const base = barsAscending();
    const capped = base.map((bar, index) =>
      index < base.length - 1 ? { ...bar, high: Math.min(bar.high, 108), close: Math.min(bar.close, 107) } : bar,
    );
    const last = { ...capped.at(-1)!, close: 112, high: 113, volume: 250_000 };
    const signal = detectBreakouts(
      snapshot({
        bars: [...capped.slice(0, -1), last],
        last: 112,
        averageVolume: 100_000,
      }),
    );
    expect(signal).not.toBeNull();
    expect(signal!.detection).toBe("breakout");
    expect(signal!.direction).toBe("long");
    expect(signal!.confidence).toBeGreaterThan(0.4);
  });

  it("detects momentum, reversal, volatility, gaps, and volume changes", () => {
    const momentumBars = Array.from({ length: 12 }, (_, index) => ({
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100 + index,
      volume: 120_000,
      timestamp: `2026-07-30T${String(index).padStart(2, "0")}:00:00.000Z`,
    }));
    expect(detectMomentum(snapshot({ bars: momentumBars, last: 111 }))?.detection).toBe("momentum");

    const reversalBars = [
      { open: 100, high: 101, low: 99, close: 100, volume: 1, timestamp: "t0" },
      { open: 101, high: 105, low: 100, close: 104, volume: 1, timestamp: "t1" },
      { open: 104, high: 108, low: 103, close: 107, volume: 1, timestamp: "t2" },
      { open: 107, high: 108, low: 104, close: 105, volume: 1, timestamp: "t3" },
      { open: 105, high: 106, low: 100, close: 101, volume: 1, timestamp: "t4" },
    ];
    expect(detectReversals(snapshot({ bars: reversalBars, last: 101 }))?.detection).toBe("reversal");

    expect(detectVolatility(snapshot({ atr: 3, last: 100 }))?.detection).toBe("volatility");
    expect(detectGaps(snapshot({ previousClose: 100, last: 103 }))?.detection).toBe("gap");
    expect(
      detectVolumeChanges(
        snapshot({
          averageVolume: 100_000,
          bars: [...barsAscending().slice(0, -1), { ...barsAscending().at(-1)!, volume: 300_000 }],
        }),
      )?.detection,
    ).toBe("volume_change");
  });

  it("detects relative strength/weakness, rotations, correlations, macro/news/earnings", () => {
    const context: OpportunityScanContext = {
      snapshots: [snapshot()],
      relative: [
        {
          instrumentSymbol: "TEST",
          benchmarkSymbol: "SPY",
          instrumentReturn: 0.04,
          benchmarkReturn: 0.01,
          relativeStrength: 0.03,
        },
      ],
      sectors: [{ sector: "Technology", sectorReturn: 0.03, marketReturn: 0.01, rotationScore: 0.02 }],
      geography: [{ region: "US", regionReturn: 0.02, globalReturn: 0.005, rotationScore: 0.02 }],
      correlations: [
        { pairSymbol: "SPY", correlation: 0.92, lookback: "60d" },
        { pairSymbol: "TLT", correlation: 0.05, lookback: "60d" },
      ],
      macroEvents: [
        {
          id: "fomc",
          title: "FOMC",
          severity: 0.8,
          scheduledAt: "2026-07-30T18:00:00.000Z",
        },
      ],
      news: [
        {
          id: "n1",
          headline: "Strong demand",
          sentiment: 0.7,
          publishedAt: "2026-07-30T12:00:00.000Z",
          symbols: ["TEST"],
        },
      ],
      earnings: [{ symbol: "TEST", reportDate: "2026-07-31", surprisePct: 5, expectedMovePct: 4 }],
      marketRegime: "bullish",
      nowIso: "2026-07-30T12:00:00.000Z",
      capabilities: {
        stocks: true,
        etf: true,
        indices: true,
        forex: true,
        futures: true,
        bonds: true,
        commodities: true,
        crypto: false,
      },
    };

    expect(detectRelativeStrengthWeakness(context)[0]?.detection).toBe("relative_strength");
    expect(detectSectorRotation(context)[0]?.detection).toBe("sector_rotation");
    expect(detectGeographicRotation(context)[0]?.detection).toBe("geographic_rotation");
    const corrKinds = detectCorrelations(context).map((item) => item.detection);
    expect(corrKinds).toContain("correlation");
    expect(corrKinds).toContain("decorrelation");
    const eventKinds = detectMacroNewsEarnings(context).map((item) => item.detection);
    expect(eventKinds).toEqual(expect.arrayContaining(["macro_event", "news", "earnings"]));
  });
});

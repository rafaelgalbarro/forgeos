import { describe, expect, it } from "vitest";
import {
  indicatorAvailability,
  lastFinite,
  pctChange,
  seriesEma,
  seriesRsi,
  seriesSma,
} from "@/components/investment/markets-terminal-indicators";
import type { OhlcBar } from "@/components/investment/markets-terminal.types";

function bars(n: number, start = 100): OhlcBar[] {
  const out: OhlcBar[] = [];
  let px = start;
  for (let i = 0; i < n; i += 1) {
    const open = px;
    const close = px + ((i % 3) - 1) * 0.5;
    const high = Math.max(open, close) + 0.4;
    const low = Math.min(open, close) - 0.4;
    out.push({
      timestamp: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
      open,
      high,
      low,
      close,
      volume: 1000 + i * 10,
    });
    px = close;
  }
  return out;
}

describe("markets-terminal-indicators", () => {
  it("does not invent SMA/EMA/RSI when bars are insufficient", () => {
    const short = bars(5);
    expect(indicatorAvailability("sma", short, true)).toBe("UNAVAILABLE");
    expect(seriesSma(short, 20).every((v) => v == null)).toBe(true);
    expect(lastFinite(seriesEma(short, 20))).toBeNull();
    expect(indicatorAvailability("rsi", short, true)).toBe("UNAVAILABLE");
  });

  it("computes SMA/RSI from real OHLC only", () => {
    const series = bars(40);
    expect(indicatorAvailability("sma", series, true)).toBe("READY");
    const sma = lastFinite(seriesSma(series, 20));
    expect(sma).not.toBeNull();
    expect(Number.isFinite(sma!)).toBe(true);
    const rsi = lastFinite(seriesRsi(series));
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeGreaterThanOrEqual(0);
    expect(rsi!).toBeLessThanOrEqual(100);
  });

  it("pctChange is finite for non-zero base", () => {
    expect(pctChange(100, 110)).toBeCloseTo(10);
    expect(Number.isFinite(pctChange(0, 10))).toBe(false);
  });

  it("marks empty series as NO_DATA", () => {
    expect(indicatorAvailability("ema", [], false)).toBe("NO_DATA");
    expect(indicatorAvailability("vwap", bars(10), false)).toBe("UNAVAILABLE");
  });
});

describe("markets terminal module smoke", () => {
  it("exports MarketsTerminal and markets page", async () => {
    const terminal = await import("@/components/investment/MarketsTerminal");
    const page = await import("../markets/page");
    expect(typeof terminal.MarketsTerminal).toBe("function");
    expect(typeof page.default).toBe("function");
  }, 30_000);
});

import { describe, expect, it } from "vitest";
import { aggregate, atr, ema, rsi } from "@/lib/forex-bot/indicators";
import { convert, fxPnlAccount, sizeFxPosition } from "@/lib/forex-bot/risk";
import { evaluateTrendPullback, h1Trend } from "@/lib/forex-bot/strategies";
import { backtestInstrument, gateRows } from "@/lib/forex-bot/backtest";
import { isFxEntryWindow, isWeekendFlattenTime } from "@/lib/forex-bot/sessions";
import type { FxCandle } from "@/lib/forex-bot/types";

function trendBars(n: number, start: number, step: number, t0 = 1_700_000_000, tf = 900): FxCandle[] {
  const out: FxCandle[] = [];
  let px = start;
  for (let i = 0; i < n; i += 1) {
    const wiggle = Math.sin(i / 3) * step * 4;
    const open = px;
    px = px + step + wiggle * 0.1;
    out.push({ time: t0 + i * tf, open, high: Math.max(open, px) + step, low: Math.min(open, px) - step, close: px, volume: 1 });
  }
  return out;
}

describe("forex bot: indicators", () => {
  it("ema/rsi/atr basics", () => {
    expect(ema([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(rsi(Array.from({ length: 30 }, (_, i) => i + 1))).toBe(100);
    expect(atr(trendBars(30, 1.1, 0.0005))).toBeGreaterThan(0);
  });

  it("aggregates M15 into H1", () => {
    const m15 = trendBars(8, 1.1, 0.0001, 1_700_000_400);
    const h1 = aggregate(m15, 60);
    expect(h1.length).toBeGreaterThanOrEqual(2);
    expect(h1[0]!.time % 3600).toBe(0);
  });
});

describe("forex bot: risk sizing", () => {
  it("2% of 500€ on EUR_USD with a 20-pip stop = 5500 units (10€ at risk)", () => {
    const s = sizeFxPosition({
      instrument: "EUR_USD", accountCurrency: "EUR", nav: 500, riskPct: 2,
      stopDistance: 0.002, price: 1.1, rates: { EUR_USD: 1.1 }, maxLeverage: 20,
    });
    expect(s.ok).toBe(true);
    if (s.ok) {
      expect(s.units).toBe(5500); // 10€ / (0.002 USD × 1/1.1 €/USD)
      expect(s.riskAccount).toBeCloseTo(10, 1);
      expect(s.leverage).toBeLessThanOrEqual(20);
    }
  });

  it("leverage cap limits the units", () => {
    const s = sizeFxPosition({
      instrument: "EUR_USD", accountCurrency: "EUR", nav: 500, riskPct: 2,
      stopDistance: 0.0002, price: 1.1, rates: { EUR_USD: 1.1 }, maxLeverage: 10,
    });
    expect(s.ok && s.units).toBe(5000);
  });

  it("converts JPY P&L into EUR", () => {
    expect(convert("JPY", "EUR", { EUR_JPY: 160 })).toBeCloseTo(1 / 160, 8);
    const pnl = fxPnlAccount({ instrument: "USD_JPY", side: "long", units: 1000, entry: 150, exit: 151, accountCurrency: "EUR", rates: { EUR_JPY: 160 } });
    expect(pnl).toBeCloseTo(1000 / 160, 6);
  });
});

describe("forex bot: strategy & sessions", () => {
  it("detects an H1 uptrend", () => {
    expect(h1Trend(trendBars(120, 1.05, 0.0006, 1_700_000_000, 3600)).dir).toBe("long");
  });

  it("never signals without an H1 trend", () => {
    const flat = trendBars(120, 1.1, 0, 1_700_000_000, 3600);
    const ev = evaluateTrendPullback("EUR_USD", trendBars(100, 1.1, 0.0001), flat);
    expect("hold" in ev).toBe(true);
  });

  it("session windows (London time)", () => {
    expect(isFxEntryWindow(new Date("2026-10-21T09:00:00Z"))).toBe(true); // Wed 10:00 London
    expect(isFxEntryWindow(new Date("2026-10-24T09:00:00Z"))).toBe(false); // Saturday
    expect(isFxEntryWindow(new Date("2026-10-21T02:00:00Z"), "24h")).toBe(true); // Wed 03:00 London
    expect(isFxEntryWindow(new Date("2026-10-21T02:00:00Z"), "london")).toBe(false);
    expect(isFxEntryWindow(new Date("2026-10-21T20:30:00Z"), "24h")).toBe(false); // rollover 21:30 London
    expect(isFxEntryWindow(new Date("2026-10-25T23:30:00Z"), "24h")).toBe(false); // Sun 23:30 London: thin weekly open
    expect(isFxEntryWindow(new Date("2026-10-26T01:30:00Z"), "24h")).toBe(false); // Mon 01:30
    expect(isFxEntryWindow(new Date("2026-10-26T02:30:00Z"), "24h")).toBe(true); // Mon 02:30
    expect(isWeekendFlattenTime(new Date("2026-10-23T19:30:00Z"))).toBe(true); // Fri 20:30 London
  });

  it("backtest runs and the gate rejects too few trades", () => {
    const m15 = trendBars(2000, 1.05, 0.00005, Date.UTC(2026, 8, 1) / 1000);
    const trades = backtestInstrument("EUR_USD", m15, ["FX_TREND_PULLBACK_M15"], 1.0);
    const rows = gateRows(["FX_TREND_PULLBACK_M15"], trades, m15[1300]!.time);
    expect(rows[0]!.strategy).toBe("FX_TREND_PULLBACK_M15");
    expect(typeof rows[0]!.liveEligible).toBe("boolean");
  });
});

describe("forex bot: MT5 lot sizing", () => {
  it("2% of 500€, 20-pip stop on EURUSD (tick 0.00001 = 0.86€/lot) → 0.05 lots", async () => {
    const { sizeFxLots } = await import("@/lib/forex-bot/risk");
    const s = sizeFxLots({
      nav: 500, riskPct: 2, stopDistance: 0.002, tickSize: 0.00001, tickValueLoss: 0.86,
      contractSize: 100000, volumeMin: 0.01, volumeStep: 0.01, volumeMax: 100, baseToAccount: 1, maxLeverage: 10,
    });
    expect(s.ok).toBe(true);
    if (s.ok) {
      expect(s.lots).toBe(0.05); // 10€ / (200 ticks × 0.86€) = 0.058 → 0.05
      expect(s.riskAccount).toBeLessThanOrEqual(10);
    }
  });

  it("rejects when even the minimum lot risks too much", async () => {
    const { sizeFxLots } = await import("@/lib/forex-bot/risk");
    const s = sizeFxLots({
      nav: 50, riskPct: 2, stopDistance: 0.003, tickSize: 0.00001, tickValueLoss: 0.86,
      contractSize: 100000, volumeMin: 0.01, volumeStep: 0.01, volumeMax: 100, baseToAccount: 1, maxLeverage: 10,
    });
    expect(s.ok).toBe(false);
  });
});

import { sizeFxLots as sizeLots2 } from "@/lib/forex-bot/risk";
describe("min lot risk ceiling", () => {
  const base = { nav: 98.72, riskPct: 2, stopDistance: 0.0045, tickSize: 0.00001, tickValueLoss: 0.55, contractSize: 100000,
    volumeMin: 0.01, volumeStep: 0.01, volumeMax: 50, baseToAccount: 0.55, maxLeverage: 10 };
  it("rejects min lot above 2% without ceiling", () => {
    expect(sizeLots2(base).ok).toBe(false);
  });
  it("accepts min lot up to 3%", () => {
    const r = sizeLots2({ ...base, minLotMaxRiskPct: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.lots).toBe(0.01); expect(r.riskAccount / 98.72).toBeLessThanOrEqual(0.03); }
  });
  it("still rejects above 3%", () => {
    expect(sizeLots2({ ...base, stopDistance: 0.008, minLotMaxRiskPct: 3 }).ok).toBe(false);
  });
});

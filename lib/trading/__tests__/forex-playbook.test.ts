import { describe, expect, it } from "vitest";
import { localParts, localToEpoch, PLAYBOOK, scanPlaybook } from "@/lib/forex-bot/playbook";
import type { FxCandle } from "@/lib/forex-bot/types";

describe("playbook time helpers", () => {
  it("round-trips local wall time across DST zones", () => {
    for (const tz of ["Europe/London", "America/New_York", "Asia/Tokyo", "Australia/Sydney"]) {
      for (const ymd of ["2026-01-14", "2026-07-15", "2026-10-23"]) {
        const e = localToEpoch(ymd, 16 * 60, tz);
        const p = localParts(e, tz);
        expect(p.ymd).toBe(ymd);
        expect(p.minutes).toBe(16 * 60);
      }
    }
  });
});

describe("playbook scan", () => {
  it("EUR/USD London range breakout trades once per day with a 2R target", () => {
    const spec = PLAYBOOK.find((s) => s.id === "PB_EURUSD_LDN_RANGE")!;
    // 30 days of M15: steady uptrend (H1 trend up), quiet Asian session, breakout at 08:15 London.
    const bars: FxCandle[] = [];
    const t0 = Date.UTC(2026, 0, 5, 0, 0) / 1000; // Monday (London = UTC in January)
    let px = 1.1;
    for (let i = 0; i < 30 * 96; i += 1) {
      const t = t0 + i * 900;
      const lp = localParts(t, "Europe/London");
      const drift = lp.minutes >= 8 * 60 && lp.minutes < 8 * 60 + 30 ? 0.00025 : 0.00002;
      const o = px;
      px += drift;
      bars.push({ time: t, open: o, high: Math.max(o, px) + 0.0001, low: Math.min(o, px) - 0.0001, close: px, volume: 1 });
    }
    const trades = scanPlaybook(spec, bars, 0.00001);
    expect(trades.length).toBeGreaterThan(5);
    const days = new Set(trades.map((t) => t.day));
    expect(days.size).toBe(trades.length); // one trade per day
    for (const t of trades) {
      expect(t.side).toBe("long");
      if (t.r != null) expect(t.r).toBeLessThanOrEqual(2.01);
    }
  });

  it("all 12 specs have consistent windows", () => {
    for (const s of PLAYBOOK) {
      expect(s.entry[0]).toBeLessThan(s.entry[1]);
      if (s.range) expect(s.range[1]).toBeLessThanOrEqual(s.entry[0]);
      expect(s.exit).toBeGreaterThanOrEqual(s.entry[1]);
    }
  });
});

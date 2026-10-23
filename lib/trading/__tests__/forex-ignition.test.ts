import { describe, expect, it } from "vitest";
import { ignitionSignal, simulateIgnition, simulateNewsReaction } from "@/lib/forex-bot/ignition";
import type { FxCandle } from "@/lib/forex-bot/types";

function base(n: number): FxCandle[] {
  return Array.from({ length: n }, (_, i) => ({ time: i * 300, open: 100, high: 100.2, low: 99.8, close: 100 + (i % 2 ? 0.05 : -0.05), volume: 100 }));
}

describe("momentum ignition", () => {
  it("detects a high-volume wide bar closing at its high and trades it", () => {
    const b = base(200);
    b[100] = { time: 100 * 300, open: 100, high: 101.5, low: 99.9, close: 101.45, volume: 600 };
    b[101] = { time: 101 * 300, open: 101.45, high: 103.5, low: 101.4, close: 103.4, volume: 300 };
    const atr = Array(200).fill(0.4);
    expect(ignitionSignal(b, atr, 100)).toBe("long");
    const t = simulateIgnition(b, { abs: 0.01 });
    expect(t.length).toBe(1);
    expect(t[0]!.reason).toBe("TP");
    expect(t[0]!.r).toBeGreaterThan(0.9);
  });
  it("news reaction trades the first bar after a release only when it is wide", () => {
    const b = base(200);
    b[150] = { time: 150 * 300, open: 100, high: 100.1, low: 98.4, close: 98.45, volume: 900 };
    const t = simulateNewsReaction(b, [150 * 300 + 20, 60 * 300], { abs: 0.01 }, 300);
    expect(t.length).toBe(1);
    expect(t[0]!.side).toBe("short");
  });
});

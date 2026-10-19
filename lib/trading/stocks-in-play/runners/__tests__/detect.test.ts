import { describe, expect, it } from "vitest";
import { qualifiesAsRunner } from "@/lib/trading/stocks-in-play/runners/detect";

describe("RUNNERS detect", () => {
  it("flags gain >20%", () => {
    expect(qualifiesAsRunner({ changePct: 110, price: 5, rvol: 1 })).toBe(true);
  });

  it("flags penny $1–3 with RVOL ≥5", () => {
    expect(qualifiesAsRunner({ changePct: 5, price: 2.5, rvol: 5 })).toBe(true);
  });
});

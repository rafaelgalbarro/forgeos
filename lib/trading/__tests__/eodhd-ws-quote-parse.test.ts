import { describe, expect, it } from "vitest";
import { parseEodhdUsQuotePayload } from "@/lib/market-data/eodhd-ws-client";

describe("EODHD /ws/us-quote parse", () => {
  it("parses bid/ask quote row (s, bp, ap, bs, as, t)", () => {
    const raw =
      '{"s":"AAPL","bp":171.12,"ap":171.14,"bs":2,"as":3,"t":1710000000}';
    const parsed = parseEodhdUsQuotePayload(raw);
    expect(parsed.kind).toBe("quote");
    if (parsed.kind !== "quote") return;
    expect(parsed.symbol).toBe("AAPL");
    expect(parsed.bid).toBeCloseTo(171.12, 2);
    expect(parsed.ask).toBeCloseTo(171.14, 2);
    expect(parsed.bidSize).toBe(2);
    expect(parsed.askSize).toBe(3);
    expect(parsed.tsMs).toBe(1710000000 * 1000);
    expect(parsed.mid).toBeCloseTo(171.13, 2);
  });

  it("parses status_code responses", () => {
    const parsed = parseEodhdUsQuotePayload(
      '{"status_code":422,"message":"Symbols limit reached"}',
    );
    expect(parsed).toEqual({
      kind: "status",
      code: 422,
      message: "Symbols limit reached",
    });
  });
});

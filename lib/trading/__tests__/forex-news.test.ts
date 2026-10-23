import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { instrumentCurrencies, newsBlockReason } from "@/lib/forex-bot/news";

describe("news filter", () => {
  const now = Date.parse("2026-10-23T12:30:00Z");
  const ev = [
    { title: "Non-Farm Employment Change", currency: "USD", at: Date.parse("2026-10-23T12:40:00Z"), impact: "High" },
    { title: "ECB Press Conference", currency: "EUR", at: Date.parse("2026-10-23T12:55:00Z"), impact: "High" },
  ];
  it("maps instruments to currencies", () => {
    expect(instrumentCurrencies("AUD_NZD")).toEqual(["AUD", "NZD"]);
    expect(instrumentCurrencies("GOLD")).toEqual(["USD"]);
    expect(instrumentCurrencies("DE30")).toEqual(["EUR"]);
  });
  it("blocks 15 min around high impact and 30 min around central banks", () => {
    expect(newsBlockReason("EUR_USD", ev, 0, now)).toMatch(/USD/);
    expect(newsBlockReason("EUR_GBP", ev, 0, now)).toMatch(/ECB/);
    expect(newsBlockReason("AUD_NZD", ev, 0, now)).toBeNull();
    expect(newsBlockReason("AUD_NZD", null, 0, now)).toMatch(/no disponible/);
  });
});

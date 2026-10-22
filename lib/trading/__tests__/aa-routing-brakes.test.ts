import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStockOrderAccount } from "@/lib/trading/europe-equities";
import { brokerBrakedSymbolsToday } from "@/lib/trading/stocks-execution-gate";

describe("AA: EUR equities → EUR account", () => {
  it("REP (EUR local) ignores a USD account passed by the caller", () => {
    const prev = process.env.IBKR_EUR_STOCKS_ACCOUNT_ID;
    delete process.env.IBKR_EUR_STOCKS_ACCOUNT_ID;
    delete process.env.IBKR_EU_ACCOUNT_ID;
    try {
      expect(
        resolveStockOrderAccount({ requested: "U24225949", crypto: false, euLocal: true }),
      ).toBe("U15513057");
    } finally {
      if (prev !== undefined) process.env.IBKR_EUR_STOCKS_ACCOUNT_ID = prev;
    }
  });

  it("US stocks keep the requested account", () => {
    expect(
      resolveStockOrderAccount({ requested: "U24225949", crypto: false, euLocal: false }),
    ).toBe("U24225949");
  });
});

describe("AA: broker NO_ACK symbol brake visible to the cycle", () => {
  it("returns only symbols blocked for the current UTC day", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-brake-"));
    const file = path.join(dir, "ibkr-broker-no-ack-symbol-day.json");
    fs.writeFileSync(
      file,
      JSON.stringify({ symbols: { REP: "2026-10-22", ORCL: "2026-10-21" } }),
    );
    const set = brokerBrakedSymbolsToday(file, new Date("2026-10-22T10:00:00Z"));
    expect([...set]).toEqual(["REP"]);
  });

  it("missing file → no blocks", () => {
    expect(brokerBrakedSymbolsToday("/nonexistent/x.json").size).toBe(0);
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("futures journal funding on close", () => {
  let tmp: string;
  let prevRoot: string | undefined;

  beforeEach(() => {
    prevRoot = process.env.FORGEOS_ROOT;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-fut-journal-"));
    fs.mkdirSync(path.join(tmp, ".forgeos", "journal"), { recursive: true });
    process.env.FORGEOS_ROOT = tmp;
    vi.resetModules();
  });

  afterEach(() => {
    if (prevRoot === undefined) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("short close uses BUY leg and subtracts funding", async () => {
    const { appendCryptoJournal, closeCryptoJournalOpen, readCryptoJournal } =
      await import("@/lib/trading/crypto/journal-crypto");
    appendCryptoJournal({
      at: new Date(Date.now() - 3600_000).toISOString(),
      strategy: "TREND_PULLBACK_1H",
      pair: "ETHEUR",
      regime: "LATERAL",
      side: "SELL",
      entry: 2000,
      exit: null,
      exitReason: null,
      grossPnlEur: null,
      feesEur: 0,
      netPnlEur: null,
      durationMs: null,
      mfePct: null,
      maePct: null,
      shadow: true,
      open: true,
      venue: "futures",
      positionSide: "short",
      leverage: 1,
      qty: 0.01,
      pfSymbol: "PF_ETHUSD",
    });
    closeCryptoJournalOpen({
      open: readCryptoJournal().find((t) => t.side === "SELL")!,
      exit: 1950,
      exitReason: "TAKE_PROFIT",
      feesEur: 0.05,
      fundingPaidEur: 0.02,
    });
    const closed = readCryptoJournal().find((t) => t.exitReason === "TAKE_PROFIT");
    expect(closed?.side).toBe("BUY");
    expect(closed?.fundingPaidEur).toBe(0.02);
    expect(closed?.netPnlEur).toBeCloseTo(0.5 - 0.05 - 0.02, 4);
  });
});
